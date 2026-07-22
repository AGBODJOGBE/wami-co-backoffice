import { requirePermission } from "@/features/auth/application/dal";
import { listAdminDrivers, listOnlineDrivers } from "@/features/drivers/application/api";
import { FleetMonitoringClient } from "@/features/drivers/presentation/fleet-monitoring-client";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  await requirePermission("fleet.monitor");

  const [driversRes, onlineRes] = await Promise.allSettled([
    listAdminDrivers(),
    listOnlineDrivers(),
  ]);

  const allDrivers = driversRes.status === "fulfilled" ? driversRes.value.drivers : [];
  const onlineIds = new Set(
    onlineRes.status === "fulfilled"
      ? onlineRes.value.drivers.map((d) => d.driverId)
      : [],
  );

  // Enrichit isOnline depuis les données temps-réel
  const drivers = allDrivers
    .filter((d) => d.isApproved && (d.isVehicleOwner === true || d.isVehicleOwner === undefined))
    .map((d) => ({
      ...d,
      isOnline: onlineIds.size > 0 ? onlineIds.has(d.driverId) : d.isOnline,
    }));

  // totalRides est déjà dans AdminDriver — on passe une Map vide
  // (la Map permet une surcharge future sans changer le composant)
  const rideCountByDriverId = new Map<string, number>();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="VTC"
        title="Suivi de la flotte"
        dataSource="live"
        description={`${drivers.length} pilote${drivers.length > 1 ? "s" : ""} approuvé${drivers.length > 1 ? "s" : ""} · données en temps réel.`}
      />
      <FleetMonitoringClient
        drivers={drivers}
        rideCountByDriverId={rideCountByDriverId}
      />
    </div>
  );
}
