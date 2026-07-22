"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  PackageOpen,
  RefreshCw,
  Truck,
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
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatRelative, formatXof } from "@/shared/lib/format";
import {
  DELIVERY_PAYMENT_LABELS,
  DELIVERY_STATUS_META,
  DELIVERY_TYPE_LABELS,
  DELIVERY_VEHICLE_LABELS,
  IN_FLIGHT_DELIVERY_STATUSES,
  REVENUE_DELIVERY_STATUSES,
  deliveryStatusMeta,
  type AdminDelivery,
  type DeliveryPaymentMethod,
  type DeliveryStatus,
  type DeliveryType,
  type DeliveryVehicleType,
} from "../domain/delivery";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut : tous" },
  ...(Object.keys(DELIVERY_STATUS_META) as DeliveryStatus[]).map((s) => ({
    value: s,
    label: DELIVERY_STATUS_META[s].label,
  })),
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "Type : tous" },
  ...(Object.keys(DELIVERY_TYPE_LABELS) as DeliveryType[]).map((t) => ({
    value: t,
    label: DELIVERY_TYPE_LABELS[t],
  })),
];

const VEHICLE_OPTIONS = [
  { value: "ALL", label: "Véhicule : tous" },
  ...(Object.keys(DELIVERY_VEHICLE_LABELS) as DeliveryVehicleType[]).map(
    (v) => ({ value: v, label: DELIVERY_VEHICLE_LABELS[v] }),
  ),
];

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "Paiement : tous" },
  ...(Object.keys(DELIVERY_PAYMENT_LABELS) as DeliveryPaymentMethod[]).map(
    (p) => ({ value: p, label: DELIVERY_PAYMENT_LABELS[p] }),
  ),
];

export interface DeliveriesListClientProps {
  deliveries: AdminDelivery[];
  total: number;
  error?: string;
  /** Préfixe URL pour les liens de détail. Défaut : "/delivery-b2b/shipments". */
  basePath?: string;
}

export function DeliveriesListClient({
  deliveries,
  total,
  error,
  basePath = "/delivery-b2b/shipments",
}: DeliveriesListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("ALL");
  const [typeF, setTypeF] = useState("ALL");
  const [vehicleF, setVehicleF] = useState("ALL");
  const [paymentF, setPaymentF] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (q) {
        const hay = `${d.orderNumber} ${d.passenger?.name ?? ""} ${
          d.passenger?.phone ?? ""
        } ${d.driver?.name ?? ""} ${d.driver?.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusF !== "ALL" && d.status !== statusF) return false;
      if (typeF !== "ALL" && d.deliveryType !== typeF) return false;
      if (vehicleF !== "ALL" && d.vehicleType !== vehicleF) return false;
      if (paymentF !== "ALL" && d.paymentMethod !== paymentF) return false;
      return true;
    });
  }, [search, statusF, typeF, vehicleF, paymentF, deliveries]);

  const stats = useMemo(() => {
    let inFlight = 0;
    let delivered = 0;
    let pending = 0;
    let failed = 0;
    for (const d of deliveries) {
      if (IN_FLIGHT_DELIVERY_STATUSES.has(d.status)) inFlight += 1;
      if (REVENUE_DELIVERY_STATUSES.has(d.status)) delivered += 1;
      if (d.status === "PENDING") pending += 1;
      if (d.status === "FAILED" || d.status === "CANCELLED") failed += 1;
    }
    return { inFlight, delivered, pending, failed };
  }, [deliveries]);

  const columns: ColumnDef<AdminDelivery>[] = [
    {
      key: "ref",
      header: "Commande",
      sortAccessor: (r) => r.orderNumber,
      render: (r) => (
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs font-semibold text-[color:var(--foreground)]">
            {r.orderNumber}
          </span>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {DELIVERY_TYPE_LABELS[r.deliveryType as DeliveryType] ??
              r.deliveryType}{" "}
            · {formatRelative(r.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "passenger",
      header: "Expéditeur",
      sortAccessor: (r) => r.passenger?.name ?? "",
      render: (r) =>
        r.passenger ? (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {r.passenger.name}
            </span>
            <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
              {r.passenger.phone}
            </span>
          </div>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            inconnu
          </span>
        ),
    },
    {
      key: "driver",
      header: "Driver",
      sortAccessor: (r) => r.driver?.name ?? "",
      render: (r) =>
        r.driver ? (
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-[color:var(--foreground)]">
              {r.driver.name}
            </span>
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              {r.driver.vehicle
                ? `${r.driver.vehicle.make} ${r.driver.vehicle.model} · ${r.driver.vehicle.licensePlate}`
                : "véhicule inconnu"}
            </span>
          </div>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            non assigné
          </span>
        ),
    },
    {
      key: "vehicle",
      header: "Véhicule",
      sortAccessor: (r) => r.vehicleType,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
          <Truck className="size-3" />
          {DELIVERY_VEHICLE_LABELS[r.vehicleType as DeliveryVehicleType] ??
            r.vehicleType}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Paiement",
      sortAccessor: (r) => r.paymentMethod,
      render: (r) => (
        <span className="text-xs text-[color:var(--foreground)]">
          {DELIVERY_PAYMENT_LABELS[r.paymentMethod as DeliveryPaymentMethod] ??
            r.paymentMethod}
        </span>
      ),
    },
    {
      key: "price",
      header: "Prix",
      align: "right",
      sortAccessor: (r) => r.finalPrice || r.estimatedPrice,
      render: (r) => (
        <div className="flex flex-col items-end leading-tight">
          <span className="font-mono font-medium text-[color:var(--foreground)]">
            {formatXof(r.finalPrice || r.estimatedPrice)}
          </span>
          {r.finalPrice > 0 && r.finalPrice !== r.estimatedPrice ? (
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              estimé : {formatXof(r.estimatedPrice)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (r) => r.status,
      render: (r) => {
        const m = deliveryStatusMeta(r.status);
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En cours"
          value={String(stats.inFlight)}
          trend={{ value: "live", direction: "flat" }}
          helper="PENDING → IN_TRANSIT"
          icon={Truck}
          tone="primary"
        />
        <StatCard
          label="Livrées"
          value={String(stats.delivered)}
          trend={{ value: "OTP confirmé", direction: "up" }}
          helper="statut DELIVERED"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="En attente"
          value={String(stats.pending)}
          trend={{ value: "à dispatcher", direction: "flat" }}
          helper="aucun driver assigné"
          icon={PackageOpen}
          tone="warning"
        />
        <StatCard
          label="Échecs / annulations"
          value={String(stats.failed)}
          trend={{ value: "à analyser", direction: "flat" }}
          helper="FAILED + CANCELLED"
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher (commande, passager, driver, téléphone)…"
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
            options={TYPE_OPTIONS}
            value={typeF}
            onChange={setTypeF}
            className="sm:w-40"
          />
          <Combobox
            options={VEHICLE_OPTIONS}
            value={vehicleF}
            onChange={setVehicleF}
            className="sm:w-40"
          />
          <Combobox
            options={PAYMENT_OPTIONS}
            value={paymentF}
            onChange={setPaymentF}
            className="sm:w-40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            {refreshing ? (
              <Spinner size="sm" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Rafraîchir
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5 p-4 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.id}
            rowHref={(r) => `${basePath}/${r.id}`}
            defaultSort={{ key: "ref", direction: "desc" }}
            emptyMessage="Aucune commande de livraison."
          />
          <PaginationFooter total={total} shown={filtered.length} />
        </Card>
      )}

      {filtered.length === 0 && !error ? (
        <div className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
          <ArrowRight className="size-3" />
          Astuce — efface les filtres pour voir l&apos;intégralité des
          commandes.
        </div>
      ) : null}
    </div>
  );
}
