import { requirePermission } from "@/features/auth/application/dal";
import { getCurrentAdmin } from "@/features/auth/application/session";
import type { AdminProfile } from "@/features/auth/domain/entity/admin";
import { listDocumentsByOwner } from "@/features/documents/application/api";
import {
  listAdminDrivers,
} from "@/features/drivers/application/api";
import type { AdminDriver } from "@/features/drivers/domain/admin-driver";
import { getVehicle } from "@/features/vehicles/application/api";
import { VehicleDetailClient } from "@/features/vehicles/presentation/vehicle-detail-client";
import { DetailNotFound } from "@/shared/ui/detail-header";
import { ApiError } from "@/shared/lib/api/types";

export const dynamic = "force-dynamic";

export default async function VtcVehicleDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  await requirePermission("vehicle.view_all");
  const { vehicleId } = await params;

  let vehicle;
  try {
    vehicle = await getVehicle(vehicleId);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.status === 404
          ? "Véhicule introuvable."
          : `${error.status} — ${error.message}`
        : error instanceof Error
          ? error.message
          : "Erreur inconnue.";
    return (
      <DetailNotFound
        backHref="/vtc/vehicles"
        backLabel="Retour aux véhicules"
        message={message}
      />
    );
  }

  // Fan-out: vehicle documents + all drivers (for assign combobox + assigned driver info).
  const [docsRes, driversRes] = await Promise.allSettled([
    listDocumentsByOwner(vehicleId, "VEHICLE"),
    listAdminDrivers(),
  ]);

  const allDrivers = driversRes.status === "fulfilled" ? driversRes.value.drivers : [];

  let assignedDriver: AdminDriver | undefined;
  if (vehicle.assignedToDriverId) {
    assignedDriver = allDrivers.find(
      (d) => d.driverId === vehicle.assignedToDriverId,
    );
  }

  // Vehicle docs are often stored under the DRIVER owner (not VEHICLE).
  // If the VEHICLE query returned nothing, try the driver's userId with
  // ownerType=DRIVER and filter for vehicle-related types.
  const VEHICLE_DOC_TYPES = new Set(["REGISTRATION_CARD", "INSURANCE"]);
  let documents = docsRes.status === "fulfilled" ? docsRes.value : [];
  let documentsError =
    docsRes.status === "rejected"
      ? docsRes.reason instanceof Error
        ? docsRes.reason.message
        : "Erreur de chargement des documents."
      : undefined;

  if (documents.length === 0 && !documentsError && assignedDriver?.userId) {
    try {
      const driverDocs = await listDocumentsByOwner(assignedDriver.userId, "DRIVER");
      documents = driverDocs.filter((d) => VEHICLE_DOC_TYPES.has(d.type));
    } catch {
      // Silently ignore — the fallback to vehicle URLs still applies.
    }
  }

  // Build a userId → full profile map. We only know the connected admin
  // (the JWT/session has it). For other admins, the client falls back to
  // an "Admin externe + copyable UUID" lozenge until the backend exposes
  // GET /api/admin/admins so we can resolve any verifiedBy.
  const me = await getCurrentAdmin();
  const adminProfiles: Record<string, AdminProfile> = {};
  if (me?.userId) adminProfiles[me.userId] = me;

  return (
    <VehicleDetailClient
      vehicle={vehicle}
      documents={documents}
      documentsError={documentsError}
      assignedDriver={assignedDriver}
      drivers={allDrivers}
      adminProfiles={adminProfiles}
      connectedAdminId={me?.userId}
    />
  );
}
