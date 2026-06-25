import { listAdminWallets } from "@/features/wallet/application/api";
import { listAdminDrivers } from "@/features/drivers/application/api";
import { listAdminRides } from "@/features/rides/application/api";
import { fullParty } from "@/features/rides/domain/admin-ride";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { WalletAdminDesign } from "@/features/wallet/wallet-admin-design";
import { WalletLivePage } from "@/features/wallet/wallet-live-page";

export const dynamic = "force-dynamic";

export default async function WalletPageRoute() {
  const [walletsRes, ridesRes, driversRes] = await Promise.allSettled([
    listAdminWallets(),
    listAdminRides(),
    listAdminDrivers(),
  ]);

  const rawWallets =
    walletsRes.status === "fulfilled" ? walletsRes.value.wallets : [];
  const rides =
    ridesRes.status === "fulfilled" ? ridesRes.value.rides : [];
  const drivers =
    driversRes.status === "fulfilled" ? driversRes.value.drivers : [];

  // Build profileId → name map from drivers + rides
  const nameMap = new Map<string, string>();
  for (const d of drivers) {
    nameMap.set(d.driverId, `${d.firstName} ${d.lastName}`.trim());
  }
  for (const r of rides) {
    if (r.passenger?.passengerId) {
      const name = fullParty(r.passenger);
      if (name && name !== "—") nameMap.set(r.passenger.passengerId, name);
    }
    if (r.driver?.driverId) {
      const name = fullParty(r.driver);
      if (name && name !== "—") nameMap.set(r.driver.driverId, name);
    }
  }

  // Enrich wallets with ownerName
  const wallets = rawWallets.map((w) => ({
    ...w,
    ownerName:
      w.ownerName ||
      nameMap.get(w.profileId) ||
      (w.walletType === "PLATFORM" ? "Plateforme ForYou" : ""),
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
