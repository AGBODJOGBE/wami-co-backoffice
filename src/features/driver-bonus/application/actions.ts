"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type { DriverBonusVehicleCategory, BonusTier } from "../domain/driver-bonus";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function refresh() {
  revalidatePath("/vtc/driver-bonus");
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) return { ok: false, message: error.message || fallback };
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

export interface CreateDriverBonusConfigInput {
  name: string;
  description?: string | null;
  vehicleCategory: DriverBonusVehicleCategory;
  tiers: BonusTier[];
}

export async function createDriverBonusConfigAction(
  input: CreateDriverBonusConfigInput,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.createConfig(), {
      method: "POST",
      body: input,
    });
    refresh();
    return { ok: true, message: "Barème créé." };
  } catch (e) {
    return fail(e, "Impossible de créer le barème.");
  }
}

export interface UpdateDriverBonusConfigInput {
  name?: string;
  description?: string | null;
  tiers?: BonusTier[];
}

export async function updateDriverBonusConfigAction(
  configId: string,
  input: UpdateDriverBonusConfigInput,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.updateConfig(configId), {
      method: "PUT",
      body: input,
    });
    refresh();
    return { ok: true, message: "Barème mis à jour." };
  } catch (e) {
    return fail(e, "Impossible de mettre à jour le barème.");
  }
}

export async function activateDriverBonusConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.activateConfig(configId), { method: "POST" });
    refresh();
    return { ok: true, message: "Barème activé." };
  } catch (e) {
    return fail(e, "Impossible d'activer le barème.");
  }
}

export async function deactivateDriverBonusConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.deactivateConfig(configId), { method: "POST" });
    refresh();
    return { ok: true, message: "Barème désactivé." };
  } catch (e) {
    return fail(e, "Impossible de désactiver le barème.");
  }
}

export async function deleteDriverBonusConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.deleteConfig(configId), { method: "DELETE" });
    refresh();
    return { ok: true, message: "Barème supprimé." };
  } catch (e) {
    return fail(e, "Impossible de supprimer le barème. Vérifiez qu'il est bien désactivé.");
  }
}
