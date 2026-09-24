import "server-only";

import { cookies } from "next/headers";
import { env } from "@/shared/config/env";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE,
  SESSION_EXPIRED_FLAG_COOKIE,
  SESSION_EXPIRED_FLAG_MAX_AGE_SECONDS,
} from "@/features/auth/application/session-cookie";
import { ApiError, extractFailureMessage, type ApiResponse } from "./types";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /**
   * If true (default) the call sends the admin Bearer token from the
   * httpOnly cookie. Set to false for the login endpoint.
   */
  authenticated?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
  /** If true, suppresses console.error on failure (still throws). */
  silent?: boolean;
  /**
   * If true, a 401 does NOT clear the local session — for endpoints where 401
   * means "wrong credentials" (e.g. change-password with a bad current
   * password) rather than "your token was revoked".
   */
  preserveSessionOn401?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const base = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return base;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Server-side fetch wrapper. Reads the session token from the httpOnly cookie
 * and injects it as a Bearer token. Unwraps the standard `{success, data}`
 * envelope and throws an `ApiError` on failure.
 */
/**
 * Best-effort logout when the backend rejects our token with 401 — token
 * superseded by a login elsewhere, OR by `ActiveSessionService.revokeAllSessions`
 * on a password reset (same rejection path, `authMiddleware.ts`). Without
 * this, the admin keeps navigating a board that LOOKS logged in
 * (`getCurrentAdmin()` only reads the local cookie, never re-validates
 * against the backend — see `session.ts`) while every single data fetch
 * silently fails underneath. Clearing the session here means the next
 * `requireAdmin()` check — on the very next navigation — cleanly redirects
 * to /login instead of leaving stale, half-broken pages up.
 *
 * `cookies().set()` throws when called outside a Server Action / Route
 * Handler (e.g. from a plain Server Component render, which is most of
 * apiFetch's callers) — caught and ignored: this is a best-effort nicety,
 * never the primary way an expired session gets discovered.
 */
async function clearSupersededSession(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    store.delete(ADMIN_COOKIE);
    store.set(SESSION_EXPIRED_FLAG_COOKIE, "1", {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRED_FLAG_MAX_AGE_SECONDS,
    });
  } catch {
    // Not in a Server Action / Route Handler — nothing we can do here.
  }
}

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const k of ["password", "newPassword", "currentPassword", "token"]) {
    if (k in clone) clone[k] = "***";
  }
  return clone;
}

export async function apiFetch<T>(
  path: string,
  { body, authenticated = true, query, silent = false, preserveSessionOn401 = false, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const method = init.method ?? (body !== undefined ? "POST" : "GET");
  const url = buildUrl(path, query);
  const startedAt = Date.now();

  const bodyPreview =
    body === undefined ? "" : ` body=${JSON.stringify(redactBody(body))}`;
  console.log(
    `[apiFetch] → ${method} ${url} authenticated=${authenticated}${bodyPreview}`,
  );

  // Only retry idempotent verbs on transient errors (network-level or HTTP 5xx).
  // POST/PATCH/PUT could mutate twice if the request reached the server.
  const isIdempotent =
    method === "GET" || method === "HEAD" || method === "OPTIONS";
  const maxAttempts = isIdempotent ? 3 : 1;
  // HTTP status codes that are safe to retry (upstream temporarily unavailable).
  const TRANSIENT_STATUSES = new Set([502, 503, 504]);
  const TRANSIENT_CODES = new Set([
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "UND_ERR_SOCKET",
    "UND_ERR_CONNECT_TIMEOUT",
  ]);

  let response: Response | null = null;
  let lastError: unknown = null;
  let rawText = "";
  let bodyReadError: string | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await fetch(url, {
        ...init,
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: init.cache ?? "no-store",
        signal: init.signal ?? AbortSignal.timeout(15_000),
      });
      lastError = null;

      // Retry on transient HTTP errors (502/503/504) before processing the body.
      if (TRANSIENT_STATUSES.has(response.status) && attempt < maxAttempts) {
        const elapsed = Date.now() - startedAt;
        console.warn(
          `[apiFetch] ⟳ ${method} ${url} attempt ${attempt}/${maxAttempts} — HTTP ${response.status} in ${elapsed}ms, retrying…`,
        );
        await new Promise((r) => setTimeout(r, 300 * attempt));
        response = null;
        continue;
      }

      // Lit le corps DANS la boucle : un 200 dont le corps est coupé net ou
      // vide (connexion réinitialisée en plein transfert sous charge) est une
      // panne transitoire d'un GET idempotent — on retente au lieu de finir
      // sur un « Request failed with status 200 » sans indice.
      rawText = "";
      bodyReadError = null;
      try {
        rawText = await response.text();
      } catch (readError) {
        bodyReadError = readError instanceof Error ? readError.message : String(readError);
      }
      const emptyOkBody =
        response.ok && response.status !== 204 && rawText.trim() === "";
      if ((bodyReadError || emptyOkBody) && attempt < maxAttempts) {
        console.warn(
          `[apiFetch] ⟳ ${method} ${url} attempt ${attempt}/${maxAttempts} — HTTP ${response.status} but body ${
            bodyReadError ? `unreadable (${bodyReadError})` : "empty"
          }, retrying…`,
        );
        await new Promise((r) => setTimeout(r, 300 * attempt));
        response = null;
        continue;
      }

      break;
    } catch (networkError) {
      lastError = networkError;
      const cause = (networkError as { cause?: { code?: string } })?.cause;
      const code = cause?.code ?? "";
      const elapsed = Date.now() - startedAt;
      const detail =
        networkError instanceof Error
          ? networkError.message
          : String(networkError);
      const isTransient = TRANSIENT_CODES.has(code);
      console.warn(
        `[apiFetch] ⟳ ${method} ${url} attempt ${attempt}/${maxAttempts} failed in ${elapsed}ms: ${detail}${code ? ` (cause=${code})` : ""}`,
      );
      if (attempt < maxAttempts && isTransient) {
        // Linear backoff 200ms, 600ms, … keeps total wait bounded.
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
      const causeDetail = cause
        ? ` cause=${code} ${(cause as { message?: string }).message ?? ""}`.trim()
        : "";
      if (!silent) console.error(
        `[apiFetch] ✗ ${method} ${url} — gave up after ${attempt} attempt${attempt > 1 ? "s" : ""} (${Date.now() - startedAt}ms): ${detail}${causeDetail ? ` | ${causeDetail}` : ""}`,
      );
      throw new ApiError(
        `Réseau indisponible: ${detail}${causeDetail ? ` (${causeDetail})` : ""}`,
        0,
      );
    }
  }

  if (!response) {
    // Defensive — shouldn't happen because the loop either sets response or throws.
    throw new ApiError(
      lastError instanceof Error ? lastError.message : "Réseau indisponible",
      0,
    );
  }

  const ms = Date.now() - startedAt;
  let payload: ApiResponse<T> | null = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText) as ApiResponse<T>;
    } catch {
      // body wasn't JSON — keep rawText for the log
    }
  }

  if (!response.ok || !payload || payload.success === false) {
    // A 401 on an authenticated call means our token was rejected —
    // superseded by another login, or by a password reset. Distinct from
    // an unauthenticated call (e.g. login itself) legitimately failing.
    if (response.status === 401 && authenticated && !preserveSessionOn401) {
      await clearSupersededSession();
    }

    // Try the three known failure shapes — message / error:string /
    // error:{message,code}. Falling back to the raw body keeps the
    // toast helpful when the backend invents a new shape rather than
    // showing the useless "Request failed with status XXX".
    const fromPayload =
      payload && payload.success === false
        ? extractFailureMessage(payload)
        : null;
    const fromRaw =
      !payload && rawText ? rawText.slice(0, 300).trim() : null;
    const message =
      fromPayload ||
      fromRaw ||
      `Request failed with status ${response.status}`;
    const errors =
      payload && payload.success === false ? payload.errors : undefined;
    const errorsPart = errors ? ` errors=${JSON.stringify(errors)}` : "";
    const bodyDiag = bodyReadError
      ? ` bodyReadError=${JSON.stringify(bodyReadError)}`
      : !rawText
        ? " emptyBody=true"
        : payload && payload.success === false && !fromPayload
          ? ` payloadKeys=${JSON.stringify(Object.keys(payload))}`
          : "";
    const rawPart =
      !payload && rawText
        ? ` rawBody=${JSON.stringify(rawText.slice(0, 500))}`
        : "";
    if (!silent) console.error(
      `[apiFetch] ✗ ${method} ${url} — ${response.status} ${response.statusText} (${ms}ms): ${message}${errorsPart}${rawPart}${bodyDiag}`,
    );
    throw new ApiError(message, response.status, errors);
  }

  console.log(
    `[apiFetch] ✓ ${method} ${url} — ${response.status} (${ms}ms)`,
  );
  // Standard envelope: { success: true, data: T }
  // Some endpoints return raw T (array or object) without the envelope.
  // In that case payload.data is undefined — return the payload directly.
  if (payload.success === true) {
    return payload.data;
  }
  return payload as unknown as T;
}
