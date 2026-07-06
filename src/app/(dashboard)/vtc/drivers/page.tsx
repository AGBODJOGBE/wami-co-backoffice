import {
  listAdminDrivers,
  listDriverUsers,
  listOnlineDrivers,
  listPendingDrivers,
} from "@/features/drivers/application/api";
import { listAdminRides } from "@/features/rides/application/api";
import { DriversTabs } from "@/features/drivers/presentation/drivers-tabs";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function VtcDriversPage() {
  const [pendingRes, allRes, ridesRes, onlineRes, driverUsersRes] =
    await Promise.allSettled([
      listPendingDrivers(),
      listAdminDrivers(),
      listAdminRides(),
      listOnlineDrivers(),
      listDriverUsers(),
    ]);

  // ── Users map (userId → name/phone) for enrichment ────────────────────────
  const driverUsersMap =
    driverUsersRes.status === "fulfilled" ? driverUsersRes.value : new Map();

  // ── Pending drivers ────────────────────────────────────────────────────────
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

  // ── Approved drivers (rich list) ───────────────────────────────────────────
  const allRaw =
    allRes.status === "fulfilled" ? allRes.value : { drivers: [], total: 0 };
  const allError =
    allRes.status === "rejected"
      ? allRes.reason instanceof Error
        ? allRes.reason.message
        : "Erreur de chargement."
      : undefined;

  // ── Rides: count per driver ────────────────────────────────────────────────
  const rides = ridesRes.status === "fulfilled" ? ridesRes.value.rides : [];
  const rideCountByDriverId = new Map<string, number>();
  for (const r of rides) {
    if (r.driver?.driverId) {
      rideCountByDriverId.set(
        r.driver.driverId,
        (rideCountByDriverId.get(r.driver.driverId) ?? 0) + 1,
      );
    }
  }

  // ── Online driver ids ──────────────────────────────────────────────────────
  const onlineDriverIds = new Set(
    onlineRes.status === "fulfilled"
      ? onlineRes.value.drivers.map((d) => d.driverId)
      : [],
  );

  // ── Patch rich list with real ride counts + online status ──────────────────
  const patchedDrivers = allRaw.drivers.map((d) => ({
    ...d,
    // Fill missing names from users map when rich list has placeholder values
    firstName:
      d.firstName && d.firstName !== "Driver"
        ? d.firstName
        : (driverUsersMap.get(d.userId)?.firstName ?? d.firstName),
    lastName:
      d.lastName ||
      (driverUsersMap.get(d.userId)?.lastName ?? d.lastName),
    phoneNumber:
      d.phoneNumber ||
      (driverUsersMap.get(d.userId)?.phoneNumber ?? d.phoneNumber),
    totalRides: rideCountByDriverId.get(d.driverId) ?? d.totalRides,
    isOnline: onlineDriverIds.size > 0 ? onlineDriverIds.has(d.driverId) : undefined,
  }));

  // ── Approved tab ───────────────────────────────────────────────────────────
  const approvedDrivers = patchedDrivers.filter((d) => d.isApproved);
  const all = { drivers: approvedDrivers, total: approvedDrivers.length };

  // ── Pending enrichment ─────────────────────────────────────────────────────
  // Priority: rich list (patchedDrivers) → users map → raw pending data
  const richDriverIds = new Set(patchedDrivers.map((d) => d.driverId));
  const byDriverId = new Map(patchedDrivers.map((d) => [d.driverId, d]));

  const notApprovedFromRich = patchedDrivers.filter((d) => !d.isApproved);

  const extraPending = pending.drivers
    .filter((p) => !richDriverIds.has(p.driverId))
    .map((p) => {
      // Try rich list first, then users map by userId
      const rich = byDriverId.get(p.driverId);
      const fromUsers = driverUsersMap.get(p.userId);

      return {
        ...p,
        firstName:
          rich?.firstName ??
          fromUsers?.firstName ??
          p.firstName ??
          "",
        lastName:
          rich?.lastName ??
          fromUsers?.lastName ??
          p.lastName ??
          "",
        phoneNumber:
          rich?.phoneNumber ??
          fromUsers?.phoneNumber ??
          p.phoneNumber ??
          "",
        photoUrl: rich?.photoUrl ?? p.photoUrl ?? null,
      };
    });

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
