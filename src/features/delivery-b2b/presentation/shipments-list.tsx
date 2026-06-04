"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Filter,
  PackageOpen,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import {
  DataTable,
  PaginationFooter,
  type ColumnDef,
} from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatXof, formatDateTime } from "@/shared/lib/format";
import {
  PARCEL_LABELS,
  PRIORITY_META,
  SHIPMENT_STATUS_META,
  type Shipment,
  type ShipmentPriority,
  type ShipmentStatus,
} from "../domain/types";
import { SHIPMENTS } from "../domain/mock";
import { ShipmentDetailDrawer } from "./shipment-detail-drawer";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut : tous" },
  ...(Object.keys(SHIPMENT_STATUS_META) as ShipmentStatus[]).map((s) => ({
    value: s,
    label: SHIPMENT_STATUS_META[s].label,
  })),
];

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "Priorité : toutes" },
  ...(Object.keys(PRIORITY_META) as ShipmentPriority[]).map((p) => ({
    value: p,
    label: PRIORITY_META[p].label,
  })),
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Catégorie : toutes" },
  ...Object.entries(PARCEL_LABELS).map(([value, label]) => ({ value, label })),
];

export function ShipmentsListPage() {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("ALL");
  const [prioF, setPrioF] = useState("ALL");
  const [catF, setCatF] = useState("ALL");
  const [target, setTarget] = useState<Shipment | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHIPMENTS.filter((s) => {
      if (q) {
        const hay =
          `${s.reference} ${s.senderName} ${s.dropoff.city} ${s.courierName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusF !== "ALL" && s.status !== statusF) return false;
      if (prioF !== "ALL" && s.priority !== prioF) return false;
      if (catF !== "ALL" && s.category !== catF) return false;
      return true;
    });
  }, [search, statusF, prioF, catF]);

  const stats = useMemo(() => {
    const inTransit = SHIPMENTS.filter((s) =>
      ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(s.status),
    ).length;
    const delivered = SHIPMENTS.filter((s) => s.status === "DELIVERED").length;
    const pending = SHIPMENTS.filter((s) => s.status === "PENDING_PICKUP").length;
    const failed = SHIPMENTS.filter((s) => s.status === "FAILED").length;
    return { inTransit, delivered, pending, failed };
  }, []);

  const columns: ColumnDef<Shipment>[] = [
    {
      key: "ref",
      header: "Référence",
      sortAccessor: (r) => r.reference,
      render: (r) => (
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs font-semibold text-[color:var(--foreground)]">
            {r.reference}
          </span>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {PARCEL_LABELS[r.category]} · {r.weightKg.toFixed(1)} kg
          </span>
        </div>
      ),
    },
    {
      key: "sender",
      header: "Expéditeur",
      sortAccessor: (r) => r.senderName,
      render: (r) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {r.senderName}
          </span>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {r.pickup.city} · {r.pickup.district}
          </span>
        </div>
      ),
    },
    {
      key: "route",
      header: "Trajet",
      render: (r) => (
        <div className="flex items-center gap-1 text-xs text-[color:var(--foreground)]">
          <span>{r.pickup.city}</span>
          <ArrowRight className="size-3 text-[color:var(--muted-foreground)]" />
          <span>{r.dropoff.city}</span>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            ({r.distanceKm.toFixed(1)} km)
          </span>
        </div>
      ),
    },
    {
      key: "courier",
      header: "Livreur",
      sortAccessor: (r) => r.courierName ?? "",
      render: (r) =>
        r.courierName ? (
          <span className="text-sm">{r.courierName}</span>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            non assigné
          </span>
        ),
    },
    {
      key: "priority",
      header: "Priorité",
      sortAccessor: (r) => r.priority,
      render: (r) => {
        const m = PRIORITY_META[r.priority];
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (r) => r.status,
      render: (r) => {
        const m = SHIPMENT_STATUS_META[r.status];
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    {
      key: "price",
      header: "Prix",
      align: "right",
      sortAccessor: (r) => r.price,
      render: (r) => <span className="font-medium">{formatXof(r.price)}</span>,
    },
    {
      key: "createdAt",
      header: "Créée",
      sortAccessor: (r) => r.pickupAt,
      render: (r) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatDateTime(r.pickupAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Livraisons"
        dataSource="mock"
        description="Toutes les commandes B2B avec pipeline visuel, filtres et actions admin."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button size="sm">
              <Plus className="size-4" />
              Nouvelle livraison
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En transit"
          value={String(stats.inTransit)}
          trend={{ value: "live", direction: "flat" }}
          helper="dont collectées"
          icon={PackageOpen}
          tone="primary"
        />
        <StatCard
          label="Livrées aujourd'hui"
          value={String(stats.delivered)}
          trend={{ value: "+8 vs hier", direction: "up" }}
          helper="signature OK"
          icon={PackageOpen}
          tone="success"
        />
        <StatCard
          label="En attente collecte"
          value={String(stats.pending)}
          trend={{ value: "à dispatcher", direction: "flat" }}
          helper="aucun livreur"
          icon={Filter}
          tone="warning"
        />
        <StatCard
          label="Échecs / annulations"
          value={String(stats.failed)}
          trend={{ value: "à relancer", direction: "flat" }}
          helper="incidents du jour"
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher (référence, expéditeur, ville, livreur)…"
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
            options={PRIORITY_OPTIONS}
            value={prioF}
            onChange={setPrioF}
            className="sm:w-44"
          />
          <Combobox
            options={CATEGORY_OPTIONS}
            value={catF}
            onChange={setCatF}
            className="sm:w-44"
          />
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4" />
            Rafraîchir
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => setTarget(r)}
          defaultSort={{ key: "createdAt", direction: "desc" }}
        />
        <PaginationFooter total={SHIPMENTS.length} shown={filtered.length} />
      </Card>

      <ShipmentDetailDrawer
        shipment={target}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
