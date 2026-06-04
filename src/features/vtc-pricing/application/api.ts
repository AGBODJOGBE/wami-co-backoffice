import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import {
  DEFAULT_RIDE_PRICING,
  type RidePricingInput,
  type RideVehicleType,
} from "../domain/ride-pricing";

/**
 * GET /api/admin/ride-pricing/{vehicleType} — fetch the currently active
 * pricing config for a vehicle type. Tolerates {data:...} envelope.
 */
export async function getActiveRidePricing(
  vehicleType: RideVehicleType,
): Promise<RidePricingInput> {
  const raw = await apiFetch<unknown>(
    API_ROUTES.adminPricing.getRidePricing(vehicleType),
  );
  if (raw && typeof raw === "object") {
    const candidate =
      "data" in (raw as Record<string, unknown>)
        ? (raw as { data: unknown }).data
        : raw;
    if (candidate && typeof candidate === "object") {
      // Merge with defaults so any field the backend omits stays
      // populated and the form doesn't break.
      return {
        ...DEFAULT_RIDE_PRICING,
        ...(candidate as Partial<RidePricingInput>),
      } as RidePricingInput;
    }
  }
  return { ...DEFAULT_RIDE_PRICING };
}
