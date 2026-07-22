"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  DriverBonusVehicleCategory,
  BonusTier,
  ActivityTier,
  QualityTier,
  BonusRunFrequency,
} from "../domain/driver-bonus";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function refresh() {
  revalidatePath("/vtc/driver-bonus");
}

function fail<T = undefined>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) return { ok: false, message: error.message || fallback };
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

// ─── Système C — Paliers / Bienvenue ─────────────────────────────────────────

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
    await apiFetch(API_ROUTES.adminDriverBonus.createConfig(), { method: "POST", body: input });
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
    await apiFetch(API_ROUTES.adminDriverBonus.updateConfig(configId), { method: "PUT", body: input });
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

// ─── Système A — Activité quotidienne ────────────────────────────────────────

export interface CreateActivityConfigInput {
  name: string;
  description?: string | null;
  vehicleCategory: DriverBonusVehicleCategory;
  tiers: ActivityTier[];
}

export async function createActivityConfigAction(
  input: CreateActivityConfigInput,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.createActivityConfig(), { method: "POST", body: input });
    refresh();
    return { ok: true, message: "Barème activité créé." };
  } catch (e) {
    return fail(e, "Impossible de créer le barème activité.");
  }
}

export interface UpdateActivityConfigInput {
  name?: string;
  description?: string | null;
  tiers?: ActivityTier[];
}

export async function updateActivityConfigAction(
  configId: string,
  input: UpdateActivityConfigInput,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.updateActivityConfig(configId), { method: "PUT", body: input });
    refresh();
    return { ok: true, message: "Barème activité mis à jour." };
  } catch (e) {
    return fail(e, "Impossible de mettre à jour le barème activité.");
  }
}

export async function activateActivityConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.activateActivityConfig(configId), { method: "POST" });
    refresh();
    return { ok: true, message: "Barème activité activé." };
  } catch (e) {
    return fail(e, "Impossible d'activer le barème activité.");
  }
}

export async function deactivateActivityConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.deactivateActivityConfig(configId), { method: "POST" });
    refresh();
    return { ok: true, message: "Barème activité désactivé." };
  } catch (e) {
    return fail(e, "Impossible de désactiver le barème activité.");
  }
}

export async function deleteActivityConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.deleteActivityConfig(configId), { method: "DELETE" });
    refresh();
    return { ok: true, message: "Barème activité supprimé." };
  } catch (e) {
    return fail(e, "Impossible de supprimer le barème activité.");
  }
}

// ─── Système B — Qualité mensuelle ───────────────────────────────────────────

export interface CreateQualityConfigInput {
  name: string;
  description?: string | null;
  vehicleCategory: DriverBonusVehicleCategory;
  minRidesPerMonth: number;
  tiers: QualityTier[];
}

export async function createQualityConfigAction(
  input: CreateQualityConfigInput,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.createQualityConfig(), { method: "POST", body: input });
    refresh();
    return { ok: true, message: "Barème qualité créé." };
  } catch (e) {
    return fail(e, "Impossible de créer le barème qualité.");
  }
}

export interface UpdateQualityConfigInput {
  name?: string;
  description?: string | null;
  minRidesPerMonth?: number;
  tiers?: QualityTier[];
}

export async function updateQualityConfigAction(
  configId: string,
  input: UpdateQualityConfigInput,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.updateQualityConfig(configId), { method: "PUT", body: input });
    refresh();
    return { ok: true, message: "Barème qualité mis à jour." };
  } catch (e) {
    return fail(e, "Impossible de mettre à jour le barème qualité.");
  }
}

export async function activateQualityConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.activateQualityConfig(configId), { method: "POST" });
    refresh();
    return { ok: true, message: "Barème qualité activé." };
  } catch (e) {
    return fail(e, "Impossible d'activer le barème qualité.");
  }
}

export async function deactivateQualityConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.deactivateQualityConfig(configId), { method: "POST" });
    refresh();
    return { ok: true, message: "Barème qualité désactivé." };
  } catch (e) {
    return fail(e, "Impossible de désactiver le barème qualité.");
  }
}

export async function deleteQualityConfigAction(configId: string): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.deleteQualityConfig(configId), { method: "DELETE" });
    refresh();
    return { ok: true, message: "Barème qualité supprimé." };
  } catch (e) {
    return fail(e, "Impossible de supprimer le barème qualité.");
  }
}

// ─── RunConfig ────────────────────────────────────────────────────────────────

export interface UpdateRunConfigInput {
  welcomeBonusEnabled?: boolean;
  activityBonusEnabled?: boolean;
  activityJournalCronHour?: number;
  activityPayoutFrequency?: BonusRunFrequency;
  activityPayoutCronHour?: number;
  activityPayoutWeeklyDay?: number;
  activityPayoutMonthlyDay?: number;
  qualityBonusEnabled?: boolean;
  qualityBonusCronDay?: number;
  qualityBonusCronHour?: number;
}

export async function updateRunConfigAction(input: UpdateRunConfigInput): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDriverBonus.updateRunConfig(), { method: "PUT", body: input });
    refresh();
    return { ok: true, message: "Configuration de cadence mise à jour." };
  } catch (e) {
    return fail(e, "Impossible de mettre à jour la cadence.");
  }
}
