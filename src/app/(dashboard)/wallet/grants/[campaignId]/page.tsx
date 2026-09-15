import { requirePermission } from "@/features/auth/application/dal";
import { getWalletGrantCampaign } from "@/features/wallet/application/grant-api";
import { WalletGrantDetailPage } from "@/features/wallet/presentation/wallet-grant-detail-page";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function WalletGrantDetailPageRoute({ params }: Props) {
  await requirePermission("wallet.grant.view");
  const { campaignId } = await params;
  try {
    const detail = await getWalletGrantCampaign(campaignId);
    return <WalletGrantDetailPage detail={detail} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Finance · Campagnes de crédit"
          title="Détail campagne"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger la campagne :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
