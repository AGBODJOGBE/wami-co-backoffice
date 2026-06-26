import { listContracts, getContractKpis } from "@/features/contracts/application/api";
import { ContractsPage } from "@/features/contracts/presentation/contracts-page";
import { listAdminDrivers, listPendingDrivers } from "@/features/drivers/application/api";
import { listVehicles } from "@/features/vehicles/application/api";

export const dynamic = "force-dynamic";

export default async function ContractsRoute() {
  const [contractsRes, driversRes, pendingRes, vehiclesRes, kpisRes] =
    await Promise.allSettled([
      listContracts({ limit: 100 }),
      listAdminDrivers(),
      listPendingDrivers(),
      listVehicles({ ownership: "PLATFORM", limit: 200 }),
      getContractKpis(),
    ]);

  const contracts =
    contractsRes.status === "fulfilled" ? contractsRes.value.items : [];
  const total =
    contractsRes.status === "fulfilled" ? contractsRes.value.total : 0;
  const error =
    contractsRes.status === "rejected"
      ? contractsRes.reason instanceof Error
        ? contractsRes.reason.message
        : "Impossible de charger les contrats."
      : undefined;

  const rawDrivers =
    driversRes.status === "fulfilled" ? driversRes.value.drivers : [];
  const pendingDrivers =
    pendingRes.status === "fulfilled" ? pendingRes.value.drivers : [];

  // Enrichir chaque driver avec isDocumentsVerified depuis /drivers/pending
  const docsVerifiedMap = new Map(
    pendingDrivers.map((p) => [p.driverId, p.isDocumentsVerified]),
  );
  const drivers = rawDrivers.map((d) => ({
    ...d,
    isDocumentsVerified: docsVerifiedMap.get(d.driverId) ?? false,
  }));

  const vehicles =
    vehiclesRes.status === "fulfilled" ? vehiclesRes.value.vehicles : [];

  // Enrich contract stubs with real driver/vehicle data fetched in parallel
  const driverMap = new Map(rawDrivers.map((d) => [d.driverId, d]));
  // VehicleSummary uses `id` as the primary key
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const enrichedContracts = contracts.map((c) => {
    const d = driverMap.get(c.driver.driverId);
    const v = vehicleMap.get(c.vehicle.vehicleId);
    return {
      ...c,
      driver: d
        ? { driverId: d.driverId, firstName: d.firstName, lastName: d.lastName, phoneNumber: d.phoneNumber }
        : c.driver,
      vehicle: v
        ? { vehicleId: v.id, make: v.make, model: v.model, licensePlate: v.licensePlate, vehicleType: v.type }
        : c.vehicle,
    };
  });

  const kpis = kpisRes.status === "fulfilled" ? kpisRes.value : undefined;

  return (
    <ContractsPage
      contracts={enrichedContracts}
      total={total}
      error={error}
      drivers={drivers}
      vehicles={vehicles}
      kpis={kpis}
    />
  );
}
