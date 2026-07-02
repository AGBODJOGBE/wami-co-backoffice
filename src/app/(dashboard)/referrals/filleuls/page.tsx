import { listFilleuls } from "@/features/referrals/application/api";
import { FilleulsListClient } from "@/features/referrals/presentation/filleuls-list-client";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function FilleulsPageRoute() {
  try {
    const { referrals, total } = await listFilleuls();
    return <FilleulsListClient referrals={referrals} total={total} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing · Parrainage"
          title="Filleuls"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les filleuls :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
