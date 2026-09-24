import { requirePermission } from "@/features/auth/application/dal";
import { listAffiliateCommissionSkips } from "@/features/affiliate/application/api";
import { AffiliateCommissionSkipsPage } from "@/features/affiliate/presentation/affiliate-commission-skips-page";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AffiliateCommissionSkipsPageRoute() {
  await requirePermission("affiliate.view");
  try {
    const result = await listAffiliateCommissionSkips({ resolved: false, limit: 100 });
    return <AffiliateCommissionSkipsPage items={result.items} total={result.pagination.total} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing · Affiliés"
          title="Usages sans commission"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les usages écartés :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
