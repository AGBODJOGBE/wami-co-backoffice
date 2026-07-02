"use client";

import Link from "next/link";
import { ArrowRight, MoreVertical } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { Card } from "@/shared/ui/card";
import { formatXof } from "@/shared/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  RIDE_STATUS_META,
  VEHICLE_TYPE_LABELS,
  type RideRow,
} from "../domain/ride";

export interface RidesTableProps {
  rows: RideRow[];
  total: number;
}

export function RidesTable({ rows, total }: RidesTableProps) {
  const columns: ColumnDef<RideRow>[] = [
    {
      key: "ride",
      header: "Course",
      sortAccessor: (row) => row.rideNumber,
      filter: {
        accessor: (row) => row.vehicleType,
        def: {
          kind: "select",
          options: [
            { value: "MOTO", label: "Moto" },
            { value: "TRICYCLE", label: "Tricycle" },
            { value: "STANDARD", label: "Standard" },
            { value: "PREMIUM", label: "Premium" },
            { value: "VIP", label: "VIP" },
          ],
        },
      },
      render: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/vtc/rides/${row.rideId}`}
            className="font-mono text-xs font-semibold text-[color:var(--primary)] hover:underline"
          >
            {row.rideNumber}
          </Link>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {VEHICLE_TYPE_LABELS[row.vehicleType]} · {PAYMENT_METHOD_LABELS[row.paymentMethod]} · {row.ago}
          </span>
        </div>
      ),
    },
    {
      key: "passenger",
      header: "Passager",
      sortAccessor: (row) => row.passengerName.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.passengerName} className="size-8 text-xs" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-[color:var(--foreground)]">
              {row.passengerName}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.passengerPhone}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      sortAccessor: (row) => row.driverName?.toLowerCase() ?? "",
      filter: {
        accessor: (row) => row.driverName !== null,
        def: { kind: "boolean", trueLabel: "Assignées", falseLabel: "Non assignées" },
      },
      render: (row) =>
        row.driverName ? (
          <div className="flex items-center gap-3">
            <Avatar name={row.driverName} className="size-8 text-xs" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-[color:var(--foreground)]">
                {row.driverName}
              </span>
              <span className="text-xs text-[color:var(--muted-foreground)]">
                {row.driverPhone}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            Non assigné
          </span>
        ),
    },
    {
      key: "trip",
      header: "Trajet",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
            <span className="truncate">{row.pickupAddress}</span>
            <ArrowRight className="size-3 shrink-0 text-[color:var(--muted-foreground)]" />
            <span className="truncate">{row.dropoffAddress}</span>
          </div>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {row.distanceKm.toFixed(1)} km · {row.durationMin} min
          </span>
        </div>
      ),
    },
    {
      key: "distance",
      header: "Distance",
      align: "right",
      sortAccessor: (row) => row.distanceKm,
      filter: {
        accessor: (row) => row.distanceKm,
        def: { kind: "number", unit: "km" },
      },
      render: (row) => (
        <span className="text-sm text-[color:var(--foreground)]">
          {row.distanceKm.toFixed(1)} km
        </span>
      ),
    },
    {
      key: "price",
      header: "Prix",
      align: "right",
      sortAccessor: (row) => row.finalPrice ?? row.estimatedPrice ?? 0,
      filter: {
        accessor: (row) => row.finalPrice ?? row.estimatedPrice ?? 0,
        def: { kind: "number", unit: "FCFA" },
      },
      render: (row) => {
        const price = row.finalPrice ?? row.estimatedPrice;
        const surge = row.surgeMultiplier ?? 1;
        return (
        <div className="flex flex-col items-end leading-tight">
          <span className="font-mono text-sm text-[color:var(--foreground)]">
            {price != null && !isNaN(price) ? formatXof(price) : "—"}
          </span>
          {surge > 1 ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Surge ×{surge}
            </span>
          ) : null}
        </div>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      filter: {
        accessor: (row) => row.status,
        def: {
          kind: "select",
          options: [
            { value: "PENDING_MATCH", label: "En attente" },
            { value: "DRIVER_ASSIGNED", label: "Driver assigné" },
            { value: "DRIVER_EN_ROUTE", label: "Driver en route" },
            { value: "DRIVER_ARRIVED", label: "Driver arrivé" },
            { value: "IN_PROGRESS", label: "En cours" },
            { value: "COMPLETED", label: "Terminée" },
            { value: "CANCELLED", label: "Annulée" },
            { value: "NO_DRIVER_FOUND", label: "Aucun driver" },
          ],
        },
      },
      render: (row) => {
        const meta = RIDE_STATUS_META[row.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <button
          type="button"
          className="rounded-md p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
          aria-label="Actions"
        >
          <MoreVertical className="size-4" />
        </button>
      ),
    },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.rideId}
        rowHref={(row) => `/vtc/rides/${row.rideId}`}
        defaultSort={{ key: "ride", direction: "desc" }}
      />
      <PaginationFooter total={total} shown={rows.length} />
    </Card>
  );
}
