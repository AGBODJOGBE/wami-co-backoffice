import { requirePermission } from "@/features/auth/application/dal";
import { listAffiliates } from "@/features/affiliate/application/api";
import { AffiliateListPage } from "@/features/affiliate/presentation/affiliate-list-page";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AffiliatePageRoute() {
  await requirePermission("affiliate.view");
  try {
    const affiliates = await listAffiliates();
    return <AffiliateListPage affiliates={affiliates} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing"
          title="Affiliés"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les affiliés :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
