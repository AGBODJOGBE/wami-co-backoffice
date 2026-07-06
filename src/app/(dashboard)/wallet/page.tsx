import {
  getPlatformRevenue,
  listAdminTransactions,
  listAdminWallets,
  listWithdrawals,
} from "@/features/wallet/application/api";
import { PageHeader } from "@/shared/ui/page-header";
import { WalletLivePage } from "@/features/wallet/wallet-live-page";

export const dynamic = "force-dynamic";

export default async function WalletPageRoute() {
  const [walletsRes, transactionsRes, withdrawalsRes, platformRevenueRes] =
    await Promise.allSettled([
      listAdminWallets(),
      listAdminTransactions({ limit: 100 }),
      listWithdrawals({ limit: 50 }),
      getPlatformRevenue(),
    ]);

  const rawWallets =
    walletsRes.status === "fulfilled" ? walletsRes.value.wallets : [];

  const transactions =
    transactionsRes.status === "fulfilled"
      ? transactionsRes.value.transactions
      : [];

  const withdrawalsList =
    withdrawalsRes.status === "fulfilled"
      ? withdrawalsRes.value.withdrawals
      : [];
  const withdrawalsTotal =
    withdrawalsRes.status === "fulfilled" ? withdrawalsRes.value.total : 0;

  const platformRevenue =
    platformRevenueRes.status === "fulfilled"
      ? platformRevenueRes.value
      : null;

  const wallets = rawWallets.map((w) => ({
    ...w,
    ownerName:
      w.ownerName || (w.walletType === "PLATFORM" ? "Plateforme ForYou" : ""),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Wallet & transactions"
        dataSource="live"
        dataSourceHint="Wallets, transactions et retraits branchés sur /api/admin/wallets, /api/admin/transactions et /api/admin/withdrawals."
        description="Wallet utilisateurs, ajustements manuels, retraits."
      />
      <WalletLivePage
        wallets={wallets}
        transactions={transactions}
        withdrawals={withdrawalsList}
        withdrawalsTotal={withdrawalsTotal}
        platformRevenue={platformRevenue ?? undefined}
      />
    </div>
  );
}
