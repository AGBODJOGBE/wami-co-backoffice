import { ApiError, type ApiResponse } from "./types";

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

  if (!response.ok || !payload || payload.success === false) {
    const message =
      (payload && payload.success === false && payload.message) ||
      `Request failed with status ${response.status}`;
    const errors =
      payload && payload.success === false ? payload.errors : undefined;
    throw new ApiError(message, response.status, errors);
  }

  return payload.data;
}
