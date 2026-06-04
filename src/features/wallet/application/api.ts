import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { AdminWallet, AdminWalletsResult } from "../domain/wallet";

export function getAdminWallet(walletId: string): Promise<AdminWallet> {
  return apiFetch<AdminWallet>(API_ROUTES.adminWallets.detail(walletId));
}

/** GET /api/admin/wallets — tolerates array, {wallets,total}, {data} */
export async function listAdminWallets(): Promise<AdminWalletsResult> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminWallets.list());
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

/** Find a wallet by profileId (driverId or passengerId). */
export async function findWalletByProfile(
  profileId: string,
): Promise<AdminWallet | undefined> {
  if (!profileId) return undefined;
  const { wallets } = await listAdminWallets();
  return wallets.find((w) => w.profileId === profileId);
}
