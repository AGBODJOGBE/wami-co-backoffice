import "server-only";

import { cookies } from "next/headers";
import { env } from "@/shared/config/env";
import { SESSION_COOKIE } from "@/features/auth/application/session-cookie";
import { ApiError, extractFailureMessage, type ApiResponse } from "./types";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /**
   * If true (default) the call sends the admin Bearer token from the
   * httpOnly cookie. Set to false for the login endpoint.
   */
  authenticated?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
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
  { body, authenticated = true, query, headers, ...init }: RequestOptions = {},
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

  // Only retry idempotent verbs on transient network errors. POST/PATCH/PUT
  // could mutate twice if the request actually reached the server.
  const isIdempotent =
    method === "GET" || method === "HEAD" || method === "OPTIONS";
  const maxAttempts = isIdempotent ? 3 : 1;
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
      break;
    } catch (networkError) {
      lastError = networkError;
      const cause = (networkError as { cause?: { code?: string } })?.cause;
      const code = cause?.code ?? "";
      const ms = Date.now() - startedAt;
      const detail =
        networkError instanceof Error
          ? networkError.message
          : String(networkError);
      const isTransient = TRANSIENT_CODES.has(code);
      console.warn(
        `[apiFetch] ⟳ ${method} ${url} attempt ${attempt}/${maxAttempts} failed in ${ms}ms: ${detail}${code ? ` (cause=${code})` : ""}`,
      );
      if (attempt < maxAttempts && isTransient) {
        // Linear backoff 200ms, 600ms, … keeps total wait bounded.
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
      const causeDetail = cause
        ? ` cause=${code} ${(cause as { message?: string }).message ?? ""}`.trim()
        : "";
      console.error(
        `[apiFetch] ✗ ${method} ${url} — gave up after ${attempt} attempt${attempt > 1 ? "s" : ""} (${ms}ms): ${detail}${causeDetail ? ` | ${causeDetail}` : ""}`,
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
  let rawText = "";
  try {
    rawText = await response.text();
  } catch {
    // ignore
  }

  let payload: ApiResponse<T> | null = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText) as ApiResponse<T>;
    } catch {
      // body wasn't JSON — keep rawText for the log
    }
  }

  if (!response.ok || !payload || payload.success === false) {
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
    const rawPart =
      !payload && rawText
        ? ` rawBody=${JSON.stringify(rawText.slice(0, 500))}`
        : "";
    console.error(
      `[apiFetch] ✗ ${method} ${url} — ${response.status} ${response.statusText} (${ms}ms): ${message}${errorsPart}${rawPart}`,
    );
    throw new ApiError(message, response.status, errors);
  }

  console.log(
    `[apiFetch] ✓ ${method} ${url} — ${response.status} (${ms}ms)`,
  );
  // Standard envelope: { success: true, data: T }
  // Some endpoints return raw T (array or object) without the envelope.
  // In that case payload.data is undefined — return the payload directly.
  const p = payload as Record<string, unknown>;
  if ("success" in p && "data" in p) {
    return payload.data;
  }
  return payload as unknown as T;
}
