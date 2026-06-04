import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "@/shared/config/env";
import type { AdminProfile } from "@/features/auth/domain/entity/admin";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "./session-cookie";

const baseCookieOpts = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export async function createSession(token: string, admin: AdminProfile) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, baseCookieOpts);
  store.set(ADMIN_COOKIE, JSON.stringify(admin), baseCookieOpts);
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ADMIN_COOKIE);
}

/**
 * Returns the admin from the session cookie or `null` when not authenticated.
 * Memoized per-request via React `cache` so calling it many times in a render
 * pass costs nothing.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminProfile | null> => {
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  const token = store.get(SESSION_COOKIE)?.value;
  if (!raw || !token) return null;
  try {
    return JSON.parse(raw) as AdminProfile;
  } catch {
    return null;
  }
});

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(SESSION_COOKIE)?.value);
}
