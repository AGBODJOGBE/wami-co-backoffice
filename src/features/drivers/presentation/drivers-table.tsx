"use client";

import { Star } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { DropdownMenu, type DropdownGroup } from "@/shared/ui/dropdown-menu";
import { VEHICLE_TYPE_LABELS } from "@/features/rides/domain/ride";
import { DRIVER_STATUS_META, type DriverRow } from "../domain/driver";

export interface DriversTableProps {
  rows: DriverRow[];
  total: number;
  actions?: (driver: DriverRow) => DropdownGroup[];
}

export function DriversTable({ rows, total, actions }: DriversTableProps) {
  const columns: ColumnDef<DriverRow>[] = [
    {
      key: "driver",
      header: "Driver",
      sortAccessor: (row) => row.fullName.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={row.fullName} />
            {row.isOnline ? (
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[color:var(--muted)]" />
            ) : null}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {row.fullName}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.phone}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Catégorie",
      sortAccessor: (row) => row.category,
      filter: {
        accessor: (row) => row.category,
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
        <div className="flex flex-col leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">
            {VEHICLE_TYPE_LABELS[row.category]}
          </span>
          <span className="text-xs text-[color:var(--muted-foreground)]">{row.city}</span>
        </div>
      ),
    },
    {
      key: "city",
      header: "Ville",
      sortAccessor: (row) => row.city,
      filter: {
        accessor: (row) => row.city,
        def: {
          kind: "select",
          options: [
            { value: "Cotonou", label: "Cotonou" },
            { value: "Calavi", label: "Calavi" },
            { value: "Porto-Novo", label: "Porto-Novo" },
            { value: "Ouidah", label: "Ouidah" },
          ],
        },
      },
      render: (row) => (
        <span className="text-sm text-[color:var(--muted-foreground)]">{row.city}</span>
      ),
    },
    {
      key: "vehicle",
      header: "Véhicule",
      sortAccessor: (row) => row.plate,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">{row.vehicle}</span>
          <span className="font-mono text-xs uppercase text-[color:var(--muted-foreground)]">
            {row.plate}
          </span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Performance",
      sortAccessor: (row) => row.rating,
      filter: {
        accessor: (row) => row.rating,
        def: { kind: "number", unit: "★" },
      },
      render: (row) =>
        row.totalRides === 0 ? (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            Pas encore de courses
          </span>
        ) : (
          <div className="flex flex-col leading-tight">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--foreground)]">
              <Star className="size-3.5 fill-[color:var(--secondary)] text-[color:var(--secondary)]" />
              {row.rating.toFixed(1)}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.totalRides} courses
            </span>
          </div>
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
            { value: "PENDING", label: "En attente KYC" },
            { value: "APPROVED", label: "Approuvé" },
            { value: "SUSPENDED", label: "Suspendu" },
            { value: "REJECTED", label: "Rejeté" },
          ],
        },
      },
      render: (row) => {
        const meta = DRIVER_STATUS_META[row.status];
        return (
          <div className="flex flex-col gap-1">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {row.missingDocuments.length > 0 ? (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                {row.missingDocuments.length} pièce
                {row.missingDocuments.length > 1 ? "s" : ""} manquante
                {row.missingDocuments.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "online",
      header: "État",
      sortAccessor: (row) => (row.isOnline ? 1 : 0),
      filter: {
        accessor: (row) => row.isOnline,
        def: { kind: "boolean", trueLabel: "En ligne", falseLabel: "Hors ligne" },
      },
      render: (row) =>
        row.isOnline ? (
          <Badge tone="success">En ligne</Badge>
        ) : (
          <Badge tone="neutral">Hors ligne</Badge>
        ),
    },
    {
      key: "registered",
      header: "Inscrit",
      sortAccessor: (row) => row.registeredAt,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {row.registeredAgo}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (actions ? <DropdownMenu groups={actions(row)} /> : null),
    },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.driverId}
        rowHref={(row) => `/vtc/drivers/${row.driverId}`}
        defaultSort={{ key: "driver", direction: "asc" }}
      />
      <PaginationFooter total={total} shown={rows.length} />
    </Card>
  );
}
