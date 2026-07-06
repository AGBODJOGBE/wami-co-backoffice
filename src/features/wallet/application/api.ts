import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AdminTransaction,
  AdminTransactionsResult,
  AdminWallet,
  AdminWalletsResult,
  PlatformRevenue,
  WithdrawalsResult,
} from "../domain/wallet";

// ─── Wallets ──────────────────────────────────────────────────────────────────

export function getAdminWallet(walletId: string): Promise<AdminWallet> {
  return apiFetch<AdminWallet>(API_ROUTES.adminWallets.detail(walletId));
}

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
    if (filters.status)     params.set("status",     filters.status);
    if (filters.page   != null) params.set("page",  String(filters.page));
    if (filters.limit  != null) params.set("limit", String(filters.limit));
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

export async function findWalletByProfile(
  profileId: string,
): Promise<AdminWallet | undefined> {
  if (!profileId) return undefined;
  const { wallets } = await listAdminWallets();
  return wallets.find((w) => w.profileId === profileId);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionFilters {
  walletId?:  string;
  type?:      string;
  walletType?: string;
  direction?: string;
  status?:    string;
  fromDate?:  string;
  toDate?:    string;
  page?:      number;
  limit?:     number;
}

export async function listAdminTransactions(
  filters: TransactionFilters = {},
): Promise<AdminTransactionsResult> {
  const query: Record<string, string | number | undefined> = {
    page:  filters.page  ?? 1,
    limit: filters.limit ?? 100,
  };
  if (filters.walletId)   query.walletId   = filters.walletId;
  if (filters.type)       query.type       = filters.type;
  if (filters.walletType) query.walletType  = filters.walletType;
  if (filters.direction)  query.direction  = filters.direction;
  if (filters.status)     query.status     = filters.status;
  if (filters.fromDate)   query.fromDate   = filters.fromDate;
  if (filters.toDate)     query.toDate     = filters.toDate;

  const raw = await apiFetch<unknown>(API_ROUTES.adminWallets.transactions(), { query });

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.transactions)) {
      return {
        transactions: obj.transactions as AdminTransaction[],
        total: (obj.total as number | undefined) ?? obj.transactions.length,
        page:  (obj.page  as number | undefined) ?? filters.page  ?? 1,
        limit: (obj.limit as number | undefined) ?? filters.limit ?? 100,
      };
    }
  }
  if (Array.isArray(raw)) {
    return { transactions: raw as AdminTransaction[], total: raw.length, page: 1, limit: 100 };
  }
  return { transactions: [], total: 0, page: 1, limit: 100 };
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export interface WithdrawalFilters {
  status?:   string;
  method?:   string;
  fromDate?: string;
  toDate?:   string;
  page?:     number;
  limit?:    number;
}

export async function listWithdrawals(
  filters: WithdrawalFilters | number = {},
  legacyLimit?: number,
): Promise<WithdrawalsResult> {
  // Backward-compat: old callers used listWithdrawals(page, limit)
  let f: WithdrawalFilters;
  if (typeof filters === "number") {
    f = { page: filters, limit: legacyLimit ?? 50 };
  } else {
    f = filters;
  }

  const params = new URLSearchParams();
  if (f.status)   params.set("status",   f.status);
  if (f.method)   params.set("method",   f.method);
  if (f.fromDate) params.set("fromDate", f.fromDate);
  if (f.toDate)   params.set("toDate",   f.toDate);
  params.set("page",  String(f.page  ?? 1));
  params.set("limit", String(f.limit ?? 50));

  const url = `${API_ROUTES.adminWallets.withdrawals()}?${params.toString()}`;
  const raw = await apiFetch<unknown>(url);

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.withdrawals)) {
      return {
        withdrawals: obj.withdrawals as WithdrawalsResult["withdrawals"],
        total: (obj.total as number | undefined) ?? obj.withdrawals.length,
        page:  (obj.page  as number | undefined) ?? f.page  ?? 1,
        limit: (obj.limit as number | undefined) ?? f.limit ?? 50,
      };
    }
  }
  return { withdrawals: [], total: 0, page: f.page ?? 1, limit: f.limit ?? 50 };
}

// ─── Platform revenue ─────────────────────────────────────────────────────────

export async function getPlatformRevenue(
  from?: string,
  to?: string,
): Promise<PlatformRevenue | null> {
  try {
    let url = API_ROUTES.adminPlatform.revenue();
    const params = new URLSearchParams();
    if (from) params.set("fromDate", from);
    if (to)   params.set("toDate",   to);
    const qs = params.toString();
    if (qs) url = `${url}?${qs}`;

    const raw = await apiFetch<unknown>(url);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as PlatformRevenue;
    }
    return null;
  } catch {
    return null;
  }
}
