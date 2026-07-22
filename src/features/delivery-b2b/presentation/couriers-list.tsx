"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bike, Info, Phone, Search, ShieldCheck, Star } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import type { AdminDriver, AdminDriverStatus } from "@/features/drivers/domain/admin-driver";

const STATUS_META: Record<AdminDriverStatus, { label: string; tone: "success" | "primary" | "warning" | "danger" | "neutral" | "info" }> = {
  ONLINE:    { label: "En ligne",       tone: "success" },
  AVAILABLE: { label: "Disponible",     tone: "success" },
  BUSY:      { label: "En course",      tone: "primary" },
  OFFLINE:   { label: "Hors ligne",     tone: "neutral" },
  PENDING:   { label: "En validation",  tone: "warning" },
  SUSPENDED: { label: "Suspendu",       tone: "danger"  },
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut : tous" },
  ...Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label })),
];

const VEHICLE_OPTIONS = [
  { value: "ALL", label: "Véhicule : tous" },
  { value: "MOTO",     label: "Moto" },
  { value: "TRICYCLE", label: "Tricycle" },
  { value: "STANDARD", label: "Voiture" },
  { value: "VAN",      label: "Van" },
];

export interface CouriersListPageProps {
  drivers: AdminDriver[];
  total: number;
}

export function CouriersListPage({ drivers, total }: CouriersListPageProps) {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("ALL");
  const [vehicleF, setVehicleF] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (q) {
        const hay = `${d.firstName} ${d.lastName} ${d.phoneNumber} ${d.vehicle?.vehicleType ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusF !== "ALL" && d.status !== statusF) return false;
      if (vehicleF !== "ALL" && d.vehicle?.vehicleType !== vehicleF) return false;
      return true;
    });
  }, [search, statusF, vehicleF, drivers]);

  const stats = useMemo(() => {
    const online = drivers.filter((d) => d.status === "ONLINE" || d.status === "AVAILABLE" || d.status === "BUSY").length;
    const busy = drivers.filter((d) => d.status === "BUSY").length;
    const suspended = drivers.filter((d) => d.status === "SUSPENDED").length;
    const avgRating = drivers.length > 0
      ? drivers.reduce((s, d) => s + (d.rating ?? 0), 0) / drivers.length
      : 0;
    return { online, busy, suspended, avgRating };
  }, [drivers]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2C"
        title="Livreurs"
        dataSource="live"
        dataSourceHint="GET /api/admin/drivers — tous les drivers de la plateforme. Stats livraison spécifiques à venir (GET /api/admin/delivery/couriers)."
        description="Flotte de livreurs — statut, note, véhicule. Lien vers la fiche VTC pour le détail complet."
      />

      {/* Bandeau info — données partielles */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800 dark:bg-sky-950/30">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <p className="text-xs text-sky-700 dark:text-sky-300">
          Données issues de <code className="font-mono">GET /api/admin/drivers</code> — commun VTC + livraison.
          Les stats propres livraison (nb livraisons, taux succès, revenus) nécessitent <code className="font-mono">GET /api/admin/delivery/couriers</code> (endpoint à créer côté backend).
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Actifs / Total"
          value={`${stats.online} / ${total}`}
          trend={{ value: `${stats.busy} en course`, direction: "flat" }}
          helper={`${total - stats.online} hors ligne`}
          icon={Bike}
          tone="success"
        />
        <StatCard
          label="Note moyenne"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "—"}
          trend={{ value: "★ sur 5", direction: "flat" }}
          helper="toutes courses confondues"
          icon={Star}
          tone="primary"
        />
        <StatCard
          label="Revenus du mois"
          value="—"
          trend={{ value: "endpoint manquant", direction: "flat" }}
          helper="GET /api/admin/delivery/couriers"
          icon={ShieldCheck}
          tone="secondary"
        />
        <StatCard
          label="Comptes suspendus"
          value={String(stats.suspended)}
          trend={{ value: "à réviser", direction: "flat" }}
          helper="motifs : SAV, KYC"
          icon={ShieldCheck}
          tone={stats.suspended > 0 ? "warning" : "neutral"}
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher (nom, téléphone, véhicule)"
            leftIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox options={STATUS_OPTIONS} value={statusF} onChange={setStatusF} className="sm:w-44" />
          <Combobox options={VEHICLE_OPTIONS} value={vehicleF} onChange={vehicleF === "ALL" ? setVehicleF : setVehicleF} className="sm:w-44" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Bike className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {drivers.length === 0 ? "Aucun driver chargé." : "Aucun driver ne correspond aux filtres."}
          </p>
        </Card>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => {
            const meta = STATUS_META[d.status] ?? { label: d.status, tone: "neutral" as const };
            const fullName = `${d.firstName} ${d.lastName}`;
            const vehicleLabel = d.vehicle
              ? `${d.vehicle.make} ${d.vehicle.model} · ${d.vehicle.licensePlate}`
              : "Véhicule inconnu";
            return (
              <Link key={d.driverId} href={`/vtc/drivers/${d.driverId}`}>
                <Card className="group cursor-pointer transition hover:border-[color:var(--primary)]/40 hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName} className="size-12 text-base" />
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-semibold text-[color:var(--foreground)] group-hover:text-[color:var(--primary)]">
                            {fullName}
                          </span>
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {d.category ?? d.driverType ?? "—"}
                            {d.isOnline === true ? " · 🟢 GPS actif" : ""}
                          </span>
                        </div>
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[color:var(--muted-foreground)]">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {d.phoneNumber}
                      </span>
                      <span>·</span>
                      <span className="truncate">{vehicleLabel}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-[color:var(--muted)]/40 p-3 text-center">
                      <div className="flex flex-col">
                        <span className="text-xs text-[color:var(--muted-foreground)]">Note</span>
                        <span className="text-sm font-semibold text-[color:var(--foreground)]">
                          ★ {d.rating?.toFixed(1) ?? "—"}
                        </span>
                      </div>
                      <div className="flex flex-col border-x border-[color:var(--border)]">
                        <span className="text-xs text-[color:var(--muted-foreground)]">Courses</span>
                        <span className="text-sm font-semibold text-[color:var(--foreground)]">
                          {d.totalRides ?? "—"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-[color:var(--muted-foreground)]">Livraisons</span>
                        <span className="text-sm font-semibold text-[color:var(--muted-foreground)]">—</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-xs">
                      <span className="text-[color:var(--muted-foreground)]">Revenu livraison / mois</span>
                      <span className="font-semibold text-[color:var(--muted-foreground)]">—</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
