import {
  listAdminDrivers,
  listDriverSessions,
  listDriverUsers,
  listOnlineDrivers,
  listPendingDrivers,
} from "@/features/drivers/application/api";
import { listAdminRides } from "@/features/rides/application/api";
import { DriversTabs } from "@/features/drivers/presentation/drivers-tabs";
import { PageHeader } from "@/shared/ui/page-header";
import { requirePermission } from "@/features/auth/application/dal";

export const dynamic = "force-dynamic";

export default async function VtcDriversPage() {
  await requirePermission("driver.view_all");
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
  const onlineDrivers = onlineRes.status === "fulfilled" ? onlineRes.value.drivers : [];
  const onlineDriverIds = new Set(onlineDrivers.map((d) => d.driverId));

  // Sessions : uniquement pour les drivers EN LIGNE (petit N, typiquement 2-10).
  // totalDurationSeconds = somme de toutes les sessions fermées (agrégation
  // backend sans limit). openSince = startedAt de la session ouverte pour
  // calculer le temps écoulé en direct côté client.
  // Les drivers hors-ligne affichent "—" : leur total ne change pas en temps réel.
  type SessionEntry = { totalSeconds: number; openSince: string | null };
  const sessionsByDriverId = new Map<string, SessionEntry>();

  if (onlineDrivers.length > 0) {
    const sessionResults = await Promise.allSettled(
      onlineDrivers.map((d) => listDriverSessions(d.driverId, { limit: 1 })),
    );
    for (let i = 0; i < onlineDrivers.length; i++) {
      const res = sessionResults[i];
      const driverId = onlineDrivers[i].driverId;
      if (res.status === "fulfilled") {
        const { totalDurationSeconds, sessions } = res.value;
        const openSession = sessions.find((s) => s.endedAt === null) ?? null;
        sessionsByDriverId.set(driverId, {
          totalSeconds: totalDurationSeconds,
          openSince: openSession?.startedAt ?? null,
        });
      }
    }
  }

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

  // ── Véhicule plateforme vs autres ──────────────────────────────────────────
  // isVehicleOwner === false → véhicule appartient à ForYou (plateforme)
  const platformVehicleDrivers = approvedDrivers.filter(
    (d) => d.isVehicleOwner === false && !!d.vehicle,
  );
  const otherApprovedDrivers = approvedDrivers.filter(
    (d) => d.isVehicleOwner === true || !d.vehicle,
  );

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
        online={onlineDrivers}
        onlineTotal={onlineDrivers.length}
        sessionsByDriverId={sessionsByDriverId}
        platformVehicleDrivers={platformVehicleDrivers}
        otherApprovedDrivers={otherApprovedDrivers}
      />
    </div>
  );
}
