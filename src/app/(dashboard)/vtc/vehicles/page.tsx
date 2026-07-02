import { listAdminDrivers } from "@/features/drivers/application/api";
import { fullName } from "@/features/drivers/domain/admin-driver";
import { listVehicles } from "@/features/vehicles/application/api";
import { VehiclesListClient } from "@/features/vehicles/presentation/vehicles-list-client";

export const dynamic = "force-dynamic";

export default async function VtcVehiclesPage() {
  const [vehiclesRes, driversRes] = await Promise.allSettled([
    listVehicles({ limit: 100 }),
    listAdminDrivers(),
  ]);

  const { vehicles, total } =
    vehiclesRes.status === "fulfilled"
      ? vehiclesRes.value
      : { vehicles: [], total: 0 };

  const driverNames: Record<string, string> = {};
  const drivers = driversRes.status === "fulfilled" ? driversRes.value.drivers : [];
  for (const d of drivers) {
    driverNames[d.driverId] = fullName(d);
  }

  return (
    <VehiclesListClient
      vehicles={vehicles}
      total={total}
      driverNames={driverNames}
      drivers={drivers}
    />
  );
}
