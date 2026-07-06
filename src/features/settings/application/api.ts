import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { AdminUserListResult, AppVersionConfig } from "../domain/admin-user";

export async function listAdminUsers(): Promise<AdminUserListResult> {
  const raw = await apiFetch<AdminUserListResult>(API_ROUTES.admin.listAdmins(), {
    query: { isAdmin: true, limit: 100 },
  });
  // The backend returns all user types (PASSENGER, DRIVER, USER) when isAdmin=true.
  // Actual admin accounts have role "USER" — filter out drivers and passengers.
  const users = (raw.users ?? []).filter((u) => u.role !== "PASSENGER" && u.role !== "DRIVER");
  return { users, total: users.length };
}

export function listAppConfigs(): Promise<AppVersionConfig[]> {
  return apiFetch<AppVersionConfig[]>(API_ROUTES.appConfig.list());
}

export interface SystemConfigEntry {
  key: string;
  value: string;
  type: string;
  updatedAt?: string;
}

/** Lit une clé de configuration système. Retourne null si la route n'existe pas. */
export async function getSystemConfig(key: string): Promise<SystemConfigEntry | null> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.systemConfig.get(key));
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const entry = (r.data ?? r) as Record<string, unknown>;
    return {
      key: (entry.key ?? key) as string,
      value: (entry.value ?? "") as string,
      type: (entry.type ?? "INTEGER") as string,
      updatedAt: (entry.updatedAt ?? undefined) as string | undefined,
    };
  } catch {
    return null;
  }
}
