import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AdminDriver,
  AdminDriverStatus,
  AdminDriversResult,
  OnlineDriver,
  OnlineDriversResult,
  PendingDriversResult,
} from "../domain/admin-driver";

export function listPendingDrivers(): Promise<PendingDriversResult> {
  return apiFetch<PendingDriversResult>(API_ROUTES.adminDrivers.pending());
}

/** GET /api/admin/drivers — tolerates array vs {drivers,total} vs {data} */
export async function listAdminDrivers(
  query: { status?: AdminDriverStatus } = {},
): Promise<AdminDriversResult> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminDrivers.list(), {
    query: { status: query.status },
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
