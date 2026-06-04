import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  VehicleListQuery,
  VehicleListResult,
  VehicleSummary,
} from "../domain/vehicle";

export function listVehicles(
  query: VehicleListQuery = {},
): Promise<VehicleListResult> {
  return apiFetch<VehicleListResult>(API_ROUTES.vehicles.list(), {
    query: {
      status: query.status,
      ownership: query.ownership,
      category: query.category,
      type: query.type,
      isVerified: query.isVerified,
      page: query.page,
      limit: query.limit,
    },
  });
}

/** GET /api/vehicles/admin/driver/{driverId} — tolerates both shapes:
 *   - bare array: VehicleSummary[]
 *   - wrapped:   { vehicles: VehicleSummary[]; total: number }
 *   - wrapped under a different key (some endpoints use `data` directly)
 */
export async function listDriverVehicles(
  driverId: string,
  query: { status?: VehicleListQuery["status"] } = {},
): Promise<VehicleSummary[]> {
  const raw = await apiFetch<unknown>(
    API_ROUTES.vehicles.byDriver(driverId),
    { query: { status: query.status } },
  );
  if (Array.isArray(raw)) return raw as VehicleSummary[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.vehicles)) return obj.vehicles as VehicleSummary[];
    if (Array.isArray(obj.data)) return obj.data as VehicleSummary[];
  }
  console.warn(
    `[vehicles] unexpected shape for driver/${driverId}:`,
    JSON.stringify(raw).slice(0, 200),
  );
  return [];
}

export function getVehicle(id: string): Promise<VehicleSummary> {
  return apiFetch<VehicleSummary>(API_ROUTES.vehicles.detail(id));
}
