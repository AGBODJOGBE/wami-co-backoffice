"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AffiliateConfig,
  AffiliateCommissionDetail,
  AffiliateCommissionSkipsFilters,
  AffiliateCommissionSkipsResult,
  AffiliateEligibilityResult,
  AffiliateListItem,
  AffiliateSuspensionMode,
} from "../domain/affiliate";

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Détail complet d'une commission (écrêtage, gel, annulation) ─────────────

export async function getAffiliateCommissionDetailAction(
  commissionId: string,
): Promise<ActionResult<AffiliateCommissionDetail>> {
  try {
    const data = await apiFetch<AffiliateCommissionDetail>(
      API_ROUTES.affiliates.commissionDetail(commissionId),
    );
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Détail indisponible." };
  }
}

// ─── Usages écartés — refetch client (ex. bascule "voir les régularisées") ───

export async function fetchCommissionSkipsAction(
  filters?: AffiliateCommissionSkipsFilters,
): Promise<ActionResult<AffiliateCommissionSkipsResult>> {
  try {
    const data = await apiFetch<AffiliateCommissionSkipsResult>(
      API_ROUTES.affiliates.commissionSkips(filters),
    );
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Chargement impossible." };
  }
}

// ─── Liste légère pour sélecteur (ex. rattachement d'un code promo) ──────────

export interface AffiliatePickerItem {
  affiliateId: string;
  name:        string;
  phoneNumber: string;
  status:      string;
}

export async function listAffiliatesForPickerAction(): Promise<ActionResult<AffiliatePickerItem[]>> {
  try {
    const affiliates = await apiFetch<AffiliateListItem[]>(API_ROUTES.affiliates.list());
    return {
      success: true,
      data: affiliates.map((a) => ({
        affiliateId: a.affiliateId,
        name:        a.name,
        phoneNumber: a.phoneNumber,
        status:      a.status,
      })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Liste indisponible." };
  }
}

// ─── Vérifier l'éligibilité (pré-check avant création) ───────────────────────

export async function checkAffiliateEligibilityAction(
  phoneNumber: string,
): Promise<ActionResult<AffiliateEligibilityResult>> {
  try {
    const data = await apiFetch<AffiliateEligibilityResult>(
      API_ROUTES.affiliates.eligibility(phoneNumber),
    );
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Vérification impossible." };
  }
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

// ─── Clôturer le partenariat ──────────────────────────────────────────────────

export interface CloseAffiliateResult {
  affiliateId:      string;
  status:           string;
  closedAt:         string;
  closeReason:      string | null;
  deactivatedCodes: number;
  message:          string;
}

export async function closeAffiliateAction(
  affiliateId: string,
  reason: string,
): Promise<ActionResult<CloseAffiliateResult>> {
  try {
    const data = await apiFetch<CloseAffiliateResult>(
      API_ROUTES.affiliates.close(affiliateId),
      { method: "POST", body: { reason } },
    );
    revalidatePath("/affiliate");
    revalidatePath(`/affiliate/${affiliateId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Clôture impossible." };
  }
}

// ─── Réouvrir le partenariat ──────────────────────────────────────────────────

export interface ReopenAffiliateResult {
  affiliateId:   string;
  status:        string;
  reopenedAt:    string;
  reopenReason:  string | null;
  closedAt:      string | null;
  walletRebound: boolean;
  message:       string;
}

export async function reopenAffiliateAction(
  affiliateId: string,
  reason: string,
): Promise<ActionResult<ReopenAffiliateResult>> {
  try {
    const data = await apiFetch<ReopenAffiliateResult>(
      API_ROUTES.affiliates.reopen(affiliateId),
      { method: "POST", body: { reason } },
    );
    revalidatePath("/affiliate");
    revalidatePath(`/affiliate/${affiliateId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Réouverture impossible." };
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
