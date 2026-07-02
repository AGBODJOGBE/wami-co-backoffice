import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  VehicleListQuery,
  VehicleListResult,
  VehicleSummary,
} from "../domain/vehicle";

function parseVehiclePage(raw: unknown): { vehicles: VehicleSummary[]; total: number; totalPages: number } {
  if (Array.isArray(raw)) return { vehicles: raw as VehicleSummary[], total: raw.length, totalPages: 1 };
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.vehicles)) {
      return {
        vehicles: obj.vehicles as VehicleSummary[],
        total: (obj.total as number | undefined) ?? obj.vehicles.length,
        totalPages: (obj.totalPages as number | undefined) ?? 1,
      };
    }
  }
  return { vehicles: [], total: 0, totalPages: 1 };
}

/**
 * GET /api/vehicles/admin/all
 * Le backend plafonne à 20 véhicules par page indépendamment du paramètre limit.
 * On pagine automatiquement pour récupérer tous les véhicules.
 */
export async function listVehicles(
  query: VehicleListQuery = {},
): Promise<VehicleListResult> {
  try {
    const baseQuery = {
      status: query.status,
      ownership: query.ownership,
      category: query.category,
      type: query.type,
      isVerified: query.isVerified,
      limit: 20,
    };

    // Première page
    const firstRaw = await apiFetch<unknown>(API_ROUTES.vehicles.list(), {
      query: { ...baseQuery, page: query.page ?? 1 },
    });
    const first = parseVehiclePage(firstRaw);

    // Si une page spécifique est demandée ou qu'il n'y a qu'une page → retourner
    if (query.page || first.totalPages <= 1) {
      return { vehicles: first.vehicles, total: first.total };
    }

    // Fetcher les pages restantes en parallèle
    const remainingPages = Array.from({ length: first.totalPages - 1 }, (_, i) => i + 2);
    const restResults = await Promise.allSettled(
      remainingPages.map((page) =>
        apiFetch<unknown>(API_ROUTES.vehicles.list(), { query: { ...baseQuery, page }, silent: true }),
      ),
    );

    const allVehicles = [...first.vehicles];
    for (const res of restResults) {
      if (res.status === "fulfilled") {
        allVehicles.push(...parseVehiclePage(res.value).vehicles);
      }
    }

    return { vehicles: allVehicles, total: first.total };
  } catch {
    return { vehicles: [], total: 0 };
  }
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
