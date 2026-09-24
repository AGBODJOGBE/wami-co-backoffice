import { requirePermission } from "@/features/auth/application/dal";
import { getManualAssignmentQueue } from "@/features/rides/application/api";
import { ScheduledManualAssignmentPage } from "@/features/rides/presentation/scheduled-manual-assignment-page";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function ScheduledRidesToAssignPage() {
  await requirePermission("ride.scheduled.assign.view");
  try {
    const queue = await getManualAssignmentQueue();
    return <ScheduledManualAssignmentPage queue={queue} />;
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Opérations · VTC" title="Réservations à affecter" dataSource="live" />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les réservations :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
