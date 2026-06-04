import {
  listAdminDrivers,
  listPendingDrivers,
} from "@/features/drivers/application/api";
import { DriversTabs } from "@/features/drivers/presentation/drivers-tabs";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function VtcDriversPage() {
  const [pendingRes, allRes] = await Promise.allSettled([
    listPendingDrivers(),
    listAdminDrivers(),
  ]);

  const pending =
    pendingRes.status === "fulfilled"
      ? pendingRes.value
      : { drivers: [], total: 0 };
  const pendingError =
    pendingRes.status === "rejected"
      ? pendingRes.reason instanceof Error
        ? pendingRes.reason.message
        : "Erreur de chargement."
      : undefined;

  const all =
    allRes.status === "fulfilled" ? allRes.value : { drivers: [], total: 0 };
  const allError =
    allRes.status === "rejected"
      ? allRes.reason instanceof Error
        ? allRes.reason.message
        : "Erreur de chargement."
      : undefined;

  // Enrich pending rows with name/phone from the rich /drivers list so
  // the pending tab doesn't only show UUIDs.
  const byDriverId = new Map(all.drivers.map((d) => [d.driverId, d]));
  const enrichedPending = pending.drivers.map((p) => {
    const rich = byDriverId.get(p.driverId);
    return rich
      ? {
          ...p,
          firstName: rich.firstName,
          lastName: rich.lastName,
          phoneNumber: rich.phoneNumber,
          photoUrl: rich.photoUrl,
        }
      : p;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Drivers"
        dataSource="live"
        dataSourceHint="Liste complète + onglet 'En attente' branchés sur /api/admin/drivers et /pending."
        description="Validation KYC, gestion des comptes et performance — temps réel."
      />
      <DriversTabs
        pending={enrichedPending}
        pendingTotal={pending.total}
        pendingError={pendingError}
        all={all.drivers}
        allTotal={all.total}
        allError={allError}
      />
    </div>
  );
}
