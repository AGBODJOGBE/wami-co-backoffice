import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AdminTransaction,
  AdminTransactionsResult,
  AdminWallet,
  AdminWalletsResult,
  WithdrawalsResult,
} from "../domain/wallet";

export function getAdminWallet(walletId: string): Promise<AdminWallet> {
  return apiFetch<AdminWallet>(API_ROUTES.adminWallets.detail(walletId));
}

/** GET /api/admin/wallets — tolerates array, {wallets,total}, {data}.
 *  Supports optional filters: walletType, status, page, limit. */
export async function listAdminWallets(filters?: {
  walletType?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminWalletsResult> {
  let url = API_ROUTES.adminWallets.list();
  if (filters) {
    const params = new URLSearchParams();
    if (filters.walletType) params.set("walletType", filters.walletType);
    if (filters.status) params.set("status", filters.status);
    if (filters.page != null) params.set("page", String(filters.page));
    if (filters.limit != null) params.set("limit", String(filters.limit));
    const qs = params.toString();
    if (qs) url = `${url}?${qs}`;
  }

  const raw = await apiFetch<unknown>(url);
  if (Array.isArray(raw)) {
    return { wallets: raw as AdminWallet[], total: raw.length };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.wallets)) {
      return {
        wallets: obj.wallets as AdminWallet[],
        total: (obj.total as number | undefined) ?? obj.wallets.length,
      };
    }
    if (Array.isArray(obj.data)) {
      return {
        wallets: obj.data as AdminWallet[],
        total: (obj.total as number | undefined) ?? obj.data.length,
      };
    }
  }
  return { wallets: [], total: 0 };
}

/**
 * Find a wallet by profileId (driverId or passengerId).
 * The backend does not expose a profileId query param yet, so we fetch all
 * wallets and filter in memory. When the backend adds the param, replace the
 * body with: `apiFetch(list() + "?profileId=" + profileId)`.
 */
export async function findWalletByProfile(
  profileId: string,
): Promise<AdminWallet | undefined> {
  if (!profileId) return undefined;
  // TODO: when backend supports ?profileId=, call listAdminWallets({ profileId })
  const { wallets } = await listAdminWallets();
  return wallets.find((w) => w.profileId === profileId);
}

export interface TransactionFilters {
  type?: string;
  walletType?: string;
  direction?: string;
  page?: number;
  limit?: number;
}

/** GET /api/admin/transactions — returns paginated admin transactions. */
export async function listAdminTransactions(
  filters: TransactionFilters = {},
): Promise<AdminTransactionsResult> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminWallets.transactions(), {
    query: {
      type: filters.type,
      walletType: filters.walletType,
      direction: filters.direction,
      page: filters.page,
      limit: filters.limit ?? 100,
    },
  });
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.transactions)) {
      return {
        transactions: obj.transactions as AdminTransaction[],
        total: (obj.total as number | undefined) ?? obj.transactions.length,
        page: (obj.page as number | undefined) ?? filters.page ?? 1,
        limit: (obj.limit as number | undefined) ?? filters.limit ?? 100,
      };
    }
  }
  if (Array.isArray(raw)) {
    return { transactions: raw as AdminTransaction[], total: raw.length, page: 1, limit: 100 };
  }
  return { transactions: [], total: 0, page: 1, limit: 100 };
}

/** GET /api/admin/withdrawals — returns withdrawal requests (currently empty). */
export async function listWithdrawals(
  page = 1,
  limit = 50,
): Promise<WithdrawalsResult> {
  const url = `${API_ROUTES.adminWallets.withdrawals()}?page=${page}&limit=${limit}`;
  const raw = await apiFetch<unknown>(url);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.withdrawals)) {
      return {
        withdrawals: obj.withdrawals as WithdrawalsResult["withdrawals"],
        total: (obj.total as number | undefined) ?? obj.withdrawals.length,
        page: (obj.page as number | undefined) ?? page,
        limit: (obj.limit as number | undefined) ?? limit,
      };
    }
  }
  return { withdrawals: [], total: 0, page, limit };
}
