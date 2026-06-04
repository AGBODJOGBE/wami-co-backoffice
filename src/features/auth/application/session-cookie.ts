/**
 * Names of the cookies used for the admin session. Kept in their own module
 * so they can be imported by both server-only files and the API proxy
 * without dragging in `server-only`.
 */
export const SESSION_COOKIE = "fyb_token";
export const ADMIN_COOKIE = "fyb_admin";

/** Default lifetime for the session cookie (matches typical JWT exp). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h
