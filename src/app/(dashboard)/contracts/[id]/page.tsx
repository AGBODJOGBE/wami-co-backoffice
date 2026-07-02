import { getContract, getContractInstallments, listContractAuditLogs } from "@/features/contracts/application/api";
import { ContractDetailPage } from "@/features/contracts/presentation/contract-detail-page";
import { DetailNotFound } from "@/shared/ui/detail-header";
import { ApiError } from "@/shared/lib/api/types";
import { listAdminDrivers } from "@/features/drivers/application/api";
import { getVehicle } from "@/features/vehicles/application/api";

export const dynamic = "force-dynamic";

export default async function ContractDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    // ── 1. Fetch contract first to get driverId / vehicleId ───────────────
    const contract = await getContract(id);

    // ── 2. Parallel: installments, audit logs, driver list, vehicle ───────
    const vehicleId = contract.vehicle.vehicleId;
    const [installments, auditLogsRes, driversRes, vehicleRes] =
      await Promise.allSettled([
        getContractInstallments(id),
        listContractAuditLogs({ contractId: id, limit: 50 }),
        listAdminDrivers(),
        vehicleId ? getVehicle(vehicleId) : Promise.reject(new Error("no vehicleId")),
      ]);

    // ── 3. Enrich driver stub ─────────────────────────────────────────────
    const drivers =
      driversRes.status === "fulfilled" ? driversRes.value.drivers : [];
    const foundDriver = drivers.find(
      (d) => d.driverId === contract.driver.driverId,
    );
    const enrichedDriver = foundDriver
      ? {
          driverId: foundDriver.driverId,
          firstName: foundDriver.firstName,
          lastName: foundDriver.lastName,
          phoneNumber: foundDriver.phoneNumber,
        }
      : contract.driver;

    // ── 4. Enrich vehicle stub ────────────────────────────────────────────
    const foundVehicle =
      vehicleRes.status === "fulfilled" ? vehicleRes.value : null;
    const enrichedVehicle = foundVehicle
      ? {
          vehicleId: foundVehicle.id,
          make: foundVehicle.make,
          model: foundVehicle.model,
          licensePlate: foundVehicle.licensePlate,
          vehicleType: foundVehicle.type,
        }
      : contract.vehicle;

    const enrichedContract = {
      ...contract,
      driver: enrichedDriver,
      vehicle: enrichedVehicle,
    };

    return (
      <ContractDetailPage
        contract={enrichedContract}
        installments={
          installments.status === "fulfilled" ? installments.value : []
        }
        auditLogs={
          auditLogsRes.status === "fulfilled"
            ? auditLogsRes.value.items
            : []
        }
      />
    );
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.status === 404
          ? "Contrat introuvable."
          : `${error.status} — ${error.message}`
        : error instanceof Error
          ? error.message
          : "Erreur inconnue.";
    return (
      <DetailNotFound
        backHref="/contracts"
        backLabel="Retour aux contrats"
        message={message}
      />
    );
  }
}
