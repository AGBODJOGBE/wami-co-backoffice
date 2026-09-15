"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  WalletGrantCampaignStatus,
  GrantAudience,
  GrantBalanceType,
  GrantTargeting,
} from "../domain/wallet-grant";

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Créer une campagne ───────────────────────────────────────────────────────

export interface CreateGrantCampaignInput {
  audience:             GrantAudience;
  label:                string;
  balanceType:          GrantBalanceType;
  amountPerBeneficiary: number;
  expiresAt?:           string | null;
  targeting:            GrantTargeting;
}

export interface CreateGrantCampaignResult {
  campaignId:       string;
  status:           WalletGrantCampaignStatus;
  beneficiaryCount: number;
  totalAmount:      number;
}

export async function createGrantCampaignAction(
  input: CreateGrantCampaignInput,
): Promise<ActionResult<CreateGrantCampaignResult>> {
  try {
    const data = await apiFetch<CreateGrantCampaignResult>(
      API_ROUTES.adminWalletGrants.create(),
      { method: "POST", body: input },
    );
    revalidatePath("/wallet/grants");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Création impossible." };
  }
}

// ─── Approuver ────────────────────────────────────────────────────────────────

export interface ApproveGrantResult {
  campaignId:    string;
  status:        WalletGrantCampaignStatus;
  creditedCount: number;
  failedCount:   number;
}

export async function approveGrantCampaignAction(
  campaignId: string,
): Promise<ActionResult<ApproveGrantResult>> {
  try {
    const data = await apiFetch<ApproveGrantResult>(
      API_ROUTES.adminWalletGrants.approve(campaignId),
      { method: "POST" },
    );
    revalidatePath("/wallet/grants");
    revalidatePath(`/wallet/grants/${campaignId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Approbation impossible." };
  }
}

// ─── Rejeter ──────────────────────────────────────────────────────────────────

export async function rejectGrantCampaignAction(
  campaignId: string,
  reason: string,
): Promise<ActionResult<{ campaignId: string; status: WalletGrantCampaignStatus }>> {
  try {
    const data = await apiFetch<{ campaignId: string; status: WalletGrantCampaignStatus }>(
      API_ROUTES.adminWalletGrants.reject(campaignId),
      { method: "POST", body: { reason } },
    );
    revalidatePath("/wallet/grants");
    revalidatePath(`/wallet/grants/${campaignId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Rejet impossible." };
  }
}

// ─── Annuler ──────────────────────────────────────────────────────────────────

export async function cancelGrantCampaignAction(
  campaignId: string,
): Promise<ActionResult<{ campaignId: string; status: WalletGrantCampaignStatus }>> {
  try {
    const data = await apiFetch<{ campaignId: string; status: WalletGrantCampaignStatus }>(
      API_ROUTES.adminWalletGrants.cancel(campaignId),
      { method: "POST" },
    );
    revalidatePath("/wallet/grants");
    revalidatePath(`/wallet/grants/${campaignId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Annulation impossible." };
  }
}

// ─── Rejouer les lignes échouées ──────────────────────────────────────────────

export interface RetryGrantResult {
  retriedCount:  number;
  creditedCount: number;
  failedCount:   number;
  status:        WalletGrantCampaignStatus;
}

export async function retryFailedGrantLinesAction(
  campaignId: string,
): Promise<ActionResult<RetryGrantResult>> {
  try {
    const data = await apiFetch<RetryGrantResult>(
      API_ROUTES.adminWalletGrants.retryFailed(campaignId),
      { method: "POST" },
    );
    revalidatePath("/wallet/grants");
    revalidatePath(`/wallet/grants/${campaignId}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Relance impossible." };
  }
}
