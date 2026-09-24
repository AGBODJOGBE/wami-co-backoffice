import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AdminRide,
  AdminRidesQuery,
  AdminRidesResult,
  RideDetail,
} from "../domain/admin-ride";

/** GET /api/admin/rides — tolerates array, {rides,total}, {data} */
export async function listAdminRides(
  query: AdminRidesQuery = {},
): Promise<AdminRidesResult> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminRides.list(), {
    query: {
      status: query.status,
      vehicleType: query.vehicleType,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    },
  });
  if (Array.isArray(raw)) {
    return { rides: raw as AdminRide[], total: raw.length };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.rides)) {
      return {
        rides: obj.rides as AdminRide[],
        total: (obj.total as number | undefined) ?? obj.rides.length,
      };
    }
    if (Array.isArray(obj.data)) {
      return {
        rides: obj.data as AdminRide[],
        total: (obj.total as number | undefined) ?? obj.data.length,
      };
    }
  }
  return { rides: [], total: 0 };
}

/** Convenience: rides where the driver matches `driverId` (in-memory filter
 * because the API doesn't expose a driverId query param yet). */
export async function listRidesByDriver(
  driverId: string,
  limit = 8,
): Promise<AdminRide[]> {
  if (!driverId) return [];
  const { rides } = await listAdminRides();
  return rides
    .filter((r) => r.driver?.driverId === driverId)
    .slice(0, limit);
}

/**
 * Full enriched ride detail — GET /api/admin/rides/:rideId (GetRideUseCase).
 * Returns the flat RideDetail shape with driver, vehicle, GPS, financials, etc.
 */
export async function getAdminRide(rideId: string): Promise<RideDetail> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminRides.detail(rideId));
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.data) return obj.data as RideDetail;
    return raw as RideDetail;
  }
  throw new Error(`Course introuvable : ${rideId}`);
}

/** GET /api/admin/scheduled-rides/manual-assignment — rendu serveur de la page. */
export async function getManualAssignmentQueue(): Promise<
  import("../domain/scheduled-rides").ManualAssignmentQueue
> {
  return apiFetch<import("../domain/scheduled-rides").ManualAssignmentQueue>(
    API_ROUTES.adminScheduledRides.manualAssignmentQueue(),
  );
}
