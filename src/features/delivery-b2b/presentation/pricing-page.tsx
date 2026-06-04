"use client";

import {
  Banknote,
  Clock,
  Gauge,
  Layers,
  MapPinned,
  Plus,
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
  PRIORITY_META,
  type ShipmentPriority,
} from "../domain/types";
import { PRICING_ZONES, PRIORITY_MULTIPLIERS } from "../domain/mock";

export function PricingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Tarification"
        dataSource="mock"
        description="Grille par zone et tranche de distance + multiplicateurs de priorité. Versionné — chaque modification crée une nouvelle version active."
        actions={
          <Button size="sm">
            <Plus className="size-4" />
            Nouvelle zone
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Zones tarifaires"
          value={String(PRICING_ZONES.length)}
          trend={{ value: "version active", direction: "flat" }}
          helper="couvrant 7 villes"
          icon={MapPinned}
          tone="primary"
        />
        <StatCard
          label="Tarif moyen / colis"
          value={formatXof(3_240)}
          trend={{ value: "+2 % vs version −1", direction: "up" }}
          helper="tous types confondus"
          icon={Banknote}
          tone="secondary"
        />
        <StatCard
          label="SLA Express"
          value="90 min"
          trend={{ value: "respect 92 %", direction: "up" }}
          helper="multiplicateur ×1,45"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="SLA Urgent"
          value="45 min"
          trend={{ value: "respect 88 %", direction: "flat" }}
          helper="multiplicateur ×2,1"
          icon={Gauge}
          tone="success"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {PRICING_ZONES.map((z) => (
          <Card key={z.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="size-5 text-[color:var(--primary)]" />
                  <CardTitle>{z.name}</CardTitle>
                </div>
                <Badge tone="info">×{z.baseMultiplier.toFixed(2)} de base</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    <th className="pb-2">Distance</th>
                    <th className="pb-2 text-right">Forfait base</th>
                    <th className="pb-2 text-right">+ /kg</th>
                  </tr>
                </thead>
                <tbody>
                  {z.brackets.map((b, i) => (
                    <tr
                      key={i}
                      className="border-b border-[color:var(--border)] last:border-0"
                    >
                      <td className="py-2">≤ {b.upToKm} km</td>
                      <td className="py-2 text-right font-medium">
                        {formatXof(b.baseFare)}
                      </td>
                      <td className="py-2 text-right text-[color:var(--muted-foreground)]">
                        {formatXof(b.perKgRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm">
                  Modifier
                </Button>
                <Button variant="outline" size="sm">
                  Désactiver
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="size-5 text-[color:var(--primary)]" />
            <CardTitle>Priorités & SLA</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {PRIORITY_MULTIPLIERS.map((p) => {
              const m = PRIORITY_META[p.priority as ShipmentPriority];
              return (
                <div
                  key={p.priority}
                  className="flex flex-col gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge tone={m.tone}>{m.label}</Badge>
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      ×{p.multiplier.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-[color:var(--foreground)]">
                      {p.slaMinutes}
                    </span>
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      min SLA
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    Le tarif final est multiplié par {p.multiplier.toFixed(2)}{" "}
                    et l'engagement de livraison est de {p.slaMinutes} min
                    après la collecte.
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
