import { requireAnyPermission } from "@/features/auth/application/dal";
import {
  listDriverBonusConfigs,
  listDriverBonusAwards,
  listActivityConfigs,
  listQualityConfigs,
  getRunConfig,
} from "@/features/driver-bonus/application/api";
import { DriverBonusPageClient } from "@/features/driver-bonus/presentation/driver-bonus-page-client";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function DriverBonusPage() {
  await requireAnyPermission(["driver_bonus.config.view", "driver_bonus.awards.view"]);

  const [
    tierConfigs,
    awardsResult,
    activityConfigs,
    qualityConfigs,
    runConfig,
  ] = await Promise.allSettled([
    listDriverBonusConfigs(),
    listDriverBonusAwards({ limit: 50 }),
    listActivityConfigs(),
    listQualityConfigs(),
    getRunConfig(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Bonus drivers"
        dataSource="live"
        dataSourceHint="3 systèmes : Bienvenue (paliers), Activité quotidienne, Qualité mensuelle — GET /api/admin/driver-bonus"
        description="Gérez les trois systèmes de bonus : paliers cumulatifs, activité journalière et qualité de service mensuelle."
      />
      <DriverBonusPageClient
        tierConfigs={tierConfigs.status === "fulfilled" ? tierConfigs.value : []}
        awards={awardsResult.status === "fulfilled" ? awardsResult.value.awards : []}
        awardsTotal={awardsResult.status === "fulfilled" ? awardsResult.value.total : 0}
        activityConfigs={activityConfigs.status === "fulfilled" ? activityConfigs.value : []}
        qualityConfigs={qualityConfigs.status === "fulfilled" ? qualityConfigs.value : []}
        runConfig={runConfig.status === "fulfilled" ? runConfig.value : null}
      />
    </div>
  );
}
