"use client";

import {
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Plus,
  Route as RouteIcon,
  Truck,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
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
import { VEHICLE_LABELS } from "../domain/types";
import { PLANNED_ROUNDS } from "../domain/mock";

export function PlanningPage() {
  const totalStops = PLANNED_ROUNDS.reduce((s, r) => s + r.stops.length, 0);
  const doneStops = PLANNED_ROUNDS.reduce(
    (s, r) => s + r.stops.filter((x) => x.status === "DONE").length,
    0,
  );
  const totalRevenue = PLANNED_ROUNDS.reduce(
    (s, r) => s + r.estimatedRevenue,
    0,
  );
  const totalKm = PLANNED_ROUNDS.reduce((s, r) => s + r.totalDistanceKm, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Planning du jour"
        dataSource="mock"
        description="Tournées en cours et programmées — assignation, ordre des stops, ETA."
        actions={
          <Button size="sm">
            <Plus className="size-4" />
            Nouvelle tournée
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tournées du jour"
          value={String(PLANNED_ROUNDS.length)}
          trend={{ value: "actives", direction: "flat" }}
          helper={`${PLANNED_ROUNDS.filter((r) => r.stops.some((s) => s.status === "PENDING")).length} en cours`}
          icon={RouteIcon}
          tone="primary"
        />
        <StatCard
          label="Stops réalisés"
          value={`${doneStops} / ${totalStops}`}
          trend={{
            value: `${Math.round((doneStops / totalStops) * 100)} %`,
            direction: "up",
          }}
          helper="taux d'avancement"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Distance cumulée"
          value={`${totalKm.toFixed(0)} km`}
          trend={{ value: "voiture+moto", direction: "flat" }}
          helper="estimée selon ordre stops"
          icon={Truck}
          tone="secondary"
        />
        <StatCard
          label="Revenu estimé"
          value={formatXof(totalRevenue)}
          trend={{ value: "à toucher aujourd'hui", direction: "up" }}
          helper="hors imprévus"
          icon={Truck}
          tone="warning"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {PLANNED_ROUNDS.map((r) => {
          const done = r.stops.filter((s) => s.status === "DONE").length;
          return (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <Badge tone="primary">{VEHICLE_LABELS[r.vehicle]}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={r.courierName}
                      className="size-8 text-xs"
                    />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium">
                        {r.courierName}
                      </span>
                      <span className="text-[10px] text-[color:var(--muted-foreground)]">
                        {r.zone}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="text-[color:var(--muted-foreground)]">
                    {done}/{r.stops.length} stops
                  </span>
                  <span className="font-semibold">
                    {formatXof(r.estimatedRevenue)}
                  </span>
                </div>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[color:var(--muted)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--primary)] transition-all"
                    style={{ width: `${(done / r.stops.length) * 100}%` }}
                  />
                </div>

                <ol className="relative ml-3 flex flex-col gap-3 border-l border-[color:var(--border)] pl-4">
                  {r.stops.map((s, i) => (
                    <li key={i} className="relative">
                      <span
                        className={
                          "absolute -left-[19px] flex size-3 items-center justify-center rounded-full border-2 border-[color:var(--background)] " +
                          (s.status === "DONE"
                            ? "bg-[color:var(--success)]"
                            : "bg-[color:var(--warning)]")
                        }
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-[color:var(--foreground)]">
                            {s.type === "PICKUP" ? "Collecte" : "Livraison"} ·{" "}
                            <span className="font-mono">{s.reference}</span>
                          </span>
                          <span className="text-[10px] text-[color:var(--muted-foreground)]">
                            {s.scheduledAt}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--muted-foreground)]">
                          <MapPin className="size-2.5" />
                          {s.address}, {s.city}
                        </span>
                        {s.status === "PENDING" ? (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[color:var(--warning)]">
                            <Clock className="size-2.5" />à venir
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[color:var(--success)]">
                            <CheckCircle2 className="size-2.5" />
                            réalisé
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                  <li className="relative">
                    <Circle className="absolute -left-[19px] size-3 text-[color:var(--muted-foreground)]" />
                    <span className="text-[10px] text-[color:var(--muted-foreground)]">
                      Fin prévue · 16:00
                    </span>
                  </li>
                </ol>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Réordonner
                  </Button>
                  <Button variant="outline" size="sm">
                    Voir sur la carte
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
