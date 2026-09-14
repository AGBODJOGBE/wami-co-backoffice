import { requirePermission } from "@/features/auth/application/dal";
import { getAffiliateConfig } from "@/features/affiliate/application/api";
import { AffiliateConfigPage } from "@/features/affiliate/presentation/affiliate-config-page";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AffiliateConfigPageRoute() {
  await requirePermission("affiliate.config.manage");
  try {
    const config = await getAffiliateConfig();
    return <AffiliateConfigPage config={config} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing · Affiliés"
          title="Configuration"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger la configuration :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
