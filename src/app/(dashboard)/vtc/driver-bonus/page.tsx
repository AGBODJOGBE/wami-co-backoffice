import { requireAnyPermission } from "@/features/auth/application/dal";
import { listDriverBonusConfigs, listDriverBonusAwards } from "@/features/driver-bonus/application/api";
import { DriverBonusPageClient } from "@/features/driver-bonus/presentation/driver-bonus-page-client";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function DriverBonusPage() {
  await requireAnyPermission(["driver_bonus.config.view", "driver_bonus.awards.view"]);
  const [configs, awardsResult] = await Promise.allSettled([
    listDriverBonusConfigs(),
    listDriverBonusAwards({ limit: 50 }),
  ]);

  const allConfigs = configs.status === "fulfilled" ? configs.value : [];
  const awardsData = awardsResult.status === "fulfilled" ? awardsResult.value : { awards: [], total: 0, page: 1, limit: 50 };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Bonus drivers"
        dataSource="live"
        dataSourceHint="Barèmes et historique des bonus par paliers de courses — GET /api/admin/driver-bonus"
        description="Configurez les bonus versés automatiquement aux drivers à chaque palier de courses atteint."
      />
      <DriverBonusPageClient
        configs={allConfigs}
        awards={awardsData.awards}
        awardsTotal={awardsData.total}
      />
    </div>
  );
}
