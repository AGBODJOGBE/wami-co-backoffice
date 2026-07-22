"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldOff,
  TrendingDown,
  TrendingUp,
  User,
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
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/shared/lib/csv";
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
  type ContractKpis,
  type ContractStatus,
} from "../domain/contract";
import { ContractCreateModal } from "./contract-create-modal";
import { CanView } from "@/shared/ui/can-view";

// ─── Colonnes CSV ─────────────────────────────────────────────────────────────

const CONTRACT_CSV_COLUMNS: CsvColumn<Contract>[] = [
  { key: "id",              header: "ID Contrat",        value: (r) => r.contractId },
  { key: "chauffeur",       header: "Chauffeur",          value: (r) => driverFullName(r.driver) },
  { key: "telephone",       header: "Téléphone",          value: (r) => r.driver.phoneNumber ?? "" },
  { key: "vehicule",        header: "Véhicule",           value: (r) => vehicleLabel(r.vehicle) },
  { key: "immatriculation", header: "Immatriculation",    value: (r) => r.vehicle.licensePlate ?? "" },
  { key: "montantTotal",    header: "Montant total (FCFA)",value: (r) => r.montantTotal },
  { key: "montantPaye",     header: "Payé (FCFA)",        value: (r) => r.montantPaye ?? "" },
  { key: "montantRestant",  header: "Restant (FCFA)",     value: (r) => r.montantRestant ?? "" },
  { key: "frequence",       header: "Fréquence",          value: (r) => PAYMENT_FREQUENCY_LABELS[r.frequencePaiement] },
  { key: "duree",           header: "Durée (mois)",       value: (r) => r.dureeMois },
  { key: "debut",           header: "Début",              value: (r) => formatDate(r.dateDebut) },
  { key: "fin",             header: "Fin prévue",         value: (r) => r.dateFin ? formatDate(r.dateFin) : "" },
  { key: "statut",          header: "Statut",             value: (r) => CONTRACT_STATUS_LABELS[r.status as ContractStatus] ?? r.status },
  { key: "echeancesPayees", header: "Échéances payées",   value: (r) => r.echeancesPayees ?? "" },
  { key: "echeancesTotal",  header: "Échéances total",    value: (r) => r.echeancesTotal ?? "" },
  { key: "nbImpayes",       header: "Nb impayés",         value: (r) => r.nbImpayes ?? 0 },
];

// ─── Options filtre statut ────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL",        label: "Tous les statuts" },
  { value: "ACTIVE",     label: "Actifs" },
  { value: "SUSPENDED",  label: "Suspendus" },
  { value: "COMPLETED",  label: "Soldés" },
  { value: "BROKEN",     label: "Résiliés" },
  { value: "TERMINATED", label: "Terminés" },
];

// ─── Mini barre de progression ────────────────────────────────────────────────

function MiniProgress({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const color =
    pct === 100 ? "bg-emerald-500"
    : pct >= 60  ? "bg-[color:var(--primary)]"
    : pct >= 30  ? "bg-amber-400"
    : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-[color:var(--muted)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
        {paid}/{total}
      </span>
    </div>
  );
}

// ─── Initiales chauffeur ──────────────────────────────────────────────────────

function DriverAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[11px] font-bold text-[color:var(--primary)]">
      {initials}
    </div>
  );
}

// ─── KPI mini card ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const toneMap = {
    neutral: { bg: "bg-[color:var(--muted)]",             icon: "text-[color:var(--muted-foreground)]", val: "text-[color:var(--foreground)]" },
    success: { bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-500",                    val: "text-emerald-700 dark:text-emerald-400" },
    warning: { bg: "bg-amber-50 dark:bg-amber-950/30",    icon: "text-amber-500",                      val: "text-amber-700 dark:text-amber-400" },
    danger:  { bg: "bg-red-50 dark:bg-red-950/30",        icon: "text-red-500",                        val: "text-red-700 dark:text-red-400" },
    primary: { bg: "bg-[color:var(--primary-soft)]",       icon: "text-[color:var(--primary)]",         val: "text-[color:var(--primary)]" },
  };
  const t = toneMap[tone];
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
        <Icon className={`size-5 ${t.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
          {label}
        </p>
        <p className={`font-mono text-xl font-bold leading-none ${t.val}`}>{value}</p>
        {sub && (
          <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{sub}</p>
        )}
      </div>
    </Card>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ContractsPageProps {
  contracts: Contract[];
  total: number;
  error?: string;
  drivers: AdminDriver[];
  vehicles: VehicleSummary[];
  kpis?: ContractKpis;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ContractsPage({ contracts, total, error, drivers, vehicles, kpis }: ContractsPageProps) {
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

  const stats = useMemo(() => ({
    total:          kpis?.contracts.total      ?? contracts.length,
    active:         kpis?.contracts.active     ?? contracts.filter((c) => c.status === "ACTIVE").length,
    suspended:      kpis?.contracts.suspended  ?? contracts.filter((c) => c.status === "SUSPENDED").length,
    broken:         kpis?.contracts.broken     ?? contracts.filter((c) => c.status === "BROKEN").length,
    late:           kpis?.installments.overdueCount ?? 0,
    blockedDrivers: kpis?.blocking.blockedCount ?? 0,
    atRisk:         kpis?.blocking.atRiskCount  ?? 0,
    totalRestant:   kpis?.financials.totalMontantRestant,
    totalPaye:      kpis?.financials.totalMontantPaye,
    totalTotal:     kpis?.financials.totalMontantTotal,
  }), [contracts, kpis]);

  // ── Colonnes ────────────────────────────────────────────────────────────────

  const columns: ColumnDef<Contract>[] = [
    {
      key: "driver",
      header: "Chauffeur",
      sortAccessor: (row) => driverFullName(row.driver),
      render: (row) => {
        const name = driverFullName(row.driver);
        return (
          <div className="flex items-center gap-3">
            <DriverAvatar name={name} />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-medium text-[color:var(--foreground)]">{name || "—"}</span>
              {row.driver.phoneNumber && (
                <span className="text-xs text-[color:var(--muted-foreground)]">{row.driver.phoneNumber}</span>
              )}
              <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                #{(row.contractId ?? "").slice(0, 8)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "vehicle",
      header: "Véhicule",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <Car className="size-3.5 text-emerald-500" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm text-[color:var(--foreground)]">{vehicleLabel(row.vehicle) || "—"}</span>
            {row.vehicle.licensePlate && (
              <span className="font-mono text-[10px] uppercase text-[color:var(--muted-foreground)]">
                {row.vehicle.licensePlate}
              </span>
            )}
            {row.vehicle.vehicleType && (
              <span className="text-[10px] text-[color:var(--muted-foreground)]">{row.vehicle.vehicleType}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "financement",
      header: "Financement",
      sortAccessor: (row) => row.montantTotal,
      render: (row) => {
        const paid   = row.echeancesPayees ?? 0;
        const tot    = row.echeancesTotal  ?? 0;
        const pct    = tot > 0 ? Math.round((paid / tot) * 100) : 0;
        return (
          <div className="flex flex-col gap-1 leading-tight">
            {/* Montant total */}
            <span className="font-mono text-sm font-semibold text-[color:var(--foreground)]">
              {formatXof(row.montantTotal)}
            </span>
            {/* Mensualité + fréquence */}
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.montantMensuel != null ? formatXof(row.montantMensuel) : "—"}
              <span className="mx-1">·</span>
              {PAYMENT_FREQUENCY_LABELS[row.frequencePaiement]}
            </span>
            {/* Mini barre */}
            {tot > 0 && <MiniProgress paid={paid} total={tot} />}
            {/* Restant si non soldé */}
            {row.montantRestant != null && row.montantRestant > 0 && (
              <span className="text-[10px] text-[color:var(--muted-foreground)]">
                Reste : {formatXof(row.montantRestant)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "dates",
      header: "Période",
      sortAccessor: (row) => row.dateDebut,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium text-[color:var(--foreground)]">
            {formatDate(row.dateDebut)}
          </span>
          {row.dateFin ? (
            <span className="text-xs text-[color:var(--muted-foreground)]">→ {formatDate(row.dateFin)}</span>
          ) : (
            <span className="text-xs text-[color:var(--muted-foreground)]">{row.dureeMois} mois</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      render: (row) => (
        <div className="flex flex-col gap-1.5">
          <Badge tone={CONTRACT_STATUS_TONES[row.status as ContractStatus]}>
            {CONTRACT_STATUS_LABELS[row.status as ContractStatus] ?? row.status}
          </Badge>
          {row.status === "SUSPENDED" && (row.nbImpayes ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
              <ShieldAlert className="size-3" />
              {row.nbImpayes} impayé{(row.nbImpayes ?? 0) > 1 ? "s" : ""}
            </span>
          )}
          {row.status === "COMPLETED" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              Soldé
            </span>
          )}
        </div>
      ),
    },
  ];

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(timestampedFilename("contrats"), CONTRACT_CSV_COLUMNS, filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="size-4" />
              Exporter CSV
            </Button>
            <CanView permission="contract.create">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nouveau contrat
              </Button>
            </CanView>
          </>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Contrats actifs"
          value={String(stats.active)}
          sub={`${stats.total} au total`}
          icon={FileText}
          tone="success"
        />
        <KpiCard
          label="Échéances en retard"
          value={String(stats.late)}
          sub={stats.atRisk > 0 ? `${stats.atRisk} à risque de blocage` : "aucun risque immédiat"}
          icon={AlertTriangle}
          tone={stats.late > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Suspendus"
          value={String(stats.suspended)}
          sub={
            stats.blockedDrivers > 0
              ? `${stats.blockedDrivers} driver${stats.blockedDrivers > 1 ? "s" : ""} bloqué${stats.blockedDrivers > 1 ? "s" : ""}`
              : "aucun driver bloqué"
          }
          icon={ShieldOff}
          tone={stats.suspended > 0 ? "danger" : "neutral"}
        />
        <KpiCard
          label="À recouvrer"
          value={
            stats.totalRestant != null
              ? stats.totalRestant >= 1_000_000
                ? `${(stats.totalRestant / 1_000_000).toFixed(1)}M`
                : `${Math.round(stats.totalRestant / 1000)}k`
              : "—"
          }
          sub="FCFA restants sur l'ensemble"
          icon={TrendingDown}
          tone={stats.totalRestant && stats.totalRestant > 0 ? "warning" : "neutral"}
        />
      </section>

      {/* Barre financière globale */}
      {stats.totalTotal != null && stats.totalTotal > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
                  Total engagé
                </span>
                <span className="font-mono text-base font-bold text-[color:var(--foreground)]">
                  {formatXof(stats.totalTotal)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
                  Collecté
                </span>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalPaye != null ? formatXof(stats.totalPaye) : "—"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
                  Restant
                </span>
                <span className="font-mono text-base font-bold text-[color:var(--foreground)]">
                  {stats.totalRestant != null ? formatXof(stats.totalRestant) : "—"}
                </span>
              </div>
            </div>
            {/* Barre globale */}
            {stats.totalPaye != null && (
              <div className="flex items-center gap-3 sm:w-64">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--muted)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--primary)]"
                    style={{
                      width: `${Math.min(100, Math.round((stats.totalPaye / stats.totalTotal) * 100))}%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-xs font-semibold text-[color:var(--primary)]">
                  {Math.round((stats.totalPaye / stats.totalTotal) * 100)}%
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
          <SearchField
            placeholder="Rechercher driver, véhicule, immatriculation…"
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
        {/* Résumé filtre */}
        {(search || statusFilter !== "ALL") && (
          <p className="px-1 text-xs text-[color:var(--muted-foreground)]">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            {search && ` pour « ${search} »`}
            {statusFilter !== "ALL" && ` · statut : ${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}`}
          </p>
        )}
      </div>

      {/* Contenu */}
      {error ? (
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        </Card>
      ) : contracts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[color:var(--muted)]">
            <FileText className="size-7 text-[color:var(--muted-foreground)]" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Aucun contrat</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Créez le premier contrat de location-vente pour commencer.
            </p>
          </div>
          <CanView permission="contract.create">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nouveau contrat
            </Button>
          </CanView>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.contractId}
            rowHref={(row) => `/contracts/${row.contractId}`}
            defaultSort={{ key: "dates", direction: "desc" }}
            emptyMessage="Aucun contrat ne correspond à ces critères."
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
