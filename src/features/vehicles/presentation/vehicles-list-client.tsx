"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car as CarIcon,
  CheckCircle,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserCog,
  UserMinus,
  Wrench,
  WrenchIcon,
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
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDate } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import {
  daysUntil,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_OWNERSHIP_LABELS,
  VEHICLE_STATUS_META,
  VEHICLE_TYPE_LABELS,
  type VehicleSummary,
} from "../domain/vehicle";
import {
  VehicleAssignModal,
  VehicleCategoryModal,
  VehicleCreateModal,
  VehicleEditModal,
  VehicleMaintenanceCompleteModal,
  VehicleMaintenanceStartModal,
  VehicleRejectModal,
  VehicleSimpleConfirm,
  VehicleVerifyModal,
  type SimpleConfirmKind,
} from "./vehicle-modals";
import {
  VehicleBulkCreateModal,
  TVS_TRICYCLE_CONFIG,
  TVS_CAR_CONFIG,
} from "./vehicle-bulk-create-modal";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "AVAILABLE", label: "Disponible" },
  { value: "ASSIGNED", label: "Assigné" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RETIRED", label: "Retiré" },
  { value: "REJECTED", label: "Rejeté" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "Tous types" },
  { value: "MOTO", label: "Moto" },
  { value: "TRICYCLE", label: "Tricycle" },
  { value: "CAR", label: "Voiture" },
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Toutes catégories" },
  { value: "ECO", label: "Éco" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
  { value: "VIP", label: "VIP" },
];

const OWNERSHIP_OPTIONS = [
  { value: "ALL", label: "Toutes propriétés" },
  { value: "PLATFORM", label: "Plateforme" },
  { value: "DRIVER", label: "Driver" },
];

const VERIFIED_OPTIONS = [
  { value: "ALL", label: "Vérification : toutes" },
  { value: "true", label: "Vérifiés" },
  { value: "false", label: "Non vérifiés" },
];

function insuranceBadge(iso: string | null | undefined) {
  const left = daysUntil(iso);
  if (left === null)
    return (
      <span className="text-xs italic text-[color:var(--muted-foreground)]">
        Aucune date
      </span>
    );
  if (left < 0)
    return <Badge tone="danger">Expirée — il y a {Math.abs(left)} j</Badge>;
  if (left < 30) return <Badge tone="warning">{left} j restants</Badge>;
  return <Badge tone="success">{left} j restants</Badge>;
}

export interface VehiclesListClientProps {
  vehicles: VehicleSummary[];
  total: number;
  driverNames?: Record<string, string>;
  drivers?: import("@/features/drivers/domain/admin-driver").AdminDriver[];
}

export function VehiclesListClient({
  vehicles,
  total,
  driverNames = {},
  drivers = [],
}: VehiclesListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [ownership, setOwnership] = useState("ALL");
  const [verified, setVerified] = useState("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [bulkTricycleOpen, setBulkTricycleOpen] = useState(false);
  const [bulkCarOpen, setBulkCarOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VehicleSummary | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<VehicleSummary | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VehicleSummary | null>(null);
  const [assignTarget, setAssignTarget] = useState<VehicleSummary | null>(null);
  const [categoryTarget, setCategoryTarget] = useState<VehicleSummary | null>(
    null,
  );
  const [completeTarget, setCompleteTarget] = useState<VehicleSummary | null>(
    null,
  );
  const [maintenanceStartTarget, setMaintenanceStartTarget] = useState<VehicleSummary | null>(null);
  const [confirm, setConfirm] = useState<{
    kind: SimpleConfirmKind | null;
    vehicle: VehicleSummary | null;
  }>({ kind: null, vehicle: null });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (q) {
        const haystack =
          `${v.make} ${v.model} ${v.licensePlate} ${v.color}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status !== "ALL" && v.status !== status) return false;
      if (type !== "ALL" && v.type !== type) return false;
      if (category !== "ALL" && v.category !== category) return false;
      if (ownership !== "ALL" && v.ownership !== ownership) return false;
      if (verified !== "ALL") {
        const want = verified === "true";
        if (v.isVerified !== want) return false;
      }
      return true;
    });
  }, [vehicles, search, status, type, category, ownership, verified]);

  const stats = useMemo(() => {
    const pending = vehicles.filter((v) => v.status === "PENDING").length;
    const available = vehicles.filter((v) => v.status === "AVAILABLE").length;
    const assigned = vehicles.filter((v) => v.status === "ASSIGNED").length;
    const maintenance = vehicles.filter(
      (v) => v.status === "MAINTENANCE",
    ).length;
    const insuranceExpiring = vehicles.filter((v) => {
      const d = daysUntil(v.insuranceExpiryDate);
      return d !== null && d >= 0 && d < 30;
    }).length;
    const insuranceExpired = vehicles.filter((v) => {
      const d = daysUntil(v.insuranceExpiryDate);
      return d !== null && d < 0;
    }).length;
    return { pending, available, assigned, maintenance, insuranceExpiring, insuranceExpired };
  }, [vehicles]);

  const columns: ColumnDef<VehicleSummary>[] = [
    {
      key: "vehicle",
      header: "Véhicule",
      sortAccessor: (row) => `${row.make} ${row.model}`.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
            <CarIcon className="size-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {row.make} {row.model} {row.year}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.color} · {row.seats} place{row.seats > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortAccessor: (row) => row.type,
      render: (row) => <Badge tone="primary">{VEHICLE_TYPE_LABELS[row.type]}</Badge>,
    },
    {
      key: "category",
      header: "Catégorie",
      sortAccessor: (row) => row.category ?? "",
      render: (row) =>
        row.category ? (
          <span className="text-sm">{VEHICLE_CATEGORY_LABELS[row.category]}</span>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            —
          </span>
        ),
    },
    {
      key: "plate",
      header: "Plaque",
      sortAccessor: (row) => row.licensePlate,
      render: (row) => (
        <span className="font-mono text-sm uppercase text-[color:var(--foreground)]">
          {row.licensePlate}
        </span>
      ),
    },
    {
      key: "ownership",
      header: "Propriété",
      sortAccessor: (row) => row.ownership,
      render: (row) => (
        <Badge tone={row.ownership === "PLATFORM" ? "info" : "neutral"}>
          {VEHICLE_OWNERSHIP_LABELS[row.ownership]}
        </Badge>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      sortAccessor: (row) =>
        row.assignedToDriverId
          ? driverNames[row.assignedToDriverId] ?? row.assignedToDriverId
          : "",
      render: (row) => {
        if (!row.assignedToDriverId) {
          return (
            <span className="text-xs italic text-[color:var(--muted-foreground)]">
              Aucun
            </span>
          );
        }
        const name = driverNames[row.assignedToDriverId];
        return (
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-[color:var(--foreground)]">
              {name ?? `Driver #${row.assignedToDriverId.slice(0, 8)}`}
            </span>
            <span
              className="font-mono text-[10px] text-[color:var(--muted-foreground)]"
              title={row.assignedToDriverId}
            >
              {row.assignedToDriverId.slice(0, 14)}…
            </span>
          </div>
        );
      },
    },
    {
      key: "insurance",
      header: "Assurance",
      sortAccessor: (row) => daysUntil(row.insuranceExpiryDate) ?? 99999,
      render: (row) => (
        <div className="flex flex-col gap-1 leading-tight">
          {insuranceBadge(row.insuranceExpiryDate)}
          {row.insuranceExpiryDate ? (
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              jusqu&apos;au {formatDate(row.insuranceExpiryDate)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      render: (row) => (
        <Badge tone={VEHICLE_STATUS_META[row.status].tone}>
          {VEHICLE_STATUS_META[row.status].label}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <DropdownMenu groups={buildMenu(row)} />
      ),
    },
  ];

  function buildMenu(row: VehicleSummary) {
    const items = [
      { label: "Modifier", icon: Pencil, onSelect: () => setEditTarget(row) },
    ];
    if (row.status === "PENDING") {
      items.push(
        {
          label: "Vérifier",
          icon: ShieldCheck,
          onSelect: () => setVerifyTarget(row),
        },
        {
          label: "Rejeter",
          icon: ShieldX,
          onSelect: () => setRejectTarget(row),
        },
      );
    }
    items.push({
      label: "Changer la catégorie",
      icon: CheckCircle,
      onSelect: () => setCategoryTarget(row),
    });
    if (row.ownership === "PLATFORM") {
      if (row.status === "AVAILABLE") {
        items.push({
          label: "Assigner à un driver",
          icon: UserCog,
          onSelect: () => setAssignTarget(row),
        });
      }
      if (row.status === "ASSIGNED") {
        items.push({
          label: "Désassigner",
          icon: UserMinus,
          onSelect: () => setConfirm({ kind: "unassign", vehicle: row }),
        });
      }
    }
    if (row.ownership === "PLATFORM" && row.status === "AVAILABLE" && !row.assignedToDriverId) {
      items.push({
        label: "Mettre en maintenance",
        icon: Wrench,
        onSelect: () => setMaintenanceStartTarget(row),
      });
    }
    if (row.status === "MAINTENANCE") {
      items.push({
        label: "Terminer la maintenance",
        icon: WrenchIcon,
        onSelect: () => setCompleteTarget(row),
      });
    }
    return [
      { items },
      {
        items: [
          {
            label: "Retirer définitivement",
            icon: AlertTriangle,
            onSelect: () => setConfirm({ kind: "retire", vehicle: row }),
            danger: true,
          },
          {
            label: "Supprimer",
            icon: Trash2,
            onSelect: () => setConfirm({ kind: "delete", vehicle: row }),
            danger: true,
          },
        ],
      },
    ];
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Référentiel VTC"
        title="Véhicules"
        dataSource="live"
        dataSourceHint="Branché sur /api/vehicles/admin/* — données temps réel."
        description="Voitures, motos et tricycles enregistrés sur la plateforme."
        actions={
          <>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  timestampedFilename("vehicules"),
                  [
                    { key: "id", header: "ID", value: (r) => r.id },
                    { key: "plate", header: "Plaque", value: (r) => r.licensePlate },
                    { key: "make", header: "Marque", value: (r) => r.make },
                    { key: "model", header: "Modèle", value: (r) => r.model },
                    { key: "year", header: "Année", value: (r) => r.year },
                    { key: "color", header: "Couleur", value: (r) => r.color },
                    { key: "type", header: "Type", value: (r) => r.type },
                    { key: "category", header: "Catégorie", value: (r) => r.category ?? "" },
                    { key: "ownership", header: "Propriété", value: (r) => r.ownership },
                    { key: "status", header: "Statut", value: (r) => r.status },
                    { key: "verified", header: "Vérifié", value: (r) => (r.isVerified ? "oui" : "non") },
                    {
                      key: "driver",
                      header: "Driver assigné",
                      value: (r) =>
                        r.assignedToDriverId
                          ? driverNames[r.assignedToDriverId] ??
                            r.assignedToDriverId
                          : "",
                    },
                    {
                      key: "driverId",
                      header: "Driver ID",
                      value: (r) => r.assignedToDriverId ?? "",
                    },
                    { key: "insurance", header: "Expir. assurance", value: (r) => r.insuranceExpiryDate ?? "" },
                    { key: "mileage", header: "Kilométrage", value: (r) => r.mileage ?? "" },
                  ],
                  filtered,
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
<Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nouveau véhicule
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En attente de vérif."
          value={String(stats.pending)}
          trend={{ value: "à traiter", direction: "flat" }}
          helper={`${stats.available} dispo · ${stats.assigned} assignés`}
          icon={CarIcon}
          tone="primary"
        />
        <StatCard
          label="Maintenance"
          value={String(stats.maintenance)}
          trend={{ value: "en cours", direction: "flat" }}
          helper="à clôturer après contrôle"
          icon={Wrench}
          tone="secondary"
        />
        <StatCard
          label="Assurance < 30 j"
          value={String(stats.insuranceExpiring)}
          trend={{ value: "à relancer", direction: "flat" }}
          helper="désactivation auto en fin d'expiration"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Assurance expirée"
          value={String(stats.insuranceExpired)}
          trend={{ value: "à renouveler", direction: "flat" }}
          helper="non utilisable pour course"
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher (plaque, marque, modèle, couleur)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            className="sm:w-44"
          />
          <Combobox
            options={TYPE_OPTIONS}
            value={type}
            onChange={setType}
            className="sm:w-40"
          />
          <Combobox
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            className="sm:w-44"
          />
          <Combobox
            options={OWNERSHIP_OPTIONS}
            value={ownership}
            onChange={setOwnership}
            className="sm:w-44"
          />
          <Combobox
            options={VERIFIED_OPTIONS}
            value={verified}
            onChange={setVerified}
            className="sm:w-44"
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          rowHref={(row) => `/vtc/vehicles/${row.id}`}
          defaultSort={{ key: "insurance", direction: "asc" }}
        />
        <PaginationFooter total={total} shown={filtered.length} />
      </Card>

      <VehicleCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <VehicleBulkCreateModal
        open={bulkTricycleOpen}
        onClose={() => setBulkTricycleOpen(false)}
        config={TVS_TRICYCLE_CONFIG}
      />
      <VehicleBulkCreateModal
        open={bulkCarOpen}
        onClose={() => setBulkCarOpen(false)}
        config={TVS_CAR_CONFIG}
      />
      <VehicleEditModal
        open={!!editTarget}
        vehicle={editTarget}
        onClose={() => setEditTarget(null)}
      />
      <VehicleVerifyModal
        open={!!verifyTarget}
        vehicle={verifyTarget}
        onClose={() => setVerifyTarget(null)}
      />
      <VehicleRejectModal
        open={!!rejectTarget}
        vehicle={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
      <VehicleAssignModal
        open={!!assignTarget}
        vehicle={assignTarget}
        drivers={drivers}
        onClose={() => setAssignTarget(null)}
      />
      <VehicleCategoryModal
        open={!!categoryTarget}
        vehicle={categoryTarget}
        onClose={() => setCategoryTarget(null)}
      />
      <VehicleMaintenanceStartModal
        open={!!maintenanceStartTarget}
        vehicle={maintenanceStartTarget}
        onClose={() => setMaintenanceStartTarget(null)}
      />
      <VehicleMaintenanceCompleteModal
        open={!!completeTarget}
        vehicle={completeTarget}
        onClose={() => setCompleteTarget(null)}
      />
      <VehicleSimpleConfirm
        kind={confirm.kind}
        vehicle={confirm.vehicle}
        onClose={() => setConfirm({ kind: null, vehicle: null })}
      />
    </div>
  );
}
