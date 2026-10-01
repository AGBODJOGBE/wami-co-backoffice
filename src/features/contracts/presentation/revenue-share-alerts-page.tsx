"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  RefreshCw,
  TrendingDown,
  User,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/shared/lib/csv";
import { formatDate } from "@/shared/lib/format";
import {
  REVENUE_SHARE_ALERT_REASON_LABELS,
  formatXof,
  type RevenueShareAlertItem,
} from "../domain/contract";

export interface RevenueShareAlertRow extends RevenueShareAlertItem {
  driverName: string;
  driverPhone: string;
}

export interface RevenueShareAlertsPageProps {
  alerts: RevenueShareAlertRow[];
  total: number;
  error?: string;
}

const CSV_COLUMNS: CsvColumn<RevenueShareAlertRow>[] = [
  { key: "contractId",          header: "ID Contrat",                value: (r) => r.contractId },
  { key: "driver",              header: "Chauffeur",                  value: (r) => r.driverName },
  { key: "phone",               header: "Téléphone",                  value: (r) => r.driverPhone },
  { key: "montantNonReconnu",   header: "Dette en recouvrement (FCFA)", value: (r) => r.montantNonReconnu },
  { key: "montantRestant",      header: "Reste à payer (FCFA)",       value: (r) => r.montantRestant },
  { key: "lastWithholdingDate", header: "Dernier prélèvement",        value: (r) => r.lastWithholdingDate ? formatDate(r.lastWithholdingDate) : "" },
  { key: "reasons",             header: "Raisons",                    value: (r) => r.reasons.map((x) => REVENUE_SHARE_ALERT_REASON_LABELS[x] ?? x).join(" · ") },
];

function AlertRow({ alert }: { alert: RevenueShareAlertRow }) {
  const urgency = alert.montantNonReconnu > 100_000 ? "high" : alert.montantNonReconnu > 20_000 ? "medium" : "low";
  return (
    <Link
      href={`/contracts/${alert.contractId}`}
      className="group flex flex-col gap-0 transition hover:bg-[color:var(--muted)]/40 sm:flex-row"
    >
      <div
        className={`hidden w-1 shrink-0 sm:block ${
          urgency === "high" ? "bg-red-400" : urgency === "medium" ? "bg-amber-400" : "bg-sky-300"
        }`}
      />
      <div className="flex flex-1 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <User className="size-3.5 shrink-0 text-[color:var(--muted-foreground)]" />
            <span className="truncate text-sm font-semibold text-[color:var(--foreground)]">
              {alert.driverName || "—"}
            </span>
          </div>
          {alert.driverPhone && (
            <span className="text-xs text-[color:var(--muted-foreground)]">{alert.driverPhone}</span>
          )}
          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
            #{alert.contractId.slice(0, 12)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {alert.reasons.map((r) => (
            <Badge key={r} tone="warning">{REVENUE_SHARE_ALERT_REASON_LABELS[r] ?? r}</Badge>
          ))}
        </div>

        <div className="flex flex-col items-start gap-0 sm:w-44 sm:items-end">
          <span className="text-[11px] font-medium uppercase tracking-widest text-sky-500 dark:text-sky-400">
            Dette en recouvrement
          </span>
          <span className={`font-mono text-lg font-bold ${
            urgency === "high" ? "text-red-600 dark:text-red-400" : urgency === "medium" ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"
          }`}>
            {formatXof(alert.montantNonReconnu)}
          </span>
          <span className="text-[11px] text-[color:var(--muted-foreground)]">
            {alert.lastWithholdingDate ? `Dernier : ${formatDate(alert.lastWithholdingDate)}` : "Jamais prélevé"}
          </span>
        </div>

        <ChevronRight className="hidden size-4 shrink-0 text-[color:var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--foreground)] sm:block" />
      </div>
    </Link>
  );
}

export function RevenueShareAlertsPage({ alerts, total, error }: RevenueShareAlertsPageProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) =>
      [a.driverName, a.driverPhone, a.contractId].join(" ").toLowerCase().includes(q),
    );
  }, [alerts, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.montantNonReconnu - a.montantNonReconnu),
    [filtered],
  );

  const debtCount = alerts.filter((a) => a.reasons.includes("DEBT_THRESHOLD_EXCEEDED")).length;
  const inactivityCount = alerts.filter((a) => a.reasons.includes("INACTIVITY")).length;
  const totalDebt = alerts.reduce((s, a) => s + a.montantNonReconnu, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · Contrats"
        title="Alertes prélèvement sur revenus"
        dataSource="live"
        dataSourceHint="GET /api/admin/contracts/revenue-share/alerts — contrats PAR_REVENU nécessitant une attention admin."
        description="Contrats en mode PAR_REVENU dont la dette dépasse le seuil ou sans prélèvement récent — il n'y a jamais de blocage automatique dans ce mode."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing}>
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(timestampedFilename("alertes-revenue-share"), CSV_COLUMNS, sorted)}
              disabled={sorted.length === 0}
            >
              <Download className="size-4" />
              Exporter CSV
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/30">
            <TrendingDown className="size-5 text-sky-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">Total en alerte</p>
            <p className="font-mono text-xl font-bold text-[color:var(--foreground)]">{total}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="size-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">Dette excessive</p>
            <p className="font-mono text-xl font-bold text-red-700 dark:text-red-400">{debtCount}</p>
            <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{formatXof(totalDebt)} au total</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
            <Clock className="size-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">Inactifs</p>
            <p className="font-mono text-xl font-bold text-amber-700 dark:text-amber-400">{inactivityCount}</p>
          </div>
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-[color:var(--foreground)]">Contrats à surveiller</h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">Triés par dette décroissante</p>
          </div>
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Chauffeur, téléphone…" className="w-64" />
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">Aucune alerte</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Tous les contrats en prélèvement sur revenus sont à jour.
              </p>
            </div>
            <Link
              href="/contracts"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] dark:bg-[color:var(--muted)]"
            >
              <ArrowRight className="size-4" />
              Voir tous les contrats
            </Link>
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
            Aucun résultat pour « {search} »
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--border)]/60">
            {sorted.map((a) => (
              <AlertRow key={a.contractId} alert={a} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
