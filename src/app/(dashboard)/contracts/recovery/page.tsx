import { requirePermission } from "@/features/auth/application/dal";
import { listContractsInRecovery, getContractKpis } from "@/features/contracts/application/api";
import { listAdminDrivers } from "@/features/drivers/application/api";
import { listVehicles } from "@/features/vehicles/application/api";
import { RecoveryPage } from "@/features/contracts/presentation/recovery-page";

export const dynamic = "force-dynamic";

export default async function ContractsRecoveryRoute() {
  await requirePermission("contract.view_all");

  const [recoveryRes, driversRes, vehiclesRes, kpisRes] = await Promise.allSettled([
    listContractsInRecovery(),
    listAdminDrivers(),
    listVehicles({ ownership: "PLATFORM" }),
    getContractKpis(),
  ]);

  const { contracts: raw = [], totalNonReconnu = 0, totalRecouvre = 0 } =
    recoveryRes.status === "fulfilled" ? recoveryRes.value : {};

  // Enrichir les stubs driver / vehicle avec les vraies données
  const drivers  = driversRes.status  === "fulfilled" ? driversRes.value.drivers        : [];
  const vehicles = vehiclesRes.status === "fulfilled" ? vehiclesRes.value.vehicles       : [];
  const driverMap  = new Map(drivers.map((d) => [d.driverId, d]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  const contracts = raw.map((c) => {
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
    <RecoveryPage
      contracts={contracts}
      totalNonReconnu={totalNonReconnu}
      totalRecouvre={totalRecouvre}
      kpis={kpis}
    />
  );
}
