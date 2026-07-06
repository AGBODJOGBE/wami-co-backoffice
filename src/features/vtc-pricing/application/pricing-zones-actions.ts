"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type { CreatePricingZoneInput, PatchPricingZoneInput, PricingZone } from "../domain/pricing-zone";

export interface ZoneActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function fail<T>(error: unknown, fallback: string): ZoneActionResult<T> {
  if (error instanceof ApiError) return { ok: false, message: error.message || fallback };
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

export async function createPricingZoneAction(
  input: CreatePricingZoneInput,
): Promise<ZoneActionResult<{ zoneId: string }>> {
  try {
    const data = await apiFetch<{ zoneId: string }>(
      API_ROUTES.adminPricingZones.create(),
      { method: "POST", body: { ...input, code: input.code.toUpperCase() } },
    );
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Zone créée.", data };
  } catch (e) {
    return fail(e, "Création de la zone impossible.");
  }
}

export async function updatePricingZoneAction(
  id: string,
  patch: PatchPricingZoneInput,
): Promise<ZoneActionResult<PricingZone>> {
  try {
    const data = await apiFetch<PricingZone>(
      API_ROUTES.adminPricingZones.update(id),
      { method: "PATCH", body: patch },
    );
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Zone mise à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour de la zone impossible.");
  }
}

export async function deletePricingZoneAction(id: string): Promise<ZoneActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminPricingZones.remove(id), { method: "DELETE" });
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Zone supprimée." };
  } catch (e) {
    return fail(e, "Suppression de la zone impossible.");
  }
}
