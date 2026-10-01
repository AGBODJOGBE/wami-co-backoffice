"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type { AppVersionConfig, CreateAdminInput, RegisterAdminResult } from "../domain/admin-user";

export interface UpsertAppConfigInput {
  latestVersion: string;
  minSupportedVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    const fieldErrors = error.errors
      ? Object.entries(error.errors)
          .map(([f, msgs]) => `${f}: ${msgs.join(", ")}`)
          .join(" | ")
      : null;
    return { ok: false, message: fieldErrors || error.message || fallback };
  }
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

export async function createAdminAction(
  input: CreateAdminInput,
): Promise<ActionResult<RegisterAdminResult>> {
  try {
    const data = await apiFetch<RegisterAdminResult>(API_ROUTES.admin.register(), {
      method: "POST",
      body: input,
    });
    revalidatePath("/settings");
    return { ok: true, message: data.message ?? "Administrateur créé.", data };
  } catch (e) {
    return fail(e, "Création impossible.");
  }
}

export async function upsertAppConfigAction(
  appType: string,
  platform: string,
  input: UpsertAppConfigInput,
): Promise<ActionResult<AppVersionConfig>> {
  try {
    const data = await apiFetch<AppVersionConfig>(
      API_ROUTES.appConfig.upsert(appType, platform),
      { method: "PUT", body: input },
    );
    revalidatePath("/settings");
    return { ok: true, message: "Configuration mise à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

export async function updateAdminRoleAction(
  adminId: string,
  roleId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.admin.updateAdminRole(adminId), {
      method: "PATCH",
      body: { roleId },
    });
    revalidatePath("/settings");
    return { ok: true, message: "Rôle mis à jour." };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

export interface ConfigureWelcomeBonusInput {
  bonusAmountFcfa?: number;
  maxEligibleDrivers?: number;
  isActive?: boolean;
}

export async function configureWelcomeBonusCampaignAction(
  input: ConfigureWelcomeBonusInput,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.driverWelcomeBonus.configure(), {
      method: "PATCH",
      body: input,
    });
    revalidatePath("/settings");
    return { ok: true, message: "Campagne mise à jour." };
  } catch (e) {
    return fail(e, "Impossible de mettre à jour la campagne.");
  }
}

export async function deactivateAdminAction(adminId: string): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.admin.deactivateAdmin(adminId), { method: "PATCH" });
    revalidatePath("/settings");
    return { ok: true, message: "Admin désactivé." };
  } catch (e) {
    return fail(e, "Désactivation impossible.");
  }
}

export async function reactivateAdminAction(adminId: string): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.admin.reactivateAdmin(adminId), { method: "PATCH" });
    revalidatePath("/settings");
    return { ok: true, message: "Admin réactivé." };
  } catch (e) {
    return fail(e, "Réactivation impossible.");
  }
}

export interface UpdateWalletConfigInput {
  consolidationEnabled?:      boolean;
  consolidationFeeRate?:      number;
  consolidationMinAmount?:    number;
  p2pTransferEnabled?:        boolean;
  p2pTransferFeeRate?:        number;
  p2pMinimumAmount?:          number;
  withdrawalMinMobileMoney?:  number;
  withdrawalMinBankTransfer?: number;
}

export async function updateWalletConfigAction(
  input: UpdateWalletConfigInput,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminWalletConfig.update(), {
      method: "PATCH",
      body: input,
    });
    revalidatePath("/settings");
    return { ok: true, message: "Configuration wallet mise à jour." };
  } catch (e) {
    return fail(e, "Impossible de mettre à jour la configuration wallet.");
  }
}

export interface UpdateSystemConfigResult {
  id: string;
  key: string;
  value: string;
  type: string;
  version: number;
  updatedAt: string;
  unit?: string;
  displayValue?: string;
  withinBounds: boolean;
  forcedOutOfBounds: boolean;
}

/**
 * `value` est TOUJOURS l'unité humaine (minutes, FCFA, % — jamais la
 * convention de stockage) : le backend convertit lui-même via la spec de la
 * clé. `force`+`justification` permettent de déroger aux bornes déclarées —
 * `justification` est alors obligatoire (le backend refuse sinon).
 */
export async function updateSystemConfigAction(
  key: string,
  value: string,
  opts?: { force?: boolean; justification?: string },
): Promise<ActionResult<UpdateSystemConfigResult>> {
  try {
    const data = await apiFetch<UpdateSystemConfigResult>(API_ROUTES.systemConfig.update(key), {
      method: "PUT",
      body: { value, force: opts?.force, justification: opts?.justification },
    });
    revalidatePath("/settings");
    return {
      ok: true,
      message: data.forcedOutOfBounds
        ? "Configuration mise à jour — valeur acceptée hors bornes (dérogation)."
        : "Configuration mise à jour.",
      data,
    };
  } catch (e) {
    return fail(e, "Impossible de mettre à jour la configuration.");
  }
}
