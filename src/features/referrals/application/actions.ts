"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type { Referral, ReferralConfig } from "../domain/referral";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function refresh() {
  revalidatePath("/referrals");
  revalidatePath("/referrals/config");
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError)
    return { ok: false, message: error.message || fallback };
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

/** POST /api/admin/referrals/:id/validate — force validation */
export async function validateReferralAction(
  referralId: string,
): Promise<ActionResult<Referral>> {
  try {
    const raw = await apiFetch<unknown>(
      API_ROUTES.adminReferrals.validate(referralId),
      { method: "POST" },
    );
    const data = (raw && typeof raw === "object" && (raw as Record<string,unknown>).data
      ? (raw as Record<string,unknown>).data
      : raw) as Referral;
    refresh();
    return { ok: true, message: "Parrainage validé.", data };
  } catch (e) {
    return fail(e, "Validation impossible.");
  }
}

/** POST /api/admin/referrals/:id/expire — force expiry */
export async function expireReferralAction(
  referralId: string,
): Promise<ActionResult<Referral>> {
  try {
    const raw = await apiFetch<unknown>(
      API_ROUTES.adminReferrals.expire(referralId),
      { method: "POST" },
    );
    const data = (raw && typeof raw === "object" && (raw as Record<string,unknown>).data
      ? (raw as Record<string,unknown>).data
      : raw) as Referral;
    refresh();
    return { ok: true, message: "Parrainage expiré.", data };
  } catch (e) {
    return fail(e, "Expiration impossible.");
  }
}

/** POST /api/admin/referrals/config/:id/activate */
export async function activateReferralConfigAction(
  id: string,
): Promise<ActionResult<ReferralConfig>> {
  try {
    const raw = await apiFetch<unknown>(
      API_ROUTES.adminReferrals.activateConfig(id),
      { method: "POST" },
    );
    const data = (raw && typeof raw === "object" && (raw as Record<string,unknown>).data
      ? (raw as Record<string,unknown>).data
      : raw) as ReferralConfig;
    refresh();
    return { ok: true, message: "Configuration activée.", data };
  } catch (e) {
    return fail(e, "Activation impossible.");
  }
}

/** POST /api/admin/referrals/config/:id/deactivate */
export async function deactivateReferralConfigAction(
  id: string,
): Promise<ActionResult<ReferralConfig>> {
  try {
    const raw = await apiFetch<unknown>(
      API_ROUTES.adminReferrals.deactivateConfig(id),
      { method: "POST" },
    );
    const data = (raw && typeof raw === "object" && (raw as Record<string,unknown>).data
      ? (raw as Record<string,unknown>).data
      : raw) as ReferralConfig;
    refresh();
    return { ok: true, message: "Configuration désactivée.", data };
  } catch (e) {
    return fail(e, "Désactivation impossible.");
  }
}

/** POST /api/admin/referrals/config — créer une config */
export async function createReferralConfigAction(
  body: Record<string, unknown>,
): Promise<ActionResult<ReferralConfig>> {
  try {
    const raw = await apiFetch<unknown>(
      API_ROUTES.adminReferrals.createConfig(),
      { method: "POST", body },
    );
    const data = (raw && typeof raw === "object" && (raw as Record<string,unknown>).data
      ? (raw as Record<string,unknown>).data
      : raw) as ReferralConfig;
    refresh();
    return { ok: true, message: "Configuration créée.", data };
  } catch (e) {
    return fail(e, "Création impossible.");
  }
}

/** PUT /api/admin/referrals/config/:id — modifier une config */
export async function updateReferralConfigAction(
  id: string,
  body: Record<string, unknown>,
): Promise<ActionResult<ReferralConfig>> {
  try {
    const raw = await apiFetch<unknown>(
      API_ROUTES.adminReferrals.updateConfig(id),
      { method: "PUT", body },
    );
    const data = (raw && typeof raw === "object" && (raw as Record<string,unknown>).data
      ? (raw as Record<string,unknown>).data
      : raw) as ReferralConfig;
    refresh();
    return { ok: true, message: "Configuration mise à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

/** DELETE /api/admin/referrals/config/:id */
export async function deleteReferralConfigAction(
  id: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(
      API_ROUTES.adminReferrals.deleteConfig(id),
      { method: "DELETE" },
    );
    refresh();
    return { ok: true, message: "Configuration supprimée." };
  } catch (e) {
    return fail(e, "Suppression impossible.");
  }
}
