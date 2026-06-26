import { ApiError, type ApiFailure, type ApiResponse } from "./types";

interface ClientRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

const PROXY_BASE = "/api/_proxy";

function buildPath(path: string, query?: ClientRequestOptions["query"]) {
  const cleaned = path.startsWith("/") ? path : `/${path}`;
  const base = `${PROXY_BASE}${cleaned}`;
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
 * Client-side fetch wrapper. Routes every request through the Next.js BFF
 * proxy at `/api/_proxy/*` so the session token (httpOnly cookie) is never
 * read or attached by the browser code.
 */
export async function clientFetch<T>(
  path: string,
  { body, query, headers, ...init }: ClientRequestOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildPath(path, query), {
    ...init,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // ignore
  }

  // Explicit backend failure: { success: false, ... }
  if (payload !== null && payload.success === false) {
    const failure: ApiFailure = payload;
    const message = failure.message ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, failure.errors);
  }

  // HTTP-level failure (no parseable payload or non-2xx without envelope)
  if (!response.ok || !payload) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }

  // Standard envelope: { success: true, data: T }
  // Some endpoints return raw T (object or array) without the envelope.
  if (payload.success === true) {
    return payload.data;
  }
  return payload as unknown as T;
}
