"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  RidePricingInput,
  RideVehicleType,
} from "../domain/ride-pricing";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, message: error.message || fallback };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

export async function updateRidePricingAction(
  vehicleType: RideVehicleType,
  input: RidePricingInput,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(
      API_ROUTES.adminPricing.updateRidePricing(vehicleType),
      { method: "PATCH", body: input },
    );
    revalidatePath("/vtc/pricing");
    return {
      ok: true,
      message: `Nouvelle version de la grille ${vehicleType} activée.`,
    };
  } catch (e) {
    return fail(e, "Mise à jour de la grille impossible.");
  }
}
