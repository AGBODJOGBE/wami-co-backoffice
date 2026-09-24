import { requirePermission } from "@/features/auth/application/dal";
import { getAffiliateDetail } from "@/features/affiliate/application/api";
import { AffiliateDetailPage } from "@/features/affiliate/presentation/affiliate-detail-page";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ affiliateId: string }>;
  searchParams: Promise<{ status?: string; from?: string; to?: string; limit?: string; offset?: string }>;
}

export default async function AffiliateDetailPageRoute({ params, searchParams }: Props) {
  await requirePermission("affiliate.view");
  const { affiliateId } = await params;
  const sp = await searchParams;
  try {
    const detail = await getAffiliateDetail(affiliateId, {
      status: sp.status,
      from:   sp.from,
      to:     sp.to,
      limit:  sp.limit  ? Number(sp.limit)  : undefined,
      offset: sp.offset ? Number(sp.offset) : undefined,
    });
    return <AffiliateDetailPage detail={detail} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing · Affiliés"
          title="Fiche affilié"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger la fiche :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
