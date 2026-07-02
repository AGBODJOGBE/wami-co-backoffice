import { listReferralConfigs } from "@/features/referrals/application/api";
import { ReferralConfigClient } from "@/features/referrals/presentation/referral-config-client";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function ReferralConfigPageRoute() {
  try {
    const configs = await listReferralConfigs();
    return <ReferralConfigClient configs={configs} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing · Parrainage"
          title="Configuration du programme"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les configurations :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
