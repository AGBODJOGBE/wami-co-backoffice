"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CalendarDays, ChevronRight, Download, FileBarChart2, RefreshCw, Banknote } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { CanView } from "@/shared/ui/can-view";
import { toast } from "@/shared/ui/toast";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/shared/lib/csv";
import { formatDate, formatXof } from "@/shared/lib/format";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
  MANUAL_PAYMENT_METHOD_LABELS,
  type DailyCollectionLine,
  type DailyCollectionReport,
  type InstallmentStatus,
  type ManualPaymentMethod,
  type PaymentSource,
} from "../domain/contract";
import {
  generateDailyCollectionReportAction,
  recordManualPaymentAction,
} from "../application/actions";

// ─── Raccourcis de plages ─────────────────────────────────────────────────────

function getToday() { return new Date().toISOString().slice(0, 10); }

function addDays(base: string, days: number): string {
  const d = new Date(base + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(base: string): string {
  const d = new Date(base + "T12:00:00Z");
  const day = d.getUTCDay(); // 0=dim … 6=sam
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7)); // lundi
  return d.toISOString().slice(0, 10);
}

function startOfMonth(base: string): string {
  return base.slice(0, 7) + "-01";
}

interface DatePreset { label: string; from: string; to: string }

function getPresets(today: string): DatePreset[] {
  return [
    { label: "Aujourd'hui",      from: today,                to: today },
    { label: "Hier",             from: addDays(today, -1),   to: addDays(today, -1) },
    { label: "7 derniers jours", from: addDays(today, -6),   to: today },
    { label: "Cette semaine",    from: startOfWeek(today),   to: today },
    { label: "Ce mois",          from: startOfMonth(today),  to: today },
    { label: "Mois précédent",   from: startOfMonth(addDays(startOfMonth(today), -1)), to: addDays(startOfMonth(today), -1) },
  ];
}

// ─── Mode de collecte ────────────────────────────────────────────────────────

const PAYMENT_SOURCE_LABELS: Record<PaymentSource, string> = {
  AUTOMATIQUE: "Système",
  MANUEL:      "Manuel",
  INCONNU:     "—",
};

// ─── CSV export ───────────────────────────────────────────────────────────────

const CSV_COLUMNS: CsvColumn<DailyCollectionLine>[] = [
  { key: "dateEcheance",        header: "Date échéance",        value: (r) => formatDate(r.dateEcheance) },
  { key: "installmentNumero",   header: "N° échéance",          value: (r) => r.installmentNumero },
  { key: "driverName",          header: "Chauffeur",            value: (r) => r.driverName },
  { key: "driverPhone",         header: "Téléphone",            value: (r) => r.driverPhone },
  { key: "vehicleLicensePlate", header: "Plaque",               value: (r) => r.vehicleLicensePlate ?? "" },
  { key: "vehicleMake",         header: "Marque",               value: (r) => r.vehicleMake ?? "" },
  { key: "vehicleModel",        header: "Modèle",               value: (r) => r.vehicleModel ?? "" },
  { key: "statut",              header: "Statut",               value: (r) => INSTALLMENT_STATUS_LABELS[r.statut] ?? r.statut },
  { key: "montant",             header: "Montant dû (FCFA)",    value: (r) => r.montant },
  { key: "montantPaye",         header: "Imputé wallet (FCFA)", value: (r) => r.montantPaye },
  { key: "montantRecouvre",     header: "Encaissé cash (FCFA)", value: (r) => r.montantRecouvre },
  { key: "cashShortfall",       header: "En recouvrement (FCFA)", value: (r) => r.cashShortfall },
  { key: "retardJours",         header: "Retard (jours)",       value: (r) => r.retardJours ?? 0 },
  { key: "modeCollecte",        header: "Mode collecte",        value: (r) => PAYMENT_SOURCE_LABELS[r.paymentSource] },
  { key: "contractId",          header: "ID Contrat",           value: (r) => r.contractId },
  { key: "driverId",            header: "ID Chauffeur",         value: (r) => r.driverId },
];

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "primary" | "success" | "danger" | "warning";
}) {
  const accentClass = {
    primary: "border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
    danger:  "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5",
    warning: "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/5",
  }[accent ?? "primary"] ?? "";

  const valueClass = {
    primary: "text-[color:var(--foreground)]",
    success: "text-emerald-600 dark:text-emerald-400",
    danger:  "text-[color:var(--danger)]",
    warning: "text-[color:var(--warning)]",
  }[accent ?? "primary"] ?? "text-[color:var(--foreground)]";

  return (
    <div className={`rounded-xl border px-4 py-3 ${accentClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {label}
      </p>
      <p className={`mt-1.5 font-mono text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">{sub}</p>}
    </div>
  );
}

// ─── DailyCollectionReportPage ────────────────────────────────────────────────

// Statuts pour lesquels un paiement manuel est possible
// Doit correspondre à LADDER_ELIGIBLE_INSTALLMENT_STATUSES côté backend
// (exclut IMPAYEE/ANNULEE — terminal/bloqué, jamais avancé par le ladder).
// PAYEE est inclus : sous le modèle cash-basis, montantRestant peut être > 0.
// PARTIELLE conservé pour les données legacy pré-Lot D.
const PAYABLE_STATUSES: InstallmentStatus[] = [
  "EN_ATTENTE",
  "EN_RECOUVREMENT",
  "PARTIELLEMENT_RECOUVREE",
  "PAYEE",
  "PARTIELLE",
];

export function DailyCollectionReportPage() {
  const today = getToday();
  const presets = getPresets(today);

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);
  const [report,   setReport]   = useState<DailyCollectionReport | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [pending,  start]       = useTransition();

  // ── Paiement manuel ──────────────────────────────────────────────────────────
  const [payLine,   setPayLine]   = useState<DailyCollectionLine | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [method,    setMethod]    = useState<ManualPaymentMethod>("ESPECES");
  const [reference, setReference] = useState("");
  const [paying,    startPaying]  = useTransition();

  const payFormValid =
    !!amountStr && parseInt(amountStr, 10) > 0 && reference.trim().length > 0;

  const rangeValid = !!dateFrom && !!dateTo && dateFrom <= dateTo;

  function applyPreset(preset: DatePreset) {
    setDateFrom(preset.from);
    setDateTo(preset.to);
  }

  function openPay(line: DailyCollectionLine) {
    const suggested = Math.max(0, line.montant - line.montantRecouvre);
    setAmountStr(suggested > 0 ? String(suggested) : "");
    setMethod("ESPECES");
    setReference("");
    setPayLine(line);
  }

  function submitPay() {
    if (!payLine || !payFormValid) return;
    const amount = parseInt(amountStr.replace(/\s/g, ""), 10);
    startPaying(async () => {
      const r = await recordManualPaymentAction(
        payLine.contractId,
        amount,
        method,
        reference.trim(),
      );
      setPayLine(null);
      if (r.ok) {
        const settled      = r.data?.installmentsSettled ?? 0;
        const partial      = r.data?.installmentsPartiallyPaid ?? 0;
        const imputed      = r.data?.imputedAmount ?? 0;
        const totalAmount  = r.data?.amount ?? 0;

        let description: string;
        if (r.data?.contractCompleted) {
          description = "Contrat soldé et clôturé !";
        } else if (settled > 0 || partial > 0) {
          const parts = [
            settled > 0 ? `${settled} échéance${settled > 1 ? "s" : ""} soldée${settled > 1 ? "s" : ""}` : null,
            partial > 0 ? "1 partiellement soldée" : null,
          ].filter(Boolean);
          description = parts.join(" · ");
        } else if (imputed === 0 && totalAmount > 0) {
          // Tout le montant est allé en recouvrement de dette cash existante
          // (montantNonReconnu) — wallet crédité, aucune échéance avancée.
          description = `${formatXof(totalAmount)} crédité — recouvrement de dette cash (aucune échéance avancée)`;
        } else {
          description = r.message;
        }

        toast({
          kind: "success",
          title: "Paiement enregistré",
          description,
        });
        generate();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  function generate() {
    setError(null);
    start(async () => {
      const result = await generateDailyCollectionReportAction(dateFrom, dateTo);
      if (result.ok && result.data) {
        setReport(result.data);
      } else {
        setError(result.message);
        setReport(null);
      }
    });
  }

  function exportCsv() {
    if (!report) return;
    const suffix = report.dateFrom === report.dateTo
      ? report.dateFrom
      : `${report.dateFrom}_${report.dateTo}`;
    downloadCsv(
      timestampedFilename(`rapport-collecte-${suffix}`),
      CSV_COLUMNS,
      report.lines,
    );
  }

  const isSingleDay = dateFrom === dateTo;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rapport de collecte"
        description="Vue consolidée des échéances dues sur une période, avec montants imputés et encaissés cash."
        eyebrow="Finance · Contrats"
        dataSource="live"
      />

      {/* ── Sélecteur de période ── */}
      <Card>
        <div className="flex flex-col gap-4 px-5 py-4">

          {/* Raccourcis */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Période rapide
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const active = p.from === dateFrom && p.to === dateTo;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                        : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--muted-foreground)] hover:border-[color:var(--primary)]/40 hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates personnalisées + bouton */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Du
              </label>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[color:var(--muted-foreground)]" />
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || today}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                />
              </div>
            </div>

            <ChevronRight className="mb-1.5 size-4 flex-shrink-0 text-[color:var(--muted-foreground)]" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Au
              </label>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[color:var(--muted-foreground)]" />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={today}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                />
              </div>
            </div>

            {!rangeValid && dateFrom && dateTo && (
              <span className="mb-1 text-xs text-[color:var(--danger)]">
                La date de début doit être ≤ à la date de fin.
              </span>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={generate} disabled={!rangeValid || pending} isLoading={pending}>
                <RefreshCw className="size-4" />
                Générer
              </Button>

              {report && report.lines.length > 0 && (
                <Button variant="outline" onClick={exportCsv} disabled={pending}>
                  <Download className="size-4" />
                  CSV
                </Button>
              )}
            </div>

            {report && (
              <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">
                {report.contractsScanned} contrats scannés ·{" "}
                {report.totalLines} échéance{report.totalLines !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Avertissement workaround */}
        <div className="flex items-start gap-2 border-t border-[color:var(--border)] px-5 py-3">
          <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-[color:var(--warning)]" />
          <p className="text-[10px] text-[color:var(--muted-foreground)]">
            Le rapport est basé sur la <strong>date d&apos;échéance</strong> (dateEcheance), pas sur le moment
            réel de collecte. Un paiement enregistré en retard apparaîtra à la date initialement prévue,
            pas à la date du paiement.
          </p>
        </div>
      </Card>

      {/* ── Erreur ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/8 px-4 py-3 text-sm text-[color:var(--danger)]">
          <AlertTriangle className="size-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Résultats ── */}
      {report && (
        <>
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Montant dû"
              value={formatXof(report.totalDue)}
              sub={`${report.totalLines} échéance${report.totalLines !== 1 ? "s" : ""}`}
              accent="primary"
            />
            <KpiCard
              label="Imputé (wallet)"
              value={formatXof(report.totalImputed)}
              sub={`${report.totalDue > 0 ? Math.round((report.totalImputed / report.totalDue) * 100) : 0}% du total dû`}
              accent="success"
            />
            <KpiCard
              label="Encaissé cash"
              value={formatXof(report.totalCashCollected)}
              sub={`${report.totalImputed > 0 ? Math.round((report.totalCashCollected / report.totalImputed) * 100) : 0}% de l'imputé`}
              accent={report.totalCashShortfall > 0 ? "warning" : "success"}
            />
            <KpiCard
              label="En recouvrement"
              value={formatXof(report.totalCashShortfall)}
              sub="Imputé non encore encaissé en cash"
              accent={report.totalCashShortfall > 0 ? "danger" : "success"}
            />
          </div>

          {/* Breakdown statuts */}
          {Object.keys(report.byStatus).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(Object.entries(report.byStatus) as [InstallmentStatus, number][])
                .sort((a, b) => (a[1] < b[1] ? 1 : -1))
                .map(([status, count]) => (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px]"
                  >
                    <Badge tone={INSTALLMENT_STATUS_TONES[status]} className="text-[9px]">
                      {INSTALLMENT_STATUS_LABELS[status] ?? status}
                    </Badge>
                    <span className="font-semibold text-[color:var(--foreground)]">{count}</span>
                  </span>
                ))}
            </div>
          )}

          {/* Table */}
          {report.lines.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
                  <FileBarChart2 className="size-5 text-[color:var(--muted-foreground)]" />
                </div>
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  Aucune échéance sur cette période
                </p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  {isSingleDay
                    ? `Aucun contrat n'avait d'échéance le ${formatDate(report.dateFrom + "T00:00:00Z")}.`
                    : `Aucun contrat n'avait d'échéance entre le ${formatDate(report.dateFrom + "T00:00:00Z")} et le ${formatDate(report.dateTo + "T00:00:00Z")}.`}
                </p>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/30 text-left">
                      {([
                        { label: "Date",            align: "" },
                        { label: "N°",              align: "" },
                        { label: "Chauffeur",       align: "" },
                        { label: "Véhicule",        align: "" },
                        { label: "Statut",          align: "" },
                        { label: "Mode",            align: "" },
                        { label: "Montant dû",      align: "text-right" },
                        { label: "Imputé wallet",   align: "text-right" },
                        { label: "Encaissé cash",   align: "text-right" },
                        { label: "En recouvrement", align: "text-right" },
                        { label: "Retard",          align: "text-right" },
                        { label: "",                align: "" },
                      ] as const).map(({ label, align }, i) => (
                        <th
                          key={i}
                          className={`whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] ${align}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {report.lines.map((line) => {
                      const tone = INSTALLMENT_STATUS_TONES[line.statut];
                      const hasRetard = (line.retardJours ?? 0) > 0;
                      return (
                        <tr
                          key={`${line.contractId}-${line.installmentNumero}`}
                          className={`transition-colors hover:bg-[color:var(--muted)]/20 ${
                            line.statut === "IMPAYEE" ? "bg-[color:var(--danger)]/4" : ""
                          }`}
                        >
                          {/* Date */}
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[color:var(--muted-foreground)]">
                            {formatDate(line.dateEcheance)}
                          </td>

                          {/* N° */}
                          <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-[color:var(--foreground)]">
                            #{line.installmentNumero}
                          </td>

                          {/* Chauffeur */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col leading-tight">
                              <span className="font-medium text-[color:var(--foreground)]">
                                {line.driverName}
                              </span>
                              {line.driverPhone && (
                                <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                                  {line.driverPhone}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Véhicule */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex flex-col leading-tight">
                              <span className="text-[color:var(--foreground)]">
                                {[line.vehicleMake, line.vehicleModel].filter(Boolean).join(" ") || "—"}
                              </span>
                              {line.vehicleLicensePlate && (
                                <span className="font-mono text-[10px] font-semibold text-[color:var(--muted-foreground)]">
                                  {line.vehicleLicensePlate}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Statut */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge tone={tone}>
                              {INSTALLMENT_STATUS_LABELS[line.statut] ?? line.statut}
                            </Badge>
                          </td>

                          {/* Mode de collecte */}
                          <td className="whitespace-nowrap px-4 py-3">
                            {line.paymentSource === "AUTOMATIQUE" ? (
                              <Badge tone="info">Système</Badge>
                            ) : line.paymentSource === "MANUEL" ? (
                              <Badge tone="success">Manuel</Badge>
                            ) : (
                              <span className="text-[color:var(--muted-foreground)]">—</span>
                            )}
                          </td>

                          {/* Montant dû */}
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-[color:var(--foreground)]">
                            {formatXof(line.montant)}
                          </td>

                          {/* Imputé wallet */}
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                            <span className={line.montantPaye > 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-[color:var(--muted-foreground)]"}>
                              {line.montantPaye > 0 ? formatXof(line.montantPaye) : "—"}
                            </span>
                          </td>

                          {/* Encaissé cash */}
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                            <span className={line.montantRecouvre > 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-[color:var(--muted-foreground)]"}>
                              {line.montantRecouvre > 0 ? formatXof(line.montantRecouvre) : "—"}
                            </span>
                          </td>

                          {/* En recouvrement */}
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                            {line.cashShortfall > 0 ? (
                              <span className="font-semibold text-sky-600 dark:text-sky-400">
                                {formatXof(line.cashShortfall)}
                              </span>
                            ) : (
                              <span className="text-[color:var(--muted-foreground)]">—</span>
                            )}
                          </td>

                          {/* Retard */}
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {hasRetard ? (
                              <span className="font-semibold text-[color:var(--danger)]">
                                {line.retardJours}j
                              </span>
                            ) : (
                              <span className="text-[color:var(--muted-foreground)]">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="whitespace-nowrap px-3 py-2">
                            {PAYABLE_STATUSES.includes(line.statut) && line.cashShortfall > 0 && (
                              <CanView permission="contract.installment.manual_payment">
                                <button
                                  type="button"
                                  onClick={() => openPay(line)}
                                  disabled={paying}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/8 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-400"
                                >
                                  <Banknote className="size-3.5" />
                                  Payer
                                </button>
                              </CanView>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Totaux */}
                  <tfoot>
                    <tr className="border-t-2 border-[color:var(--border)] bg-[color:var(--muted)]/30">
                      <td colSpan={7} className="px-4 py-3 text-xs font-bold text-[color:var(--foreground)]">
                        Total ({report.totalLines} lignes)
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[color:var(--foreground)]">
                        {formatXof(report.totalDue)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatXof(report.totalImputed)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatXof(report.totalCashCollected)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                        {report.totalCashShortfall > 0 ? formatXof(report.totalCashShortfall) : "—"}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Modal paiement manuel ── */}
      <Modal
        open={!!payLine}
        onClose={() => !paying && setPayLine(null)}
        title="Paiement manuel"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayLine(null)} disabled={paying}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={submitPay}
              isLoading={paying}
              disabled={paying || !payFormValid}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        {payLine && (
          <>
            {/* Contexte — chauffeur + véhicule */}
            <div className="mb-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-4 py-3 text-xs">
              <div className="font-semibold text-[color:var(--foreground)]">
                {payLine.driverName}
                {payLine.driverPhone && (
                  <span className="ml-2 font-mono font-normal text-[color:var(--muted-foreground)]">
                    {payLine.driverPhone}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[color:var(--muted-foreground)]">
                Échéance #{payLine.installmentNumero} ·{" "}
                {[payLine.vehicleMake, payLine.vehicleModel, payLine.vehicleLicensePlate]
                  .filter(Boolean)
                  .join(" ")}
              </div>
              <div className="mt-1.5 flex gap-4 font-mono text-[11px]">
                <span>
                  Dû :{" "}
                  <strong className="text-[color:var(--foreground)]">
                    {formatXof(payLine.montant)}
                  </strong>
                </span>
                <span>
                  Déjà encaissé :{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatXof(payLine.montantRecouvre)}
                  </strong>
                </span>
              </div>
            </div>

            <p className="mb-4 text-sm text-[color:var(--muted-foreground)]">
              Le montant sera imputé sur les échéances ouvertes du contrat, de la plus ancienne
              à la plus récente.
            </p>

            <div className="flex flex-col gap-4">
              {/* Montant */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[color:var(--foreground)]">
                  Montant collecté (FCFA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Ex : 5 000"
                  autoFocus
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 font-mono text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20"
                />
                {amountStr && parseInt(amountStr, 10) > 0 && (
                  <span className="text-[11px] text-[color:var(--muted-foreground)]">
                    {formatXof(parseInt(amountStr, 10))}
                  </span>
                )}
              </div>

              {/* Mode de paiement */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[color:var(--foreground)]">
                  Mode de paiement <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(["ESPECES", "MOBILE_MONEY"] as ManualPaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        method === m
                          ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
                          : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--muted-foreground)] hover:border-[color:var(--primary)]/40"
                      }`}
                    >
                      {MANUAL_PAYMENT_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Référence */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[color:var(--foreground)]">
                  {method === "MOBILE_MONEY" ? "N° de transaction opérateur" : "N° de reçu"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && payFormValid && submitPay()}
                  placeholder={
                    method === "MOBILE_MONEY" ? "Ex : TXN-20240115-001" : "Ex : REC-2024-001"
                  }
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20"
                />
                <span className="text-[11px] text-[color:var(--muted-foreground)]">
                  {method === "MOBILE_MONEY"
                    ? "Numéro fourni par l'opérateur comme preuve du transfert."
                    : "Numéro du reçu papier remis au chauffeur."}
                </span>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
