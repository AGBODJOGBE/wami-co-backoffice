import { listContracts } from "@/features/contracts/application/api";
import { ContractsPage } from "@/features/contracts/presentation/contracts-page";
import { listAdminDrivers } from "@/features/drivers/application/api";
import { listVehicles } from "@/features/vehicles/application/api";

export const dynamic = "force-dynamic";

export default async function ContractsRoute() {
  const [contractsRes, driversRes, vehiclesRes] = await Promise.allSettled([
    listContracts({ limit: 100 }),
    listAdminDrivers(),
    listVehicles({ ownership: "PLATFORM", limit: 200 }),
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

  const drivers =
    driversRes.status === "fulfilled" ? driversRes.value.drivers : [];
  const vehicles =
    vehiclesRes.status === "fulfilled" ? vehiclesRes.value.vehicles : [];

  return (
    <ContractsPage
      contracts={contracts}
      total={total}
      error={error}
      drivers={drivers}
      vehicles={vehicles}
    />
  );
}
