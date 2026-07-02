import {
  listAdminWallets,
  listWithdrawals,
} from "@/features/wallet/application/api";
import { PageHeader } from "@/shared/ui/page-header";
import { WalletLivePage } from "@/features/wallet/wallet-live-page";

export const dynamic = "force-dynamic";

export default async function WalletPageRoute() {
  const [walletsRes, withdrawalsRes] = await Promise.allSettled([
    listAdminWallets(),
    listWithdrawals(),
  ]);

  const rawWallets =
    walletsRes.status === "fulfilled" ? walletsRes.value.wallets : [];
  const withdrawalsList =
    withdrawalsRes.status === "fulfilled"
      ? withdrawalsRes.value.withdrawals
      : [];
  const withdrawalsTotal =
    withdrawalsRes.status === "fulfilled" ? withdrawalsRes.value.total : 0;

  // ownerName et ownerPhone sont déjà fournis par l'API wallet
  const wallets = rawWallets.map((w) => ({
    ...w,
    ownerName: w.ownerName || (w.walletType === "PLATFORM" ? "Plateforme ForYou" : ""),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Wallet & transactions"
        dataSource="live"
        dataSourceHint="Wallets et courses branchés sur /api/admin/wallets et /api/admin/rides."
        description="Wallet utilisateurs, ajustements manuels, retraits."
      />
      <WalletLivePage
        wallets={wallets}
        rides={[]}
        withdrawals={withdrawalsList}
        withdrawalsTotal={withdrawalsTotal}
      />
    </div>
  );
}
