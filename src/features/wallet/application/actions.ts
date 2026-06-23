"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type WalletBalanceType = "MAIN" | "BONUS" | "REFERRAL";
export type WalletCreditType = "CREDIT" | "ADMIN_CREDIT" | "BONUS" | "REFERRAL_BONUS" | "REFUND";

export interface WalletCreditInput {
  balanceType: WalletBalanceType;
  amount: number;
  type: WalletCreditType;
  description: string;
}

export interface WalletCreditResult {
  transactionId: string;
  newBalance: number;
}

/**
 * POST /api/wallets/{walletId}/credit
 * Crédite manuellement un sous-solde du wallet. Admin only.
 */
export async function creditWalletAction(
  walletId: string,
  input: WalletCreditInput,
): Promise<ActionResult<WalletCreditResult>> {
  try {
    const data = await apiFetch<WalletCreditResult>(
      API_ROUTES.adminWallets.credit(walletId),
      { method: "POST", body: input },
    );
    revalidatePath("/wallet");
    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors du crédit.";
    return { success: false, error: message };
  }
}
