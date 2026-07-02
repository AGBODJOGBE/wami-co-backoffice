/**
 * Admin wallets. Mirrors:
 *   GET /api/admin/wallets/{walletId}
 *   GET /api/admin/wallets             (list)
 *   GET /api/admin/withdrawals         (withdrawal requests)
 */

export interface AdminWallet {
  walletId: string;
  /** UUID of the owning profile (driverId or passengerId — depends on type). */
  profileId: string;
  /** Wallet type as returned by the backend. */
  walletType: "PAYMENT" | "EARNINGS" | "PLATFORM";
  mainBalance: number;
  bonusBalance: number;
  referralBalance: number;
  totalBalance: number;
  /** "ACTIVE" | "FROZEN" | … */
  status: string;
  ownerName: string;
  ownerPhone: string;
  createdAt: string;
}

export interface AdminWalletsResult {
  wallets: AdminWallet[];
  total: number;
}

/**
 * A single withdrawal request.
 * The backend array is currently empty; fields are inferred from domain knowledge.
 * The index signature allows the backend to extend the shape without breaking the UI.
 */
export interface Withdrawal {
  withdrawalId: string;
  walletId: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  requestedAt: string;
  processedAt?: string;
  ownerName?: string;
  ownerPhone?: string;
  [key: string]: unknown; // backend peut étendre
}

export interface WithdrawalsResult {
  withdrawals: Withdrawal[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTransaction {
  transactionId: string;
  walletId: string;
  ownerName: string;
  ownerPhone: string;
  walletType: "PAYMENT" | "EARNINGS" | "PLATFORM";
  type: "ADMIN_CREDIT" | "RIDE_PAYMENT" | "RIDE_EARNINGS" | "DEBIT" | "RECHARGE" | "CREDIT";
  direction: "CREDIT" | "DEBIT";
  balanceType: "MAIN" | "BONUS" | "REFERRAL";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  description: string;
  status: string;
  metadata: unknown;
  processedAt: string;
  createdAt: string;
}

export interface AdminTransactionsResult {
  transactions: AdminTransaction[];
  total: number;
  page: number;
  limit: number;
}

export const TRANSACTION_TYPE_META: Record<
  AdminTransaction["type"],
  { label: string; tone: "success" | "danger" | "warning" | "primary" | "info" | "neutral" }
> = {
  RECHARGE:      { label: "Dépôt",                  tone: "success" },
  RIDE_EARNINGS: { label: "Gains course",            tone: "success" },
  CREDIT:        { label: "Crédit",                  tone: "primary" },
  ADMIN_CREDIT:  { label: "Crédit admin",            tone: "info" },
  RIDE_PAYMENT:  { label: "Commission plateforme",   tone: "warning" },
  DEBIT:         { label: "Débit",                   tone: "danger" },
};

export const WALLET_TYPE_META: Record<AdminTransaction["walletType"], { label: string }> = {
  PAYMENT:  { label: "Wallet passager" },
  EARNINGS: { label: "Wallet chauffeur" },
  PLATFORM: { label: "Wallet plateforme" },
};
