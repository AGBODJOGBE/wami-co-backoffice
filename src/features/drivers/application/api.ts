import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AdminDriver,
  AdminDriverStatus,
  AdminDriversResult,
  DriverCommissionDebtDetail,
  DriverConnectionSession,
  DriverSessionsResult,
  OnlineDriver,
  OnlineDriversResult,
  PendingDriversResult,
} from "../domain/admin-driver";

export function listPendingDrivers(): Promise<PendingDriversResult> {
  return apiFetch<PendingDriversResult>(API_ROUTES.adminDrivers.pending());
}

/** Minimal user shape returned by GET /api/admin/users */
interface DriverUserRow {
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface DriverUserSummary {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Fetches all driver users from GET /api/admin/users.
 * Used as fallback when /api/admin/drivers fails (e.g., expired-doc bug).
 * Returns a map keyed by userId for fast lookup.
 */
export async function listDriverUsers(): Promise<Map<string, DriverUserSummary>> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminUsers.list(), {
      silent: true,
    });

    let users: DriverUserRow[] = [];
    if (Array.isArray(raw)) {
      users = raw as DriverUserRow[];
    } else if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.users)) users = obj.users as DriverUserRow[];
      else if (Array.isArray(obj.items)) users = obj.items as DriverUserRow[];
      else if (Array.isArray(obj.data)) users = obj.data as DriverUserRow[];
    }

    const map = new Map<string, DriverUserSummary>();
    for (const u of users) {
      if (u.role !== "DRIVER" && u.role !== undefined) continue;
      const uid = u.id ?? u.userId ?? "";
      if (!uid) continue;
      map.set(uid, {
        userId: uid,
        firstName: u.firstName ?? "",
        lastName: u.lastName ?? "",
        phoneNumber: u.phoneNumber ?? u.phone ?? "",
        isActive: u.isActive ?? true,
        createdAt: u.createdAt ?? "",
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

/** GET /api/admin/drivers — tolerates array vs {drivers,total} vs {data} */
export async function listAdminDrivers(
  query: { status?: AdminDriverStatus } = {},
): Promise<AdminDriversResult> {
  // silent: true — backend returns 400 when any driver has an expired document;
  // the error is already surfaced in the UI via Promise.allSettled in the page.
  const raw = await apiFetch<unknown>(API_ROUTES.adminDrivers.list(), {
    query: { status: query.status },
    silent: true,
  });
  if (Array.isArray(raw)) {
    return { drivers: raw as AdminDriver[], total: raw.length };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.drivers)) {
      return {
        drivers: obj.drivers as AdminDriver[],
        total: (obj.total as number | undefined) ?? obj.drivers.length,
      };
    }
    if (Array.isArray(obj.data)) {
      return {
        drivers: obj.data as AdminDriver[],
        total: (obj.total as number | undefined) ?? obj.data.length,
      };
    }
  }
  return { drivers: [], total: 0 };
}

/** GET /api/admin/drivers/:driverId/sessions — historique paginé des sessions. */
export async function listDriverSessions(
  driverId: string,
  query: { page?: number; limit?: number; from?: string; to?: string } = {},
): Promise<DriverSessionsResult> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDrivers.sessions(driverId), {
      query,
      silent: true,
    });
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      return {
        sessions: (Array.isArray(obj.sessions) ? obj.sessions : []) as DriverConnectionSession[],
        total: (obj.total as number) ?? 0,
        totalDurationSeconds: (obj.totalDurationSeconds as number) ?? 0,
        page: (obj.page as number) ?? 1,
        limit: (obj.limit as number) ?? 20,
      };
    }
  } catch {
    // graceful — sessions is non-critical
  }
  return { sessions: [], total: 0, totalDurationSeconds: 0, page: 1, limit: 20 };
}

/** GET /api/admin/drivers/:driverId/commission-debts — transactions à l'origine de la dette EARNINGS. */
export async function getDriverCommissionDebtDetail(
  driverId: string,
  query: { page?: number; limit?: number } = {},
): Promise<DriverCommissionDebtDetail | null> {
  try {
    const raw = await apiFetch<unknown>(
      API_ROUTES.adminDrivers.driverCommissionDebts(driverId),
      { query, silent: true },
    );
    if (raw && typeof raw === "object") {
      return raw as DriverCommissionDebtDetail;
    }
  } catch {
    // graceful — dette est une info non-critique
  }
  return null;
}

/** GET /api/admin/drivers/online — same wrapping tolerance as above. */
export async function listOnlineDrivers(): Promise<OnlineDriversResult> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminDrivers.online());
  if (Array.isArray(raw)) {
    return { drivers: raw as OnlineDriver[], total: raw.length };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.drivers)) {
      return {
        drivers: obj.drivers as OnlineDriver[],
        total: (obj.total as number | undefined) ?? obj.drivers.length,
      };
    }
    if (Array.isArray(obj.data)) {
      return {
        drivers: obj.data as OnlineDriver[],
        total: (obj.total as number | undefined) ?? obj.data.length,
      };
    }
  }
  return { drivers: [], total: 0 };
}
