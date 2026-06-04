"use client";

import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { WalletPage } from "@/features/wallet/wallet-page";
import { WalletAdminDesign } from "@/features/wallet/wallet-admin-design";

export default function WalletPageRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Wallet & transactions"
        dataSource="partial"
        dataSourceHint="Section utilisateur en design (en attente backend). Section plateforme en démo."
        description="Wallet utilisateurs, ajustements manuels, retraits."
      />
      <Tabs
        defaultValue="users"
        tabs={[
          {
            value: "users",
            label: "Wallet utilisateurs (design)",
            content: <WalletAdminDesign />,
          },
          {
            value: "platform",
            label: "Plateforme (démo)",
            content: <WalletPage />,
          },
        ]}
      />
    </div>
  );
}
