"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Bike,
  Clock,
  Gauge,
  PackageCheck,
  PackageOpen,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatXof } from "@/shared/lib/format";
import {
  DASHBOARD_KPIS,
  PLANNED_ROUNDS,
  SHIPMENTS,
  COURIERS,
} from "../domain/mock";
import {
  COURIER_STATUS_META,
  SHIPMENT_STATUS_META,
} from "../domain/types";

export function DeliveryB2bDashboardPage() {
  const kpis = DASHBOARD_KPIS;
  const onlineCouriers = COURIERS.filter((c) => c.status === "ONLINE" || c.status === "BUSY");
  const recentShipments = SHIPMENTS.slice(0, 6);
  const topCouriers = [...COURIERS]
    .sort((a, b) => b.totalDeliveries - a.totalDeliveries)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Livraison B2B — temps quasi-réel"
        title="Tableau de bord livraison"
        dataSource="mock"
        dataSourceHint="Module Livraison B2B en design — données de démo. Sera branché sur l'API quand les endpoints seront livrés."
        description="Pulse du jour — commandes, flotte de livreurs, revenus et SLA."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Banknote className="size-4" />
              Export comptable
            </Button>
            <Link
              href="/delivery-b2b/shipments"
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-3 text-xs font-medium text-[color:var(--primary-foreground)] transition hover:opacity-90"
            >
              Voir toutes les livraisons
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Commandes du jour"
          value={String(kpis.todayShipments)}
          trend={{
            value: `+${kpis.revenueDeltaPct.toFixed(1)} % vs hier`,
            direction: "up",
          }}
          helper={`${kpis.delivered} livrées · ${kpis.inTransit} en route`}
          icon={PackageOpen}
          tone="primary"
        />
        <StatCard
          label="SLA à l'heure"
          value={`${kpis.onTimeRate.toFixed(1)} %`}
          trend={{ value: "vs cible 90 %", direction: "up" }}
          helper={`Délai moyen : ${kpis.averageDeliveryMinutes} min`}
          icon={Gauge}
          tone="success"
        />
        <StatCard
          label="Revenus du jour"
          value={formatXof(kpis.revenueFcfaToday)}
          trend={{
            value: `+${kpis.revenueDeltaPct.toFixed(1)} %`,
            direction: "up",
          }}
          helper="commission incluse"
          icon={TrendingUp}
          tone="secondary"
        />
        <StatCard
          label="Livreurs actifs"
          value={`${kpis.activeCouriers} / ${kpis.totalCouriers}`}
          trend={{ value: `${onlineCouriers.length} en ligne`, direction: "flat" }}
          helper={`Top zone : ${kpis.topZone}`}
          icon={Bike}
          tone="success"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-5 text-[color:var(--primary)]" />
                <CardTitle>Activité — dernières commandes</CardTitle>
              </div>
              <Link
                href="/delivery-b2b/shipments"
                className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[color:var(--foreground)]/30 px-3 text-xs font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]/60 hover:bg-[color:var(--muted)]"
              >
                Tout voir
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-[color:var(--border)]">
              {recentShipments.map((s) => {
                const meta = SHIPMENT_STATUS_META[s.status];
                return (
                  <li
                    key={s.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                        <PackageOpen className="size-4" />
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="font-mono text-xs text-[color:var(--foreground)]">
                          {s.reference}
                        </span>
                        <span className="text-sm font-medium text-[color:var(--foreground)]">
                          {s.senderName} → {s.dropoff.city}
                        </span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {s.distanceKm.toFixed(1)} km · {formatXof(s.price)}
                          {s.courierName ? ` · ${s.courierName}` : ""}
                        </span>
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[color:var(--warning)]" />
              <CardTitle>Alertes opérationnelles</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              <AlertItem
                tone="danger"
                title={`${kpis.failed} livraisons en échec aujourd'hui`}
                description="Destinataire absent (3 cas), adresse introuvable (4 cas)."
                action="Relancer"
              />
              <AlertItem
                tone="warning"
                title={`${kpis.pendingPickup} commandes en attente de livreur`}
                description="Plus vieille demande il y a 38 min sur Calavi-Centre."
                action="Forcer dispatch"
              />
              <AlertItem
                tone="info"
                title="Pic d'activité prévu 17h-19h"
                description="Trafic dense Cotonou-Calavi — pré-positionner 4 motos."
                action="Notifier livreurs"
              />
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Tournées en cours</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {PLANNED_ROUNDS.map((r) => {
                const done = r.stops.filter((s) => s.status === "DONE").length;
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {r.name}
                      </span>
                      <Badge tone="primary">{r.vehicle}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[color:var(--muted-foreground)]">
                      <span>{r.courierName}</span>
                      <span>
                        {done}/{r.stops.length} stops · {r.totalDistanceKm.toFixed(0)} km
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--muted)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--primary)] transition-all"
                        style={{
                          width: `${(done / r.stops.length) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bike className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Top livreurs du mois</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {topCouriers.map((c, i) => {
                const meta = COURIER_STATUS_META[c.status];
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-sm font-semibold text-[color:var(--primary)]">
                      #{i + 1}
                    </span>
                    <div className="flex flex-1 flex-col leading-tight">
                      <span className="text-sm font-medium text-[color:var(--foreground)]">
                        {c.fullName}
                      </span>
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        {c.totalDeliveries} livraisons · ★ {c.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-xs font-semibold text-[color:var(--foreground)]">
                        {formatXof(c.monthRevenueFcfa)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AlertItem({
  tone,
  title,
  description,
  action,
}: {
  tone: "danger" | "warning" | "info";
  title: string;
  description: string;
  action: string;
}) {
  const COLORS = {
    danger: "bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
    warning: "bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
    info: "bg-[color:var(--primary-soft)] text-[color:var(--primary)]",
  } as const;
  const ICONS = {
    danger: AlertTriangle,
    warning: Clock,
    info: TrendingUp,
  } as const;
  const Icon = ICONS[tone];
  return (
    <li className="flex items-start gap-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${COLORS[tone]}`}>
        <Icon className="size-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-[color:var(--foreground)]">
          {title}
        </p>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          {description}
        </p>
        <button className="mt-1 cursor-pointer text-xs font-medium text-[color:var(--primary)] hover:underline">
          {action} →
        </button>
      </div>
    </li>
  );
}
