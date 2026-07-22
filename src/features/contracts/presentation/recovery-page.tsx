"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronRight,
  Download,
  RefreshCw,
  TrendingDown,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/shared/lib/csv";
import { formatDate } from "@/shared/lib/format";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  driverFullName,
  formatXof,
  vehicleLabel,
  type Contract,
  type ContractKpis,
  type ContractStatus,
} from "../domain/contract";

// ─── CSV ──────────────────────────────────────────────────────────────────────

const RECOVERY_CSV_COLUMNS: CsvColumn<Contract>[] = [
  { key: "contractId",        header: "ID Contrat",            value: (r) => r.contractId },
  { key: "driver",            header: "Chauffeur",              value: (r) => driverFullName(r.driver) },
  { key: "vehicle",           header: "Véhicule",               value: (r) => vehicleLabel(r.vehicle) },
  { key: "status",            header: "Statut contrat",         value: (r) => CONTRACT_STATUS_LABELS[r.status as ContractStatus] ?? r.status },
  { key: "montantTotal",      header: "Montant total (FCFA)",   value: (r) => r.montantTotal },
  { key: "montantPaye",       header: "Imputé total (FCFA)",    value: (r) => r.montantPaye ?? "" },
  { key: "montantNonReconnu", header: "En recouvrement (FCFA)", value: (r) => r.montantNonReconnu ?? 0 },
  { key: "montantRecouvre",   header: "Encaissé cash (FCFA)",   value: (r) => r.montantRecouvre ?? 0 },
  { key: "dateDebut",         header: "Début",                  value: (r) => formatDate(r.dateDebut) },
];

// ─── Barre de progression cash ────────────────────────────────────────────────

function RecoveryBar({
  nonReconnu,
  recouvre,
}: {
  nonReconnu: number;
  recouvre: number;
}) {
  const total = nonReconnu + recouvre;
  const pct = total > 0 ? Math.min(100, Math.round((recouvre / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/40">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 shrink-0 text-right font-mono text-[10px] font-semibold text-sky-600 dark:text-sky-400">
          {pct}%
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-[color:var(--muted-foreground)]">
        <span>{formatXof(recouvre)} encaissé</span>
        <span>{formatXof(nonReconnu)} restant</span>
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

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
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
}) {
  const toneMap = {
    neutral: {
      bg:   "bg-[color:var(--muted)]",
      icon: "text-[color:var(--muted-foreground)]",
      val:  "text-[color:var(--foreground)]",
    },
    primary: {
      bg:   "bg-[color:var(--primary-soft)]",
      icon: "text-[color:var(--primary)]",
      val:  "text-[color:var(--primary)]",
    },
    success: {
      bg:   "bg-emerald-50 dark:bg-emerald-950/30",
      icon: "text-emerald-500",
      val:  "text-emerald-700 dark:text-emerald-400",
    },
    warning: {
      bg:   "bg-amber-50 dark:bg-amber-950/30",
      icon: "text-amber-500",
      val:  "text-amber-700 dark:text-amber-400",
    },
    danger: {
      bg:   "bg-red-50 dark:bg-red-950/30",
      icon: "text-red-500",
      val:  "text-red-700 dark:text-red-400",
    },
    info: {
      bg:   "bg-sky-50 dark:bg-sky-950/30",
      icon: "text-sky-500",
      val:  "text-sky-700 dark:text-sky-400",
    },
  };
  const t = toneMap[tone];
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
        <Icon className={`size-5 ${t.icon}`} />
      </div>
      <div className="min-w-0 flex-1">
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

// ─── Ligne de contrat en recouvrement ─────────────────────────────────────────

function RecoveryRow({ contract }: { contract: Contract }) {
  const nonReconnu = contract.montantNonReconnu ?? 0;
  const recouvre   = contract.montantRecouvre   ?? 0;
  const pct = (nonReconnu + recouvre) > 0
    ? Math.min(100, Math.round((recouvre / (nonReconnu + recouvre)) * 100))
    : 0;

  const urgency = nonReconnu > 100_000 ? "high" : nonReconnu > 20_000 ? "medium" : "low";

  return (
    <Link
      href={`/contracts/${contract.contractId}`}
      className="group flex flex-col gap-0 transition hover:bg-[color:var(--muted)]/40 sm:flex-row"
    >
      {/* Bande de couleur urgency */}
      <div
        className={`hidden w-1 shrink-0 sm:block ${
          urgency === "high"   ? "bg-red-400"
          : urgency === "medium" ? "bg-amber-400"
          : "bg-sky-300"
        }`}
      />

      <div className="flex flex-1 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Driver + véhicule */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <User className="size-3.5 shrink-0 text-[color:var(--muted-foreground)]" />
            <span className="text-sm font-semibold text-[color:var(--foreground)] truncate">
              {driverFullName(contract.driver) || "—"}
            </span>
            <Badge tone={CONTRACT_STATUS_TONES[contract.status as ContractStatus]} className="shrink-0">
              {CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Car className="size-3.5 shrink-0 text-[color:var(--muted-foreground)]" />
            <span className="truncate text-xs text-[color:var(--muted-foreground)]">
              {vehicleLabel(contract.vehicle) || "—"}
            </span>
            {contract.driver.phoneNumber && (
              <span className="text-xs text-[color:var(--muted-foreground)]">
                · {contract.driver.phoneNumber}
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
            #{contract.contractId.slice(0, 12)} · depuis le {formatDate(contract.dateDebut)}
          </span>
        </div>

        {/* Montant non reconnu */}
        <div className="flex flex-col items-start gap-0 sm:w-40 sm:items-end">
          <span className="text-[11px] font-medium uppercase tracking-widest text-sky-500 dark:text-sky-400">
            En recouvrement
          </span>
          <span className={`font-mono text-lg font-bold ${
            urgency === "high"   ? "text-red-600 dark:text-red-400"
            : urgency === "medium" ? "text-amber-600 dark:text-amber-400"
            : "text-sky-600 dark:text-sky-400"
          }`}>
            {formatXof(nonReconnu)}
          </span>
          <span className="text-[11px] text-[color:var(--muted-foreground)]">
            {formatXof(recouvre)} encaissé · {pct}%
          </span>
        </div>

        {/* Barre de progression */}
        <div className="hidden sm:block sm:w-52">
          <RecoveryBar nonReconnu={nonReconnu} recouvre={recouvre} />
        </div>

        {/* Icone lien */}
        <ChevronRight className="hidden size-4 shrink-0 text-[color:var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--foreground)] sm:block" />
      </div>

      {/* Barre mobile */}
      <div className="mx-5 mb-3 sm:hidden">
        <RecoveryBar nonReconnu={nonReconnu} recouvre={recouvre} />
      </div>
    </Link>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RecoveryPageProps {
  contracts: Contract[];
  totalNonReconnu: number;
  totalRecouvre: number;
  kpis?: ContractKpis;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RecoveryPage({ contracts, totalNonReconnu, totalRecouvre, kpis }: RecoveryPageProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => {
      const hay = [
        driverFullName(c.driver),
        c.driver.phoneNumber ?? "",
        vehicleLabel(c.vehicle),
        c.vehicle.licensePlate ?? "",
        c.contractId,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [contracts, search]);

  // Trier par montantNonReconnu décroissant (les plus urgents en premier)
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.montantNonReconnu ?? 0) - (a.montantNonReconnu ?? 0)),
    [filtered],
  );

  const globalPct = (totalNonReconnu + totalRecouvre) > 0
    ? Math.min(100, Math.round((totalRecouvre / (totalNonReconnu + totalRecouvre)) * 100))
    : 0;

  const enRecouvrementCount = kpis?.installments.enRecouvrement ?? 0;
  const suspended           = kpis?.contracts.suspended ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <PageHeader
        eyebrow="Finance · Contrats"
        title="Recouvrements en cours"
        dataSource="live"
        dataSourceHint="Contrats avec montantNonReconnu > 0 — mis à jour à chaque paiement de gains chauffeur."
        description="Suivi du recouvrement cash des échéances imputées via découvert wallet chauffeur."
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
              onClick={() =>
                downloadCsv(
                  timestampedFilename("recouvrement-contrats"),
                  RECOVERY_CSV_COLUMNS,
                  sorted,
                )
              }
              disabled={sorted.length === 0}
            >
              <Download className="size-4" />
              Exporter CSV
            </Button>
          </>
        }
      />

      {/* ── Alerte globale ── */}
      {contracts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 dark:border-sky-800 dark:bg-sky-950/30">
          <TrendingDown className="mt-0.5 size-5 shrink-0 text-sky-500" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
              {formatXof(totalNonReconnu)} en cours de recouvrement sur {contracts.length} contrat{contracts.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-sky-600/90 dark:text-sky-400/90">
              Ces montants ont été imputés sur les échéanciers via le wallet chauffeur (découvert autorisé).
              Le recouvrement cash est progressif à chaque crédit de gains.
              {totalRecouvre > 0 && (
                <> <strong className="text-sky-700 dark:text-sky-300">{formatXof(totalRecouvre)}</strong> déjà encaissé ({globalPct}%).</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total en recouvrement"
          value={
            totalNonReconnu >= 1_000_000
              ? `${(totalNonReconnu / 1_000_000).toFixed(2)}M`
              : totalNonReconnu >= 1_000
              ? `${(totalNonReconnu / 1_000).toFixed(0)}k`
              : String(totalNonReconnu)
          }
          sub="FCFA non encore encaissés"
          icon={Wallet}
          tone={totalNonReconnu > 0 ? "info" : "neutral"}
        />
        <KpiCard
          label="Contrats concernés"
          value={String(contracts.length)}
          sub={suspended > 0 ? `dont ${suspended} suspendu${suspended > 1 ? "s" : ""}` : "aucun suspendu"}
          icon={TrendingDown}
          tone={contracts.length > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Échéances EN_RECOUVREMENT"
          value={String(enRecouvrementCount)}
          sub="imputées, cash non encore encaissé"
          icon={AlertTriangle}
          tone={enRecouvrementCount > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Déjà encaissé (cash)"
          value={
            totalRecouvre >= 1_000_000
              ? `${(totalRecouvre / 1_000_000).toFixed(2)}M`
              : totalRecouvre >= 1_000
              ? `${(totalRecouvre / 1_000).toFixed(0)}k`
              : String(totalRecouvre)
          }
          sub={`${globalPct}% du total imputé`}
          icon={CheckCircle2}
          tone={globalPct >= 70 ? "success" : globalPct >= 30 ? "warning" : "neutral"}
        />
      </section>

      {/* ── Barre de progression globale ── */}
      {(totalNonReconnu + totalRecouvre) > 0 && (
        <Card className="p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                Progression globale du recouvrement
              </span>
              <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                {formatXof(totalRecouvre)} / {formatXof(totalNonReconnu + totalRecouvre)}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/40">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all"
                style={{ width: `${globalPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[color:var(--muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-sky-500" />
                {formatXof(totalRecouvre)} encaissé cash
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-sky-100 ring-1 ring-sky-300 dark:bg-sky-950/40" />
                {formatXof(totalNonReconnu)} en attente
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Liste des contrats ── */}
      <Card className="overflow-hidden p-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
              Contrats en recouvrement
            </h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Triés par montant non reconnu décroissant
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un driver, véhicule…"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-1.5 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 sm:w-64"
          />
        </div>

        {/* Contenu */}
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                Aucun recouvrement en cours
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Tous les montants imputés ont été encaissés en cash.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/contracts">
                <ArrowRight className="size-4" />
                Voir tous les contrats
              </Link>
            </Button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
            Aucun résultat pour « {search} »
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--border)]/60">
            {sorted.map((contract) => (
              <RecoveryRow key={contract.contractId} contract={contract} />
            ))}
          </div>
        )}

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-[color:var(--border)] px-5 py-3">
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {sorted.length} contrat{sorted.length > 1 ? "s" : ""}
              {search && ` correspondant à « ${search} »`}
            </span>
            <Link
              href="/contracts"
              className="flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
            >
              Tous les contrats
              <ArrowRight className="size-3" />
            </Link>
          </div>
        )}
      </Card>

      {/* ── Explications métier ── */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
          Comment fonctionne le recouvrement cash ?
        </h3>
        <ol className="flex flex-col gap-2 text-xs text-[color:var(--muted-foreground)]">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[10px] font-bold text-[color:var(--primary)]">1</span>
            <span>
              <strong className="text-[color:var(--foreground)]">Imputation (EN_RECOUVREMENT)</strong> — Lorsque le wallet du chauffeur est insuffisant, le système impute quand même l'échéance en autorisant un découvert. Le montant est marqué <em>non reconnu</em> côté PLATFORM.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[10px] font-bold text-[color:var(--primary)]">2</span>
            <span>
              <strong className="text-[color:var(--foreground)]">Recouvrement progressif</strong> — À chaque crédit de gains (course terminée, bonus, etc.), le système alloue automatiquement une partie du montant à rembourser la dette PLATFORM. Le <em>montantNonReconnu</em> diminue.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[10px] font-bold text-[color:var(--primary)]">3</span>
            <span>
              <strong className="text-[color:var(--foreground)]">Clôture (PAYEE)</strong> — Quand <em>montantNonReconnu = 0</em>, l'échéance passe définitivement à PAYÉE et peut compter dans la complétion du contrat.
            </span>
          </li>
        </ol>
      </Card>
    </div>
  );
}
