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

  const allRaw =
    allRes.status === "fulfilled" ? allRes.value : { drivers: [], total: 0 };
  const allError =
    allRes.status === "rejected"
      ? allRes.reason instanceof Error
        ? allRes.reason.message
        : "Erreur de chargement."
      : undefined;

  // Approved drivers tab
  const approvedDrivers = allRaw.drivers.filter((d) => d.isApproved);
  const all = { drivers: approvedDrivers, total: approvedDrivers.length };

  // Pending = not approved from /drivers (rich data with name/phone)
  // + any from /pending not already in the rich list
  const notApprovedFromRich = allRaw.drivers.filter((d) => !d.isApproved);
  const richDriverIds = new Set(allRaw.drivers.map((d) => d.driverId));

  // Enrich /pending rows that aren't already in the rich list
  const byDriverId = new Map(allRaw.drivers.map((d) => [d.driverId, d]));
  const extraPending = pending.drivers
    .filter((p) => !richDriverIds.has(p.driverId))
    .map((p) => {
      const rich = byDriverId.get(p.driverId);
      return rich
        ? { ...p, firstName: rich.firstName, lastName: rich.lastName, phoneNumber: rich.phoneNumber, photoUrl: rich.photoUrl }
        : p;
    });

  // Merge: rich non-approved + extra pending (cast to PendingDriver shape)
  const enrichedPending = [
    ...notApprovedFromRich.map((d) => ({
      driverId: d.driverId,
      userId: d.userId,
      category: d.category,
      isDocumentsVerified: false,
      createdAt: d.createdAt,
      firstName: d.firstName,
      lastName: d.lastName,
      phoneNumber: d.phoneNumber,
      photoUrl: d.photoUrl,
    })),
    ...extraPending,
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Drivers"
        dataSource="live"
        dataSourceHint="Drivers approuvés + onglet 'En attente' branchés sur /api/admin/drivers et /pending."
        description="Validation KYC, gestion des comptes et performance — temps réel."
      />
      <DriversTabs
        pending={enrichedPending}
        pendingTotal={enrichedPending.length}
        pendingError={pendingError}
        all={all.drivers}
        allTotal={all.total}
        allError={allError}
      />
    </div>
  );
}
