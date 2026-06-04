import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AdminRide,
  AdminRidesQuery,
  AdminRidesResult,
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
 * Single-ride lookup. The swagger doesn't expose GET /api/admin/rides/{id}
 * so we do a list-then-find — same trick we already use elsewhere.
 * Throws when the ride isn't in the list.
 */
export async function getAdminRide(rideId: string): Promise<AdminRide> {
  const { rides } = await listAdminRides();
  const ride = rides.find((r) => r.rideId === rideId);
  if (!ride) {
    throw new Error(
      `Course introuvable : ${rideId}. Elle a peut-être été archivée.`,
    );
  }
  return ride;
}
