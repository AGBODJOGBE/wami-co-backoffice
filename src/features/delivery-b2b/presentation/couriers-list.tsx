"use client";

import { useMemo, useState } from "react";
import {
  Bike,
  Download,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatXof } from "@/shared/lib/format";
import {
  COURIER_STATUS_META,
  VEHICLE_LABELS,
  type Courier,
  type CourierStatus,
  type CourierVehicle,
} from "../domain/types";
import { COURIERS } from "../domain/mock";
import { CourierDetailDrawer } from "./courier-detail-drawer";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut : tous" },
  ...(Object.keys(COURIER_STATUS_META) as CourierStatus[]).map((s) => ({
    value: s,
    label: COURIER_STATUS_META[s].label,
  })),
];

const VEHICLE_OPTIONS = [
  { value: "ALL", label: "Véhicule : tous" },
  ...(Object.keys(VEHICLE_LABELS) as CourierVehicle[]).map((v) => ({
    value: v,
    label: VEHICLE_LABELS[v],
  })),
];

export function CouriersListPage() {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("ALL");
  const [vehicleF, setVehicleF] = useState("ALL");
  const [target, setTarget] = useState<Courier | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COURIERS.filter((c) => {
      if (q) {
        const hay = `${c.fullName} ${c.phone} ${c.city} ${c.zonesCovered.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusF !== "ALL" && c.status !== statusF) return false;
      if (vehicleF !== "ALL" && !c.vehicles.includes(vehicleF as CourierVehicle))
        return false;
      return true;
    });
  }, [search, statusF, vehicleF]);

  const stats = useMemo(() => {
    const online = COURIERS.filter((c) => c.status === "ONLINE" || c.status === "BUSY").length;
    const busy = COURIERS.filter((c) => c.status === "BUSY").length;
    const suspended = COURIERS.filter((c) => c.status === "SUSPENDED").length;
    const monthRevenue = COURIERS.reduce((s, c) => s + c.monthRevenueFcfa, 0);
    return { online, busy, suspended, monthRevenue };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Livreurs"
        dataSource="mock"
        description="Gestion de la flotte de livreurs B2B — statut, performance, paie."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button size="sm">
              <Plus className="size-4" />
              Inviter un livreur
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Livreurs en ligne"
          value={`${stats.online} / ${COURIERS.length}`}
          trend={{ value: `${stats.busy} en course`, direction: "flat" }}
          helper={`${COURIERS.length - stats.online} hors ligne`}
          icon={Bike}
          tone="success"
        />
        <StatCard
          label="Note moyenne"
          value={(
            COURIERS.reduce((s, c) => s + c.rating, 0) / COURIERS.length
          ).toFixed(2)}
          trend={{ value: "★ sur 5", direction: "flat" }}
          helper="basé sur les avis clients"
          icon={Star}
          tone="primary"
        />
        <StatCard
          label="Revenu cumulé du mois"
          value={formatXof(stats.monthRevenue)}
          trend={{ value: "à reverser", direction: "flat" }}
          helper="net après commission"
          icon={ShieldCheck}
          tone="secondary"
        />
        <StatCard
          label="Comptes suspendus"
          value={String(stats.suspended)}
          trend={{ value: "à réviser", direction: "flat" }}
          helper="motifs : SAV, KYC"
          icon={ShieldCheck}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher (nom, téléphone, zone)"
            leftIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={statusF}
            onChange={setStatusF}
            className="sm:w-44"
          />
          <Combobox
            options={VEHICLE_OPTIONS}
            value={vehicleF}
            onChange={setVehicleF}
            className="sm:w-44"
          />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const meta = COURIER_STATUS_META[c.status];
          return (
            <Card
              key={c.id}
              className="group cursor-pointer transition hover:border-[color:var(--primary)]/40 hover:shadow-md"
              onClick={() => setTarget(c)}
            >
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.fullName} className="size-12 text-base" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {c.fullName}
                      </span>
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        {c.city} · {c.lastActiveAgo}
                      </span>
                    </div>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-[color:var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {c.phone}
                  </span>
                  <span>·</span>
                  <span>
                    {c.vehicles.map((v) => VEHICLE_LABELS[v]).join(", ")}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-[color:var(--muted)]/40 p-3 text-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      Note
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      ★ {c.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[color:var(--border)]">
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      Livraisons
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      {c.totalDeliveries}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      Succès
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      {c.successRate.toFixed(0)} %
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-xs">
                  <span className="text-[color:var(--muted-foreground)]">
                    Revenu mois
                  </span>
                  <span className="font-semibold text-[color:var(--foreground)]">
                    {formatXof(c.monthRevenueFcfa)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <CourierDetailDrawer courier={target} onClose={() => setTarget(null)} />
    </div>
  );
}
