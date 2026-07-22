"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  PackageCheck,
  PackageOpen,
  Truck,
  XCircle,
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
import { formatRelative, formatXof } from "@/shared/lib/format";
import {
  IN_FLIGHT_DELIVERY_STATUSES,
  REVENUE_DELIVERY_STATUSES,
  deliveryStatusMeta,
  type AdminDelivery,
} from "@/features/delivery-b2c/domain/delivery";

export interface DeliveryB2bDashboardPageProps {
  deliveries: AdminDelivery[];
  total: number;
}

export function DeliveryB2bDashboardPage({
  deliveries,
  total,
}: DeliveryB2bDashboardPageProps) {
  // ── KPIs calculés depuis la liste réelle ────────────────────────────────
  let inFlight = 0;
  let delivered = 0;
  let pending = 0;
  let failedOrCancelled = 0;
  let revenueDelivered = 0;
  let revenueInFlight = 0;

  for (const d of deliveries) {
    if (IN_FLIGHT_DELIVERY_STATUSES.has(d.status)) {
      inFlight += 1;
      revenueInFlight += d.finalPrice || d.estimatedPrice;
    }
    if (REVENUE_DELIVERY_STATUSES.has(d.status)) {
      delivered += 1;
      revenueDelivered += d.finalPrice || d.estimatedPrice;
    }
    if (d.status === "PENDING") pending += 1;
    if (d.status === "FAILED" || d.status === "CANCELLED") failedOrCancelled += 1;
  }

  // 6 dernières commandes (déjà triées desc par le backend)
  const recent = deliveries.slice(0, 6);

  // Alertes construites sur données réelles
  const alerts: { tone: "danger" | "warning" | "info"; title: string; description: string }[] = [];
  if (failedOrCancelled > 0) {
    alerts.push({
      tone: "danger",
      title: `${failedOrCancelled} commande${failedOrCancelled > 1 ? "s" : ""} en échec ou annulée${failedOrCancelled > 1 ? "s" : ""}`,
      description: "Consultez la liste pour identifier les motifs.",
    });
  }
  if (pending > 0) {
    alerts.push({
      tone: "warning",
      title: `${pending} commande${pending > 1 ? "s" : ""} en attente de driver`,
      description: "Aucun livreur assigné — dispatch en cours.",
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      tone: "info",
      title: "Aucune alerte opérationnelle",
      description: "Toutes les commandes sont en cours de traitement normalement.",
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Livraison B2C — temps réel"
        title="Tableau de bord livraison"
        dataSource="live"
        dataSourceHint="Agrégé depuis GET /api/admin/delivery — commandes individuelles passager → driver."
        description="Vue d'ensemble des commandes en cours, du revenu et des alertes opérationnelles."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
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

      {/* ── KPI tiles ──────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total chargé"
          value={String(total)}
          trend={{ value: "toutes périodes", direction: "flat" }}
          helper={`${delivered} livrées · ${inFlight} en cours`}
          icon={PackageOpen}
          tone="primary"
        />
        <StatCard
          label="Livrées"
          value={String(delivered)}
          trend={{ value: formatXof(revenueDelivered), direction: "up" }}
          helper="revenue encaissé"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="En cours"
          value={String(inFlight)}
          trend={{ value: formatXof(revenueInFlight), direction: "flat" }}
          helper="revenus en transit"
          icon={Truck}
          tone="primary"
        />
        <StatCard
          label="Échecs / annulées"
          value={String(failedOrCancelled)}
          trend={{ value: pending > 0 ? `${pending} sans driver` : "aucune en attente", direction: failedOrCancelled > 0 ? "down" : "flat" }}
          helper="FAILED + CANCELLED"
          icon={XCircle}
          tone={failedOrCancelled > 0 ? "warning" : "neutral"}
        />
      </section>

      {/* ── Activité récente + Alertes ─────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-5 text-[color:var(--primary)]" />
                <CardTitle>Activité récente</CardTitle>
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
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm italic text-[color:var(--muted-foreground)]">
                Aucune commande chargée.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[color:var(--border)]">
                {recent.map((d) => {
                  const meta = deliveryStatusMeta(d.status);
                  return (
                    <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                          <PackageOpen className="size-4" />
                        </span>
                        <div className="flex flex-col leading-tight">
                          <span className="font-mono text-xs font-semibold text-[color:var(--foreground)]">
                            {d.orderNumber}
                          </span>
                          <span className="text-sm text-[color:var(--foreground)]">
                            {d.passenger?.name ?? "—"}
                            {d.driver ? ` → ${d.driver.name}` : " · sans driver"}
                          </span>
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {formatXof(d.finalPrice || d.estimatedPrice)}
                            {" · "}
                            {formatRelative(d.createdAt)}
                          </span>
                        </div>
                      </div>
                      <Link href={`/delivery-b2b/shipments/${d.id}`}>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
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
              {alerts.map((a, i) => {
                const COLORS = {
                  danger: "bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
                  warning: "bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
                  info: "bg-[color:var(--primary-soft)] text-[color:var(--primary)]",
                } as const;
                const ICONS = {
                  danger: AlertTriangle,
                  warning: Clock,
                  info: CheckCircle2,
                } as const;
                const Icon = ICONS[a.tone];
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${COLORS[a.tone]}`}>
                      <Icon className="size-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[color:var(--foreground)]">{a.title}</p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">{a.description}</p>
                      {a.tone !== "info" && (
                        <Link
                          href="/delivery-b2b/shipments"
                          className="mt-1 inline-block text-xs font-medium text-[color:var(--primary)] hover:underline"
                        >
                          Voir dans la liste →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* ── Sections B2B — backend manquant ────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-dashed opacity-70">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Tournées B2B</CardTitle>
              </div>
              <Badge tone="neutral">Bientôt</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Nécessite <code className="font-mono text-xs">GET /api/admin/delivery/rounds</code>.
              Les tournées (création, suivi, arrêts) seront visibles ici une fois l'endpoint admin disponible.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed opacity-70">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bike className="size-5 text-[color:var(--muted-foreground)]" />
                <CardTitle className="text-[color:var(--muted-foreground)]">Top livreurs</CardTitle>
              </div>
              <Badge tone="neutral">Bientôt</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Nécessite <code className="font-mono text-xs">GET /api/admin/delivery/couriers</code>.
              Classement par livraisons, note et revenus mensuels à venir.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
