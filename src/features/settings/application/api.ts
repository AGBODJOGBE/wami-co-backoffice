import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { AdminListResult, AdminUserListResult, AppVersionConfig } from "../domain/admin-user";

export async function listAdmins(): Promise<AdminListResult> {
  const raw = await apiFetch<AdminListResult>(API_ROUTES.admin.listAdmins(), {
    query: { limit: 100 },
  });
  return { admins: raw.admins ?? [], total: raw.total ?? 0, page: raw.page ?? 1, limit: raw.limit ?? 100 };
}

/** @deprecated Use listAdmins() — this hits the generic /users endpoint with a fragile filter. */
export async function listAdminUsers(): Promise<AdminUserListResult> {
  const raw = await apiFetch<AdminUserListResult>(API_ROUTES.adminUsers.list(), {
    query: { isAdmin: true, limit: 100 },
  });
  const users = (raw.users ?? []).filter((u) => u.role !== "PASSENGER" && u.role !== "DRIVER");
  return { users, total: users.length };
}

export function listAppConfigs(): Promise<AppVersionConfig[]> {
  return apiFetch<AppVersionConfig[]>(API_ROUTES.appConfig.list());
}

export interface SystemConfigEntry {
  id?: string;
  key: string;
  value: string;
  type: string;
  description?: string;
  updatedBy?: string;
  version?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface WelcomeBonusCampaign {
  bonusAmountFcfa: number;
  maxEligibleDrivers: number;
  consumedCount: number;
  remainingSlots: number;
  isActive: boolean;
  updatedAt: string;
}

/** Lit la config de la campagne bonus de bienvenue driver (singleton). */
export async function getWelcomeBonusCampaign(): Promise<WelcomeBonusCampaign | null> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.driverWelcomeBonus.get(), { silent: true });
    if (!raw || typeof raw !== "object") return null;
    return raw as WelcomeBonusCampaign;
  } catch {
    return null;
  }
}

/** Retourne toutes les clés de configuration système. */
export async function listSystemConfigs(): Promise<SystemConfigEntry[]> {
  try {
    const raw = await apiFetch<SystemConfigEntry[]>(API_ROUTES.systemConfig.list());
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
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
