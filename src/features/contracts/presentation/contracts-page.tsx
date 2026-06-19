"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FileText,
  Plus,
  RefreshCw,
  ShieldOff,
  TrendingUp,
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
import { Spinner } from "@/shared/ui/spinner";
import { formatDate } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import type { AdminDriver } from "@/features/drivers/domain/admin-driver";
import type { VehicleSummary } from "@/features/vehicles/domain/vehicle";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  PAYMENT_FREQUENCY_LABELS,
  driverFullName,
  formatXof,
  vehicleLabel,
  type Contract,
  type ContractStatus,
} from "../domain/contract";
import { ContractCreateModal } from "./contract-create-modal";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut : tous" },
  { value: "PENDING", label: "En attente" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "COMPLETED", label: "Soldés" },
  { value: "BROKEN", label: "Résiliés" },
  { value: "TERMINATED", label: "Terminés" },
];

export interface ContractsPageProps {
  contracts: Contract[];
  total: number;
  error?: string;
  drivers: AdminDriver[];
  vehicles: VehicleSummary[];
}

export function ContractsPage({ contracts, total, error, drivers, vehicles }: ContractsPageProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (q) {
        const hay = [
          c.contractId,
          driverFullName(c.driver),
          c.driver.phoneNumber ?? "",
          vehicleLabel(c.vehicle),
          c.vehicle.licensePlate ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      return true;
    });
  }, [contracts, search, statusFilter]);

  const stats = useMemo(() => {
    const active = contracts.filter((c) => c.status === "ACTIVE").length;
    const pending = contracts.filter((c) => c.status === "PENDING").length;
    const broken = contracts.filter((c) => c.status === "BROKEN").length;
    const late = contracts.filter(
      (c) => c.status === "ACTIVE" && (c.montantRestant ?? 0) > 0,
    ).length;
    return { active, pending, broken, late };
  }, [contracts]);

  const columns: ColumnDef<Contract>[] = [
    {
      key: "contract",
      header: "Contrat",
      sortAccessor: (row) => row.createdAt,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
            #{row.contractId.slice(0, 8)}
          </span>
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {driverFullName(row.driver)}
          </span>
          {row.driver.phoneNumber ? (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.driver.phoneNumber}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Véhicule",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">
            {vehicleLabel(row.vehicle)}
          </span>
          {row.vehicle.vehicleType ? (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.vehicle.vehicleType}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "montant",
      header: "Montant",
      align: "right",
      sortAccessor: (row) => row.montantTotal,
      render: (row) => (
        <div className="flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold text-[color:var(--foreground)]">
            {formatXof(row.montantTotal)}
          </span>
          {row.montantRestant != null ? (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              Reste : {formatXof(row.montantRestant)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "mensualite",
      header: "Échéance",
      align: "right",
      sortAccessor: (row) => row.montantMensuel ?? 0,
      render: (row) => (
        <div className="flex flex-col items-end leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">
            {row.montantMensuel != null ? formatXof(row.montantMensuel) : "—"}
          </span>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {PAYMENT_FREQUENCY_LABELS[row.frequencePaiement]}
          </span>
        </div>
      ),
    },
    {
      key: "echeances",
      header: "Échéances",
      align: "center",
      render: (row) => (
        <span className="text-sm text-[color:var(--foreground)]">
          {row.echeancesPayees ?? "—"} / {row.echeancesTotal ?? "—"}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Période",
      sortAccessor: (row) => row.dateDebut,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-[color:var(--foreground)]">
            {formatDate(row.dateDebut)}
          </span>
          {row.dateFin ? (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              → {formatDate(row.dateFin)}
            </span>
          ) : (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.dureeMois} mois
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      render: (row) => (
        <Badge tone={CONTRACT_STATUS_TONES[row.status as ContractStatus]}>
          {CONTRACT_STATUS_LABELS[row.status as ContractStatus] ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Contrats location-vente"
        dataSource="live"
        dataSourceHint="Branché sur /api/admin/contracts — création et résiliation en direct."
        description="Gestion des contrats d'acquisition de véhicules avec financement échelonné."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nouveau contrat
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Contrats actifs"
          value={String(stats.active)}
          trend={{ value: "live", direction: "flat" }}
          helper={`${contracts.length} au total`}
          icon={FileText}
          tone="success"
        />
        <StatCard
          label="En attente"
          value={String(stats.pending)}
          trend={{ value: "à valider", direction: "flat" }}
          helper="signature en cours"
          icon={TrendingUp}
          tone="warning"
        />
        <StatCard
          label="Résiliés"
          value={String(stats.broken)}
          trend={{ value: "clôturés", direction: "flat" }}
          helper="contrats cassés"
          icon={ShieldOff}
          tone="warning"
        />
        <StatCard
          label="En retard"
          value={String(stats.late)}
          trend={{ value: "à suivre", direction: "flat" }}
          helper="restant > 0"
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher (driver, véhicule, immatriculation…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            className="sm:w-48"
          />
        </div>
      </div>

      {error ? (
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        </Card>
      ) : contracts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <FileText className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Aucun contrat
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Crée le premier contrat via le bouton « Nouveau contrat ».
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.contractId}
            rowHref={(row) => `/contracts/${row.contractId}`}
            defaultSort={{ key: "dates", direction: "desc" }}
            emptyMessage="Aucun contrat ne correspond aux filtres."
          />
          <PaginationFooter total={total} shown={filtered.length} />
        </Card>
      )}

      <ContractCreateModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          router.refresh();
        }}
        drivers={drivers}
        vehicles={vehicles}
      />
    </div>
  );
}
