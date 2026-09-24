"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { listAdminTransactions, type TransactionFilters } from "./api";
import type { AdminTransaction } from "../domain/wallet";
/**
 * Récupère toutes les transactions en paginant jusqu'à épuisement.
 * Utilisé par les exports CSV pour ne pas être limité à la page courante.
 */
export async function exportAllTransactionsAction(
  filters: Omit<TransactionFilters, "page" | "limit"> = {},
): Promise<AdminTransaction[]> {
  const PAGE_SIZE = 500;
  const all: AdminTransaction[] = [];
  let page = 1;

  while (true) {
    const result = await listAdminTransactions({ ...filters, page, limit: PAGE_SIZE });
    all.push(...result.transactions);
    if (all.length >= result.total || result.transactions.length < PAGE_SIZE) break;
    page++;
    if (page > 50) break; // sécurité : max 25 000 transactions
  }

  return all;
}

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type WalletBalanceType = "MAIN" | "BONUS" | "REFERRAL";
export type WalletCreditType = "CREDIT" | "ADMIN_CREDIT" | "BONUS_CREDIT" | "REFERRAL_REWARD" | "REFUND";
export type WalletDebitType = "DEBIT" | "ADMIN_DEBIT" | "ADJUSTMENT";

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

export interface WalletDebitInput {
  amount: number;
  type: WalletDebitType;
  description: string;
}

export interface WalletDebitResult {
  transactionIds: string[];
  remainingBalance: number;
}

/**
 * POST /api/wallets/{walletId}/debit
 * Débite manuellement un wallet. Admin only.
 */
export async function debitWalletAction(
  walletId: string,
  input: WalletDebitInput,
): Promise<ActionResult<WalletDebitResult>> {
  try {
    const data = await apiFetch<WalletDebitResult>(
      API_ROUTES.adminWallets.debit(walletId),
      { method: "POST", body: input },
    );
    revalidatePath("/wallet");
    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors du débit.";
    return { success: false, error: message };
  }
}

// ─── Retraits : approve / reject ─────────────────────────────────────────────

/**
 * PATCH /api/admin/withdrawals/:id/approve
 * Approuve un retrait PENDING. Déclenche le décaissement réel.
 * Permission : wallet.withdrawal.approve
 */
export async function approveWithdrawalAction(
  withdrawalId: string,
): Promise<ActionResult<{ withdrawalId: string; status: string }>> {
  try {
    const data = await apiFetch<{ withdrawalId: string; status: string }>(
      API_ROUTES.adminWallets.approveWithdrawal(withdrawalId),
      { method: "PATCH" },
    );
    revalidatePath("/wallet");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Approbation impossible." };
  }
}

/**
 * PATCH /api/admin/withdrawals/:id/reject
 * Rejette un retrait PENDING et recrédite le wallet de l'influenceur.
 * Permission : wallet.withdrawal.reject
 */
export async function rejectWithdrawalAction(
  withdrawalId: string,
  reason: string,
): Promise<ActionResult<{ withdrawalId: string; status: string; refundedAmount: number }>> {
  try {
    const data = await apiFetch<{ withdrawalId: string; status: string; refundedAmount: number }>(
      API_ROUTES.adminWallets.rejectWithdrawal(withdrawalId),
      { method: "PATCH", body: { reason } },
    );
    revalidatePath("/wallet");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Rejet impossible." };
  }
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
