import { listAdminDrivers } from "@/features/drivers/application/api";
import { fullName } from "@/features/drivers/domain/admin-driver";
import { listVehicles } from "@/features/vehicles/application/api";
import { VehiclesListClient } from "@/features/vehicles/presentation/vehicles-list-client";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function VtcVehiclesPage() {
  try {
    // Fan-out: vehicles + admin drivers (for the assigned-driver column).
    const [vehiclesRes, driversRes] = await Promise.allSettled([
      listVehicles({ limit: 100 }),
      listAdminDrivers(),
    ]);

    if (vehiclesRes.status === "rejected") {
      throw vehiclesRes.reason;
    }

    const driverNames: Record<string, string> = {};
    if (driversRes.status === "fulfilled") {
      for (const d of driversRes.value.drivers) {
        driverNames[d.driverId] = fullName(d);
      }
    }

    return (
      <VehiclesListClient
        vehicles={vehiclesRes.value.vehicles}
        total={vehiclesRes.value.total}
        driverNames={driverNames}
      />
    );
  } catch (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Référentiel VTC"
          title="Véhicules"
          dataSource="live"
          dataSourceHint="Erreur de chargement depuis l'API."
        />
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger la liste des véhicules :{" "}
            {error instanceof Error ? error.message : "erreur inconnue"}
          </p>
        </Card>
      </div>
    );
  }
}
