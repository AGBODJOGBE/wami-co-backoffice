import { requirePermission } from "@/features/auth/application/dal";
import { listDocumentsByOwner } from "@/features/documents/application/api";
import { DriverDetailClient } from "@/features/drivers/presentation/driver-detail-client";
import {
  getDriverCommissionDebtDetail,
  listAdminDrivers,
  listDriverSessions,
  listOnlineDrivers,
} from "@/features/drivers/application/api";
import type {
  AdminDriver,
  AdminDriverStatus,
  DriverCommissionDebtDetail,
  OnlineDriver,
} from "@/features/drivers/domain/admin-driver";
import { listDriverVehicles } from "@/features/vehicles/application/api";
import { findWalletByProfile } from "@/features/wallet/application/api";
import { listRidesByDriver } from "@/features/rides/application/api";
import { DetailNotFound } from "@/shared/ui/detail-header";

export const dynamic = "force-dynamic";

interface SearchParams {
  userId?: string;
  category?: string;
  isDocumentsVerified?: string;
  createdAt?: string;
  status?: string;
}

const VALID_STATUS: AdminDriverStatus[] = [
  "PENDING",
  "OFFLINE",
  "ONLINE",
  "AVAILABLE",
  "BUSY",
  "SUSPENDED",
];

export default async function VtcDriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("driver.view_all");
  const { driverId } = await params;
  const sp = await searchParams;

  if (!driverId) {
    return (
      <DetailNotFound
        backHref="/vtc/drivers"
        backLabel="Retour aux drivers"
        message="Driver introuvable."
      />
    );
  }

  const fallbackUserId = sp.userId ?? "";
  const fallbackCategory = sp.category ?? "—";
  const fallbackVerified = sp.isDocumentsVerified === "true";
  const fallbackCreatedAt = sp.createdAt ?? new Date(0).toISOString();
  const fallbackStatus: AdminDriverStatus = VALID_STATUS.includes(
    sp.status as AdminDriverStatus,
  )
    ? (sp.status as AdminDriverStatus)
    : "PENDING";

  // Parallel fan-out: all admin endpoints + the driver's own resources.
  const [
    adminListRes,
    onlineRes,
    vehiclesRes,
    walletRes,
    recentRidesRes,
    sessionsRes,
    commissionDebtRes,
  ] = await Promise.allSettled([
    listAdminDrivers(),
    listOnlineDrivers(),
    listDriverVehicles(driverId),
    findWalletByProfile(driverId, "EARNINGS"),
    listRidesByDriver(driverId, 6),
    listDriverSessions(driverId, { limit: 20 }),
    getDriverCommissionDebtDetail(driverId),
  ]);

  const enriched: AdminDriver | undefined =
    adminListRes.status === "fulfilled"
      ? adminListRes.value.drivers.find((d) => d.driverId === driverId)
      : undefined;

  const online: OnlineDriver | undefined =
    onlineRes.status === "fulfilled"
      ? onlineRes.value.drivers.find((d) => d.driverId === driverId)
      : undefined;

  const userId = enriched?.userId ?? fallbackUserId;

  // Documents need the userId — fetch them after we know it.
  const documentsRes = await Promise.allSettled([
    userId ? listDocumentsByOwner(userId, "DRIVER") : Promise.resolve([]),
  ]).then((r) => r[0]);

  const documents =
    documentsRes.status === "fulfilled" ? documentsRes.value : [];
  const documentsError =
    documentsRes.status === "rejected"
      ? documentsRes.reason instanceof Error
        ? documentsRes.reason.message
        : "Erreur de chargement des documents."
      : userId
        ? undefined
        : "userId manquant — impossible de charger les documents.";

  const vehicles =
    vehiclesRes.status === "fulfilled" ? vehiclesRes.value : [];
  const vehiclesError =
    vehiclesRes.status === "rejected"
      ? vehiclesRes.reason instanceof Error
        ? vehiclesRes.reason.message
        : "Erreur de chargement des véhicules."
      : undefined;

  const wallet =
    walletRes.status === "fulfilled" ? walletRes.value : undefined;
  const recentRides =
    recentRidesRes.status === "fulfilled" ? recentRidesRes.value : [];
  const sessionsData =
    sessionsRes.status === "fulfilled" ? sessionsRes.value : null;
  const commissionDebt: DriverCommissionDebtDetail | null =
    commissionDebtRes.status === "fulfilled" ? commissionDebtRes.value : null;

  const category = enriched?.category ?? fallbackCategory;

  const REQUIRED_DOC_TYPES = ["DRIVERS_LICENSE", "IDENTITY_CARD", "CRIMINAL_RECORD"];
  const isDocumentsVerifiedFromDocs =
    documents.length > 0 &&
    REQUIRED_DOC_TYPES.every((type) =>
      documents.some((d) => d.type === type && d.status === "VERIFIED"),
    );

  const isDocumentsVerified =
    isDocumentsVerifiedFromDocs ||
    enriched?.isDocumentsVerified ||
    fallbackVerified;
  const createdAt = enriched?.createdAt ?? fallbackCreatedAt;
  const status: AdminDriverStatus =
    (enriched?.status as AdminDriverStatus | undefined) ?? fallbackStatus;

  return (
    <DriverDetailClient
      driverId={driverId}
      userId={userId}
      category={category}
      isDocumentsVerified={isDocumentsVerified}
      createdAt={createdAt}
      status={status}
      vehicles={vehicles}
      documents={documents}
      documentsError={documentsError}
      vehiclesError={vehiclesError}
      enriched={enriched}
      online={online}
      wallet={wallet}
      recentRides={recentRides}
      sessions={sessionsData?.sessions}
      sessionsTotalDuration={sessionsData?.totalDurationSeconds}
      sessionsTotal={sessionsData?.total}
      commissionDebt={commissionDebt}
    />
  );
}
