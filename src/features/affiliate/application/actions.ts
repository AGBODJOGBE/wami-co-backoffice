"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AffiliateConfig,
  AffiliateSuspensionMode,
} from "../domain/affiliate";

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Créer un profil affilié ──────────────────────────────────────────────────

export interface CreateAffiliateInput {
  phoneNumber:    string;
  name:           string;
  socialNetwork:  string;
  audienceSize?:  number | null;
  commissionRate?: number | null;
}

export interface CreateAffiliateResult {
  userId:      string;
  affiliateId: string;
  walletId:    string;
  name:        string;
  status:      string;
  message:     string;
}

export async function createAffiliateAction(
  input: CreateAffiliateInput,
): Promise<ActionResult<CreateAffiliateResult>> {
  try {
    const data = await apiFetch<CreateAffiliateResult>(
      API_ROUTES.affiliates.create(),
      { method: "POST", body: input },
    );
    revalidatePath("/affiliate");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Création impossible." };
  }
}

// ─── Suspendre ────────────────────────────────────────────────────────────────

export interface SuspendAffiliateInput {
  mode:    AffiliateSuspensionMode;
  reason?: string | null;
}

export interface SuspendAffiliateResult {
  affiliateId:     string;
  status:          string;
  suspensionMode:  AffiliateSuspensionMode;
  suspensionReason: string | null;
  message:         string;
}

export async function suspendAffiliateAction(
  affiliateId: string,
  input: SuspendAffiliateInput,
): Promise<ActionResult<SuspendAffiliateResult>> {
  try {
    const data = await apiFetch<SuspendAffiliateResult>(
      API_ROUTES.affiliates.suspend(affiliateId),
      { method: "POST", body: input },
    );
    revalidatePath("/affiliate");
    revalidatePath(`/affiliate/${affiliateId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Suspension impossible." };
  }
}

// ─── Réactiver ────────────────────────────────────────────────────────────────

export async function reactivateAffiliateAction(
  affiliateId: string,
): Promise<ActionResult<{ affiliateId: string; status: string }>> {
  try {
    const data = await apiFetch<{ affiliateId: string; status: string }>(
      API_ROUTES.affiliates.reactivate(affiliateId),
      { method: "POST" },
    );
    revalidatePath("/affiliate");
    revalidatePath(`/affiliate/${affiliateId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Réactivation impossible." };
  }
}

// ─── Taux de commission ───────────────────────────────────────────────────────

export async function updateCommissionRateAction(
  affiliateId: string,
  commissionRate: number | null,
): Promise<ActionResult<{ affiliateId: string; commissionRate: number | null }>> {
  try {
    const data = await apiFetch<{ affiliateId: string; commissionRate: number | null }>(
      API_ROUTES.affiliates.updateCommissionRate(affiliateId),
      { method: "PATCH", body: { commissionRate } },
    );
    revalidatePath("/affiliate");
    revalidatePath(`/affiliate/${affiliateId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Mise à jour impossible." };
  }
}

// ─── Réémettre mot de passe provisoire ───────────────────────────────────────

export async function reissuePasswordAction(
  affiliateId: string,
): Promise<ActionResult<{ affiliateId: string; message: string }>> {
  try {
    const data = await apiFetch<{ affiliateId: string; message: string }>(
      API_ROUTES.affiliates.reissuePassword(affiliateId),
      { method: "POST" },
    );
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Renvoi impossible." };
  }
}

// ─── Config globale ───────────────────────────────────────────────────────────

export interface UpdateAffiliateConfigInput {
  defaultCommissionRate?: number;
  minPayoutAmount?:       number;
}

export async function updateAffiliateConfigAction(
  input: UpdateAffiliateConfigInput,
): Promise<ActionResult<AffiliateConfig>> {
  try {
    const data = await apiFetch<AffiliateConfig>(
      API_ROUTES.affiliates.updateConfig(),
      { method: "PATCH", body: input },
    );
    revalidatePath("/affiliate/config");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Mise à jour de la config impossible." };
  }
}

// ─── Geler une commission ─────────────────────────────────────────────────────

export async function holdCommissionAction(
  commissionId: string,
  reason: string,
): Promise<ActionResult<{ commissionId: string; affiliateId: string; holdReason: string }>> {
  try {
    const data = await apiFetch<{ commissionId: string; affiliateId: string; holdReason: string }>(
      API_ROUTES.affiliates.holdCommission(commissionId),
      { method: "POST", body: { reason } },
    );
    revalidatePath("/affiliate");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gel impossible." };
  }
}

// ─── Relâcher un gel ──────────────────────────────────────────────────────────

export async function releaseCommissionAction(
  commissionId: string,
): Promise<ActionResult<{ commissionId: string; affiliateId: string }>> {
  try {
    const data = await apiFetch<{ commissionId: string; affiliateId: string }>(
      API_ROUTES.affiliates.releaseCommission(commissionId),
      { method: "POST" },
    );
    revalidatePath("/affiliate");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Relâchement impossible." };
  }
}

// ─── Annuler une commission ───────────────────────────────────────────────────

export async function cancelCommissionAction(
  commissionId: string,
  reason: string,
): Promise<ActionResult<{ commissionId: string; affiliateId: string; amount: number }>> {
  try {
    const data = await apiFetch<{ commissionId: string; affiliateId: string; amount: number }>(
      API_ROUTES.affiliates.cancelCommission(commissionId),
      { method: "POST", body: { reason } },
    );
    revalidatePath("/affiliate");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Annulation impossible." };
  }
}
