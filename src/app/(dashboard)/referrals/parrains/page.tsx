import { requirePermission } from "@/features/auth/application/dal";
import { listParrains } from "@/features/referrals/application/api";
import { ParrainsListClient } from "@/features/referrals/presentation/parrains-list-client";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function ParrainsPageRoute() {
  await requirePermission("referral.view_all");
  try {
    const { referrals, total } = await listParrains();
    return <ParrainsListClient referrals={referrals} total={total} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Marketing · Parrainage"
          title="Parrains"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les parrains :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
