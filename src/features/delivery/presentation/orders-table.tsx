"use client";

import Link from "next/link";
import { ArrowRight, Camera, KeyRound, MoreVertical } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { formatXof } from "@/shared/lib/format";
import {
  DELIVERY_STATUS_META,
  PARCEL_TYPE_META,
  type DeliveryOrderRow,
} from "../domain/delivery";

export interface OrdersTableProps {
  rows: DeliveryOrderRow[];
  total: number;
}

export function OrdersTable({ rows, total }: OrdersTableProps) {
  const columns: ColumnDef<DeliveryOrderRow>[] = [
    {
      key: "order",
      header: "Commande",
      sortAccessor: (row) => row.orderNumber,
      render: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/delivery/orders/${row.orderId}`}
            className="font-mono text-xs font-semibold text-[color:var(--primary)] hover:underline"
          >
            {row.orderNumber}
          </Link>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {row.vehicleType} · {row.ago}
          </span>
        </div>
      ),
    },
    {
      key: "parcel",
      header: "Colis",
      sortAccessor: (row) => row.parcelType,
      filter: {
        accessor: (row) => row.parcelType,
        def: {
          kind: "select",
          options: [
            { value: "DOCUMENT", label: "Document" },
            { value: "SMALL_PARCEL", label: "Petit colis" },
            { value: "FOOD", label: "Repas / Food" },
            { value: "MEDIUM_PARCEL", label: "Moyen colis" },
            { value: "FRAGILE", label: "Fragile" },
            { value: "LARGE_PARCEL", label: "Gros colis" },
          ],
        },
      },
      render: (row) => {
        const meta = PARCEL_TYPE_META[row.parcelType];
        return (
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              {meta.emoji}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-[color:var(--foreground)]">
                {meta.label}
              </span>
              <span className="text-xs text-[color:var(--muted-foreground)]">
                ≤ {meta.maxKg} kg
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "trip",
      header: "Trajet",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate text-[color:var(--foreground)]">
              {row.pickupAddress}
            </span>
            <ArrowRight className="size-3 shrink-0 text-[color:var(--muted-foreground)]" />
            <span className="truncate text-[color:var(--foreground)]">
              {row.dropoffAddress}
            </span>
          </div>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            Destinataire : {row.recipientName} · {row.recipientPhone}
          </span>
        </div>
      ),
    },
    {
      key: "client",
      header: "Expéditeur",
      sortAccessor: (row) => row.passengerName.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.passengerName} className="size-7 text-xs" />
          <span className="text-sm text-[color:var(--foreground)]">
            {row.passengerName}
          </span>
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
          <span className="text-sm text-[color:var(--foreground)]">{row.driverName}</span>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            Non assigné
          </span>
        ),
    },
    {
      key: "proof",
      header: "Preuves",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className={
              row.hasPickupPhoto
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[color:var(--muted-foreground)] opacity-40"
            }
            title="Photo pickup"
          >
            <Camera className="size-4" />
          </span>
          <span
            className={
              row.isOtpValidated
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[color:var(--muted-foreground)] opacity-40"
            }
            title="OTP destinataire"
          >
            <KeyRound className="size-4" />
          </span>
          <span
            className={
              row.hasDeliveryPhoto
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[color:var(--muted-foreground)] opacity-40"
            }
            title="Photo livraison"
          >
            <Camera className="size-4" />
          </span>
        </div>
      ),
    },
    {
      key: "price",
      header: "Prix",
      align: "right",
      sortAccessor: (row) => row.finalPrice ?? row.estimatedPrice,
      filter: {
        accessor: (row) => row.finalPrice ?? row.estimatedPrice,
        def: { kind: "number", unit: "FCFA" },
      },
      render: (row) => (
        <span className="font-mono text-sm text-[color:var(--foreground)]">
          {formatXof(row.finalPrice ?? row.estimatedPrice)}
        </span>
      ),
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
            { value: "PICKUP_ARRIVED", label: "Pickup arrivé" },
            { value: "PICKED_UP", label: "Colis collecté" },
            { value: "DELIVERY_ARRIVED", label: "Arrivé chez destinataire" },
            { value: "OTP_VALIDATED", label: "OTP validé" },
            { value: "DELIVERED", label: "Livré" },
            { value: "PICKUP_FAILED", label: "Échec collecte" },
            { value: "DELIVERY_FAILED", label: "Échec livraison" },
            { value: "CANCELLED", label: "Annulé" },
          ],
        },
      },
      render: (row) => {
        const meta = DELIVERY_STATUS_META[row.status];
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
        rowKey={(row) => row.orderId}
        rowHref={(row) => `/delivery/orders/${row.orderId}`}
        defaultSort={{ key: "order", direction: "desc" }}
      />
      <PaginationFooter total={total} shown={rows.length} />
    </Card>
  );
}
