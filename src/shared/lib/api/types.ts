export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * The backend uses (at least) three envelopes for errors:
 *   1. `{ success:false, message:"..." }`
 *   2. `{ success:false, error:"Ride not found." }`           (ErrorResponse)
 *   3. `{ success:false, error:{ message:"...", code:"..." }}` (UserErrorResponse)
 *
 * We accept all of them and let `extractFailureMessage()` produce a single
 * human-readable string — otherwise our toast falls back to the useless
 * "Request failed with status XXX".
 */
export interface ApiFailure {
  success: false;
  message?: string;
  error?: string | { message?: string; code?: string };
  errors?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Best-effort: produce a usable message from any of the failure shapes. */
export function extractFailureMessage(payload: ApiFailure): string | null {
  if (payload.message) return payload.message;
  if (typeof payload.error === "string") return payload.error;
  if (payload.error && typeof payload.error === "object") {
    if (payload.error.message) return payload.error.message;
    if (payload.error.code) return payload.error.code;
  }
  return null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
