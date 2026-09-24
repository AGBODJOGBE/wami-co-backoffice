/**
 * Names of the cookies used for the admin session. Kept in their own module
 * so they can be imported by both server-only files and the API proxy
 * without dragging in `server-only`.
 */
export const SESSION_COOKIE = "fyb_token";
export const ADMIN_COOKIE = "fyb_admin";

/** Default lifetime for the session cookie (matches typical JWT exp). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

/**
 * Short-lived marker set by `apiFetch` when the backend rejects a request
 * with 401 (token superseded by another login, or by a password reset —
 * `ActiveSessionService.revokeAllSessions`). The login page reads and
 * clears it to show "votre session a expiré" instead of leaving the admin
 * to silently hit broken pages until they figure out they were logged out.
 */
export const SESSION_EXPIRED_FLAG_COOKIE = "fyb_session_expired";
export const SESSION_EXPIRED_FLAG_MAX_AGE_SECONDS = 30;
