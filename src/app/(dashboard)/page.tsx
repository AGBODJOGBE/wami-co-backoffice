import { Car, CreditCard, Package, Users } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { RecentRidesTable } from "@/features/dashboard/presentation/components/recent-rides-table";
import { DashboardMapPanel } from "@/features/dashboard/presentation/dashboard-map-panel";
import type { LivePin } from "@/features/dashboard/presentation/benin-map-wrapper";
import {
  computeTrend,
  getDashboardSnapshot,
} from "@/features/dashboard/application/api";
import { fullName } from "@/features/drivers/domain/admin-driver";
import { formatXof } from "@/shared/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const snapshot = await getDashboardSnapshot();

  const livePins: LivePin[] = snapshot.online.drivers
    .filter(
      (d) =>
        typeof d.latitude === "number" &&
        typeof d.longitude === "number" &&
        d.latitude !== 0 &&
        d.longitude !== 0,
    )
    .map((d) => ({
      lat: d.latitude,
      lng: d.longitude,
      name: fullName(d) || `Driver #${d.driverId.slice(0, 8)}`,
      status: d.isInRide ? "BUSY" : "AVAILABLE",
    }));

  const ridesTrend = computeTrend(
    snapshot.today.kpi.total,
    snapshot.yesterday.kpi.total,
  );
  const revenueTrend = computeTrend(
    snapshot.today.kpi.revenue,
    snapshot.yesterday.kpi.revenue,
  );
  const deliveriesTrend = computeTrend(
    snapshot.deliveries.today.total,
    snapshot.deliveries.yesterday.total,
  );

  const onlineCount = snapshot.online.drivers.length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Aujourd'hui — Cotonou & Calavi"
        title="Tableau de bord"
        dataSource="live"
        dataSourceHint="KPIs courses + livraisons B2C + revenus + drivers en ligne + validations en attente : tous live."
        description="Vue temps quasi-réel des opérations VTC + livraison de la plateforme."
        actions={
          <>
            <Button variant="outline" size="sm">
              Exporter
            </Button>
            <Button size="sm">Voir les alertes</Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Courses du jour"
          value={
            snapshot.today.error
              ? "—"
              : snapshot.today.kpi.total.toLocaleString("fr-FR")
          }
          trend={
            snapshot.today.error
              ? { value: "API indisponible", direction: "flat" }
              : { value: ridesTrend.label, direction: ridesTrend.direction }
          }
          helper={
            snapshot.today.error
              ? snapshot.today.error
              : `dont ${snapshot.today.kpi.inProgress} en cours`
          }
          icon={Car}
          tone="primary"
        />
        <StatCard
          label="Livraisons"
          value={
            snapshot.deliveries.error
              ? "—"
              : snapshot.deliveries.today.total.toLocaleString("fr-FR")
          }
          trend={
            snapshot.deliveries.error
              ? { value: "API indisponible", direction: "flat" }
              : {
                  value: deliveriesTrend.label,
                  direction: deliveriesTrend.direction,
                }
          }
          helper={
            snapshot.deliveries.error
              ? snapshot.deliveries.error
              : `${snapshot.deliveries.today.inFlight} en cours · ${snapshot.deliveries.today.failed} échec${snapshot.deliveries.today.failed > 1 ? "s" : ""}`
          }
          icon={Package}
          tone="warning"
        />
        <StatCard
          label="Drivers en ligne"
          value={
            snapshot.online.error ? "—" : onlineCount.toLocaleString("fr-FR")
          }
          trend={{
            value: snapshot.online.error ? "API indisponible" : "live",
            direction: "flat",
          }}
          helper={
            snapshot.online.error
              ? snapshot.online.error
              : "positions GPS temps réel"
          }
          icon={Users}
          tone="success"
        />
        <StatCard
          label="Revenus du jour"
          value={
            snapshot.today.error
              ? "—"
              : formatXof(snapshot.today.kpi.revenue)
          }
          trend={
            snapshot.today.error
              ? { value: "API indisponible", direction: "flat" }
              : { value: revenueTrend.label, direction: revenueTrend.direction }
          }
          helper={
            snapshot.today.error
              ? "Indisponible"
              : "courses terminées · commission incluse"
          }
          icon={CreditCard}
          tone="secondary"
        />
      </section>

      <DashboardMapPanel
        livePins={livePins}
        isLive={!snapshot.online.error}
        liveError={snapshot.online.error}
        pendingDrivers={snapshot.pending.drivers}
        pendingError={snapshot.pending.error}
      />

      <RecentRidesTable
        rides={snapshot.today.rides}
        error={snapshot.today.error}
      />
    </div>
  );
}
