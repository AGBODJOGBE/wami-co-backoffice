/**
 * Admin wallets. Mirrors:
 *   GET /api/admin/wallets/{walletId}
 *   GET /api/admin/wallets             (list)
 */

export interface AdminWallet {
  walletId: string;
  /** UUID of the owning profile (driverId or passengerId — depends on type). */
  profileId: string;
  /** Free-form wallet type — usually "DRIVER" or "PASSENGER". */
  walletType: string;
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
