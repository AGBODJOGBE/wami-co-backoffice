import { getReferralStats, listReferrals } from "@/features/referrals/application/api";
import { ReferralsListClient } from "@/features/referrals/presentation/referrals-list-client";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function ReferralsPageRoute() {
  try {
    const [{ referrals, total }, stats] = await Promise.all([
      listReferrals(),
      getReferralStats(),
    ]);

    return (
      <ReferralsListClient
        referrals={referrals}
        total={total}
        stats={stats}
      />
    );
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing"
          title="Parrainage"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les parrainages :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
