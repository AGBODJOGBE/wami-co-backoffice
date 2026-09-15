import { requirePermission } from "@/features/auth/application/dal";
import { listWalletGrantCampaigns } from "@/features/wallet/application/grant-api";
import { WalletGrantsPage } from "@/features/wallet/presentation/wallet-grants-page";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function WalletGrantsPageRoute() {
  await requirePermission("wallet.grant.view");
  try {
    const result = await listWalletGrantCampaigns({ limit: 50 });
    return <WalletGrantsPage campaigns={result.campaigns} total={result.total} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Finance · Wallet"
          title="Campagnes de crédit"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les campagnes :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
