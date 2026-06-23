import { listAdminWallets } from "@/features/wallet/application/api";
import { listAdminRides } from "@/features/rides/application/api";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { WalletAdminDesign } from "@/features/wallet/wallet-admin-design";
import { WalletLivePage } from "@/features/wallet/wallet-live-page";

export const dynamic = "force-dynamic";

export default async function WalletPageRoute() {
  const [walletsRes, ridesRes] = await Promise.allSettled([
    listAdminWallets(),
    listAdminRides(),
  ]);

  const wallets =
    walletsRes.status === "fulfilled" ? walletsRes.value.wallets : [];
  const rides =
    ridesRes.status === "fulfilled" ? ridesRes.value.rides : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Wallet & transactions"
        dataSource="live"
        dataSourceHint="Wallets et courses branchés sur /api/admin/wallets et /api/admin/rides."
        description="Wallet utilisateurs, ajustements manuels, retraits."
      />
      <Tabs
        defaultValue="platform"
        tabs={[
          {
            value: "platform",
            label: "Plateforme (live)",
            content: <WalletLivePage wallets={wallets} rides={rides} />,
          },
          {
            value: "users",
            label: "Wallet utilisateurs (design)",
            content: <WalletAdminDesign />,
          },
        ]}
      />
    </div>
  );
}
