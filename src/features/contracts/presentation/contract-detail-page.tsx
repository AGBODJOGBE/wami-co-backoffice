"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarX2,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  PauseCircle,
  Play,
  ShieldAlert,
  ShieldOff,
  TrendingDown,
  Unlock,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/shared/lib/csv";
import {
  AUDIT_LOG_ACTION_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  INSTALLMENT_STATUS_LABELS,
  MANUAL_PAYMENT_METHOD_LABELS,
  MODE_REMBOURSEMENT_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  driverFullName,
  formatXof,
  isPartialStatus,
  vehicleLabel,
  type Contract,
  type ContractAuditLog,
  type ContractInstallment,
  type ContractStatus,
  type InstallmentStatus,
  type ManualPaymentMethod,
  type RevenueShareWithholdingsResult,
} from "../domain/contract";
import {
  recordManualPaymentAction,
  resumeContractAction,
  unblockDriverAction,
} from "../application/actions";
import { RevenueShareSection } from "./revenue-share-section";
import { Modal } from "@/shared/ui/modal";
import type { AdminWallet } from "@/features/wallet/domain/wallet";
import { ContractBreakModal } from "./contract-break-modal";
import { ContractSuspendModal } from "./contract-suspend-modal";
import { CanView } from "@/shared/ui/can-view";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ─── Colonnes CSV échéancier ──────────────────────────────────────────────────

const INSTALLMENT_CSV_COLUMNS: CsvColumn<ContractInstallment>[] = [
  { key: "numero",          header: "N°",                   value: (r) => r.numero },
  { key: "dateEcheance",    header: "Date échéance",         value: (r) => formatDate(r.dateEcheance) },
  { key: "montant",         header: "Montant (FCFA)",        value: (r) => r.montant },
  { key: "montantPaye",     header: "Imputé (FCFA)",         value: (r) => r.montantPaye ?? "" },
  { key: "montantRecouvre", header: "Encaissé cash (FCFA)",  value: (r) => r.montantRecouvre ?? "" },
  { key: "montantRestant",  header: "Restant (FCFA)",        value: (r) => r.montantRestant ?? "" },
  { key: "statut",          header: "Statut",                value: (r) => INSTALLMENT_STATUS_LABELS[r.status] ?? r.status },
  { key: "datePaiement",    header: "Date paiement",         value: (r) => r.datePaiement ? formatDate(r.datePaiement) : "" },
  { key: "penalite",        header: "Pénalité (FCFA)",       value: (r) => r.penalite ?? 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOverdueInfo(row: ContractInstallment, toleranceDays: number) {
  if (row.status !== "EN_ATTENTE" || !row.dateEcheance) return null;
  const due = new Date(row.dateEcheance);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (diffDays <= 0) return null;
  return { diffDays, daysUntilImpayee: Math.max(0, toleranceDays - diffDays + 1) };
}

function isFuture(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d > t;
}

// ─── Stat card mini ───────────────────────────────────────────────────────────

function KpiBlock({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const colors: Record<string, string> = {
    neutral: "text-[color:var(--foreground)]",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger:  "text-red-600 dark:text-red-400",
    primary: "text-[color:var(--primary)]",
  };
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
        {label}
      </span>
      <span className={`font-mono text-2xl font-bold leading-none ${colors[tone]}`}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-[color:var(--muted-foreground)]">{sub}</span>
      )}
    </div>
  );
}

// ─── Barre de progression ─────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--muted)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--primary)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs font-semibold text-[color:var(--primary)]">
        {pct}%
      </span>
    </div>
  );
}

// ─── Timeline d'audit ─────────────────────────────────────────────────────────

const AUDIT_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  CONTRACT_CREATED:             { icon: FileText,      color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
  CONTRACT_RESUMED:             { icon: Play,          color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  CONTRACT_SUSPENDED:           { icon: PauseCircle,   color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
  CONTRACT_TERMINATED:          { icon: CheckCircle2,  color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  CONTRACT_BROKEN:              { icon: XCircle,       color: "text-red-500 bg-red-50 dark:bg-red-950/40" },
  INSTALLMENT_PAID:             { icon: CheckCircle2,  color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  INSTALLMENT_PARTIALLY_PAID:   { icon: PauseCircle,   color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
  INSTALLMENT_UNPAID:           { icon: AlertTriangle, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
  INSTALLMENT_RECOVERY_RESTORED:{ icon: CheckCircle2,  color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
  INSTALLMENT_LOCKED_DEFAULTED: { icon: AlertTriangle, color: "text-red-500 bg-red-50 dark:bg-red-950/40" },
  DRIVER_BLOCKED:               { icon: ShieldAlert,   color: "text-red-500 bg-red-50 dark:bg-red-950/40" },
  DRIVER_UNBLOCKED:             { icon: Unlock,        color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  MANUAL_PAYMENT_RECORDED:      { icon: CheckCircle2,  color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
  CONTRACT_DEBT_RECONCILED:     { icon: ShieldAlert,   color: "text-violet-500 bg-violet-50 dark:bg-violet-950/40" },
  PLATFORM_REVENUE_RECOGNIZED:  { icon: TrendingDown,  color: "text-violet-500 bg-violet-50 dark:bg-violet-950/40" },
  CAUTION_RESTITUEE:            { icon: CheckCircle2,  color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
};

// ─── Formateur de détails d'audit ─────────────────────────────────────────────

const AUDIT_DETAIL_KEY_LABELS: Record<string, string> = {
  montantPaye:            "Imputé",
  montantRecouvre:        "Encaissé",
  montantRestant:         "Restant",
  montantRestantEcheance: "Restant éch.",
  montantTotal:           "Total",
  montant:                "Montant",
  montantEcheance:        "Montant éch.",
  imputedAmount:          "Imputé",
  debtAmount:             "Dette",
  amount:                 "Montant",
  walletBalance:          "Solde wallet",
  numeroEcheance:         "Échéance",
  installmentNumber:      "Échéance",
  installmentsSettled:    "Soldées",
  installmentsPartiallyPaid: "Partielles",
  contractCompleted:      "Contrat soldé",
  nbImpayes:              "Impayées",
  threshold:              "Seuil",
  reason:                 "Motif",
  recoveredAmount:        "Recouvré",
  platformShare:          "Part PLATFORM",
  montantNonReconnuAvant: "Non reconnu avant",
  montantNonReconnuApres: "Non reconnu après",
  paymentMethod:          "Mode paiement",
  reference:              "Référence",
};

const AMOUNT_KEYS = new Set([
  "montantPaye", "montantRecouvre", "montantRestant", "montantRestantEcheance",
  "montantTotal", "montant", "montantEcheance", "imputedAmount", "debtAmount",
  "amount", "walletBalance", "recoveredAmount", "platformShare",
  "montantNonReconnuAvant", "montantNonReconnuApres",
]);

const PAYMENT_METHOD_DISPLAY: Record<string, string> = {
  ESPECES:      "Espèces",
  MOBILE_MONEY: "Mobile Money",
};

function formatAuditDetailValue(key: string, value: unknown): string {
  if (AMOUNT_KEYS.has(key) && typeof value === "number") return formatXof(value);
  if (typeof value === "boolean") return value ? "oui" : "non";
  if ((key === "numeroEcheance" || key === "installmentNumber") && value != null) return `#${value}`;
  if (key === "paymentMethod" && typeof value === "string") return PAYMENT_METHOD_DISPLAY[value] ?? value;
  return String(value);
}

function renderAuditDetails(details: Record<string, unknown>): string {
  return Object.entries(details)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${AUDIT_DETAIL_KEY_LABELS[k] ?? k} : ${formatAuditDetailValue(k, v)}`)
    .join(" · ");
}

// ─── Ligne d'échéance ─────────────────────────────────────────────────────────

function InstallmentRow({
  row,
  isLast,
  onPaySuggested,
  disabled,
  toleranceDays,
}: {
  row: ContractInstallment;
  isLast: boolean;
  onPaySuggested: (amount: number) => void;
  disabled: boolean;
  toleranceDays: number;
}) {
  const overdue  = getOverdueInfo(row, toleranceDays);
  const future   = row.status === "EN_ATTENTE" && isFuture(row.dateEcheance);
  const isPartial = isPartialStatus(row.status);

  // Connecteur vertical
  const connectorColor =
    row.status === "PAYEE"               ? "bg-emerald-400"
    : row.status === "IMPAYEE"           ? "bg-red-400"
    : row.status === "EN_RECOUVREMENT"   ? "bg-sky-400"
    : isPartial                          ? "bg-amber-400"
    : overdue                            ? "bg-amber-400"
    : "bg-[color:var(--border)]";

  // Icone du statut
  const StatusIcon =
    row.status === "PAYEE"               ? CheckCircle2
    : row.status === "IMPAYEE"           ? AlertTriangle
    : row.status === "ANNULEE"           ? XCircle
    : row.status === "EN_RECOUVREMENT"   ? TrendingDown
    : isPartial                          ? PauseCircle
    : overdue                            ? AlertTriangle
    : Clock;

  const iconColor =
    row.status === "PAYEE"               ? "text-emerald-500"
    : row.status === "IMPAYEE"           ? "text-red-500"
    : row.status === "ANNULEE"           ? "text-[color:var(--muted-foreground)]"
    : row.status === "EN_RECOUVREMENT"   ? "text-sky-500"
    : isPartial                          ? "text-amber-500"
    : overdue                            ? "text-amber-500"
    : "text-[color:var(--muted-foreground)]";

  const rowBg =
    row.status === "PAYEE"               ? "bg-emerald-50/40 dark:bg-emerald-950/10"
    : row.status === "IMPAYEE"           ? "bg-red-50/60 dark:bg-red-950/20"
    : row.status === "EN_RECOUVREMENT"   ? "bg-sky-50/40 dark:bg-sky-950/10"
    : isPartial                          ? "bg-amber-50/60 dark:bg-amber-950/20"
    : overdue                            ? "bg-amber-50/60 dark:bg-amber-950/20"
    : "";

  // Montant affiché à droite
  const displayedAmount =
    isPartial && row.montantPaye != null
      ? formatXof(row.montantRestant ?? (row.montant - row.montantPaye))
      : formatXof(row.montant);

  const amountColor =
    row.status === "PAYEE"              ? "text-emerald-600 dark:text-emerald-400"
    : row.status === "IMPAYEE"          ? "text-red-600 dark:text-red-400"
    : row.status === "EN_RECOUVREMENT"  ? "text-sky-600 dark:text-sky-400"
    : isPartial                         ? "text-amber-600 dark:text-amber-400"
    : "text-[color:var(--foreground)]";

  // Badge tone
  const badgeTone =
    row.status === "PAYEE"              ? "success"
    : row.status === "IMPAYEE"          ? "danger"
    : row.status === "EN_RECOUVREMENT"  ? "info"
    : isPartial                         ? "warning"
    : row.status === "ANNULEE"          ? "neutral"
    : overdue                           ? "warning"
    : "neutral" as const;

  // Action button: montrer si imputable ou à régler
  const showPayButton =
    row.status === "EN_ATTENTE" ||
    row.status === "IMPAYEE"    ||
    isPartial                   ||
    (row.status === "EN_RECOUVREMENT" && (row.montantRestant ?? 0) > 0);

  const payButtonLabel =
    row.status === "IMPAYEE"          ? "Régler"
    : row.status === "EN_RECOUVREMENT"? "Compléter"
    : isPartial                       ? "Compléter"
    : "Avancer";

  const payButtonVariant =
    (row.status === "IMPAYEE" || isPartial) ? "primary" : "outline";

  return (
    <div className={`relative flex gap-4 px-5 py-3 transition-colors ${rowBg} ${row.status === "ANNULEE" ? "opacity-40" : ""}`}>
      {/* Connecteur vertical */}
      <div className="flex flex-col items-center">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm dark:border-[color:var(--background)] dark:bg-[color:var(--background)]">
          <StatusIcon className={`size-4 ${iconColor}`} />
        </div>
        {!isLast && (
          <div className={`mt-1 w-0.5 flex-1 ${connectorColor}`} style={{ minHeight: "24px" }} />
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1 pb-2">
        <div className="flex flex-col leading-tight">
          {/* Numéro + date */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-[color:var(--muted-foreground)]">
              #{String(row.numero).padStart(2, "0")}
            </span>
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {formatDate(row.dateEcheance)}
            </span>
            {row.status === "PAYEE" && row.datePaiement && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                · payé le {formatDate(row.datePaiement)}
              </span>
            )}
            {future && (
              <span className="text-[10px] text-[color:var(--muted-foreground)]">· à venir</span>
            )}
          </div>

          {/* Alerte retard / tolérance */}
          {overdue && row.status === "EN_ATTENTE" && (
            <div className="mt-0.5 flex items-center gap-1">
              {overdue.daysUntilImpayee <= 0 ? (
                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  Passage IMPAYÉE imminent — {overdue.diffDays} j de retard
                </span>
              ) : (
                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                  {overdue.diffDays} j de retard · IMPAYÉE dans{" "}
                  <strong>{overdue.daysUntilImpayee} j</strong>
                </span>
              )}
            </div>
          )}

          {/* IMPAYEE */}
          {row.status === "IMPAYEE" && (() => {
            const retard = row.retardJours ?? 0;
            return (
              <div className="mt-0.5 flex flex-col gap-0">
                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  Échéance impayée — paiement manuel requis
                  {retard > 0 && <span className="ml-1 font-normal">· {retard} j de retard</span>}
                </span>
                {row.penalite != null && row.penalite > 0 && (
                  <span className="text-[11px] text-red-500 dark:text-red-400">
                    Pénalité : <strong>{formatXof(row.penalite)}</strong>
                  </span>
                )}
              </div>
            );
          })()}

          {/* EN_RECOUVREMENT — imputation faite, recouvrement cash en cours */}
          {row.status === "EN_RECOUVREMENT" && row.montantPaye != null && (() => {
            const recouvre = row.montantRecouvre ?? 0;
            const pct = row.montantPaye > 0 ? Math.min(100, Math.round((recouvre / row.montantPaye) * 100)) : 0;
            return (
              <div className="mt-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-900/40">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">{pct}% encaissé</span>
                </div>
                <span className="text-[11px] text-sky-700 dark:text-sky-300">
                  {formatXof(row.montantPaye)} imputé ·{" "}
                  {recouvre > 0
                    ? <><strong>{formatXof(recouvre)}</strong> encaissé cash</>
                    : <span className="italic">recouvrement en attente</span>
                  }
                </span>
              </div>
            );
          })()}

          {/* PARTIELLEMENT_RECOUVREE ou PARTIELLE
               Deux cas distincts sous ce même statut :
               A) wallet partiellement débité (restant > 0) — imputation pas terminée
               B) wallet 100% débité (restant = 0) mais encaissement cash partiel
                  → cashShortfall = montantPaye − montantRecouvre est le montant "en recouvrement"
          */}
          {isPartial && row.montantPaye != null && (() => {
            const restantWallet  = row.montantRestant ?? (row.montant - row.montantPaye);
            const recouvre       = row.montantRecouvre ?? 0;
            const cashShortfall  = Math.max(0, row.montantPaye - recouvre);
            const fullyImputed   = restantWallet === 0;
            const pct = row.montant > 0 ? Math.min(100, Math.round((row.montantPaye / row.montant) * 100)) : 0;
            return (
              <div className="mt-1 flex flex-col gap-0.5">
                {/* Barre de progression imputation */}
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/40">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {pct}% imputé
                  </span>
                </div>

                {/* Cas A — wallet pas encore entièrement débité */}
                {!fullyImputed && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    {formatXof(row.montantPaye)} imputé ·{" "}
                    <strong className="text-amber-800 dark:text-amber-200">
                      {formatXof(restantWallet)}
                    </strong>{" "}
                    à imputer (wallet)
                  </span>
                )}

                {/* Cas B — wallet totalement débité, recouvrement cash partiel */}
                {fullyImputed && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    {formatXof(row.montantPaye)} totalement imputé ·{" "}
                    {recouvre > 0
                      ? <><strong className="text-sky-700 dark:text-sky-300">{formatXof(recouvre)}</strong> encaissé cash</>
                      : <span className="italic">aucun encaissement cash</span>
                    }
                  </span>
                )}

                {/* Delta cash manquant — toujours visible si le shortfall > 0 */}
                {cashShortfall > 0 && (
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    {formatXof(cashShortfall)} en recouvrement cash (non encore encaissé)
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Droite : montant + badge + action */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0">
            <span className={`font-mono text-sm font-semibold ${amountColor}`}>
              {displayedAmount}
            </span>
            {isPartial && row.montantPaye != null && (
              <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                sur {formatXof(row.montant)}
              </span>
            )}
          </div>
          <Badge tone={badgeTone}>
            {INSTALLMENT_STATUS_LABELS[row.status as InstallmentStatus] ?? row.status}
          </Badge>
          {showPayButton && (
            <CanView permission="contract.installment.manual_payment">
              <Button
                size="sm"
                variant={payButtonVariant}
                onClick={() => onPaySuggested(row.montantRestant ?? row.montant)}
                disabled={disabled}
              >
                {payButtonLabel}
              </Button>
            </CanView>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

interface Props {
  contract: Contract;
  installments: ContractInstallment[];
  auditLogs?: ContractAuditLog[];
  toleranceDays?: number;
  earningsWallet?: AdminWallet | null;
  revenueShareWithholdings?: RevenueShareWithholdingsResult | null;
}

export function ContractDetailPage({
  contract,
  installments,
  auditLogs = [],
  toleranceDays = 3,
  earningsWallet = null,
  revenueShareWithholdings = null,
}: Props) {
  const router = useRouter();
  const [breakOpen, setBreakOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [manualPayOpen, setManualPayOpen] = useState(false);
  const [manualPayAmountStr, setManualPayAmountStr] = useState("");
  const [manualPayMethod, setManualPayMethod] = useState<ManualPaymentMethod>("ESPECES");
  const [manualPayReference, setManualPayReference] = useState("");
  const [unblocking, startUnblock] = useTransition();
  const [resuming, startResume] = useTransition();
  const [paying, startPaying] = useTransition();
  const [showAllInstallments, setShowAllInstallments] = useState(false);

  const canBreak = contract.status === "ACTIVE" || contract.status === "SUSPENDED";

  function openManualPay(suggestedAmount?: number) {
    setManualPayAmountStr(suggestedAmount != null ? String(suggestedAmount) : "");
    setManualPayReference("");
    setManualPayMethod("ESPECES");
    setManualPayOpen(true);
  }

  function submitManualPayment() {
    const amount = parseInt(manualPayAmountStr.replace(/\s/g, ""), 10);
    if (!amount || amount <= 0) return;
    if (!manualPayReference.trim()) return;
    startPaying(async () => {
      const r = await recordManualPaymentAction(
        contract.contractId,
        amount,
        manualPayMethod,
        manualPayReference.trim(),
      );
      setManualPayOpen(false);
      if (r.ok) {
        const settled = r.data?.installmentsSettled ?? 0;
        const partial = r.data?.installmentsPartiallyPaid ?? 0;
        const parts = [
          settled > 0 ? `${settled} échéance${settled > 1 ? "s" : ""} soldée${settled > 1 ? "s" : ""}` : null,
          partial > 0 ? `${partial} partielle${partial > 1 ? "s" : ""}` : null,
          r.data?.contractCompleted ? "Contrat terminé !" : null,
        ].filter(Boolean);
        toast({
          kind: "success",
          title: "Paiement enregistré",
          description: parts.length > 0 ? parts.join(" · ") : r.message,
        });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  function handleUnblock() {
    startUnblock(async () => {
      const r = await unblockDriverAction(contract.driver.driverId, contract.contractId);
      if (r.ok) {
        toast({ kind: "success", title: "Chauffeur débloqué", description: r.message });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  function handleResume(reason?: string) {
    startResume(async () => {
      const r = await resumeContractAction(contract.contractId, reason);
      if (r.ok) {
        setResumeOpen(false);
        toast({ kind: "success", title: "Contrat repris", description: r.message });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  // ── Stats d'avancement ──────────────────────────────────────────────────────
  const paid         = installments.filter((i) => i.status === "PAYEE").length;
  const unpaid       = installments.filter((i) => i.status === "IMPAYEE").length;
  const inRecovery   = installments.filter((i) => i.status === "EN_RECOUVREMENT").length;
  const partial      = installments.filter((i) => isPartialStatus(i.status)).length;
  const pending      = installments.filter((i) => i.status === "EN_ATTENTE").length;
  const total        = installments.length;

  const fullyPaidAmt  = installments.filter((i) => i.status === "PAYEE").reduce((s, i) => s + i.montant, 0);
  const partialPaidAmt= installments.filter((i) => isPartialStatus(i.status)).reduce((s, i) => s + (i.montantPaye ?? 0), 0);
  const inRecoveryAmt = installments.filter((i) => i.status === "EN_RECOUVREMENT").reduce((s, i) => s + i.montant, 0);
  const paidAmt       = contract.montantPaye ?? (fullyPaidAmt + partialPaidAmt + inRecoveryAmt);
  const remainingAmt  = contract.montantRestant ?? Math.max(0, contract.montantTotal - paidAmt);

  // Cash-basis — dette non encore encaissée côté PLATFORM
  const montantNonReconnu = contract.montantNonReconnu ?? 0;
  // Total à recouvrer = non encore imputé (wallet) + imputé mais pas encore encaissé en cash
  const resteARecouvrer = contract.resteARecouvrer ?? (remainingAmt + montantNonReconnu);

  // Impayés + EN_RECOUVREMENT en tête de liste (nécessitent une action / surveillance)
  const overdueOrUnpaid = installments.filter(
    (i) => i.status === "IMPAYEE" || isPartialStatus(i.status) || getOverdueInfo(i, toleranceDays) !== null,
  );
  const PREVIEW_COUNT = 15;
  const displayedInstallments = showAllInstallments
    ? installments
    : installments.slice(0, PREVIEW_COUNT);

  const auditSorted = useMemo(
    () => [...auditLogs].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    [auditLogs],
  );

  const manualPayFormValid =
    !!manualPayAmountStr &&
    parseInt(manualPayAmountStr, 10) > 0 &&
    manualPayReference.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 border-b border-[color:var(--border)] pb-6">
        <Link
          href="/contracts"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
        >
          <ArrowLeft className="size-4" />
          Retour aux contrats
        </Link>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Contrat location-vente
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
                {driverFullName(contract.driver)}
                <span className="mx-2 font-light text-[color:var(--muted-foreground)]">·</span>
                {vehicleLabel(contract.vehicle)}
              </h1>
              <Badge tone={CONTRACT_STATUS_TONES[contract.status as ContractStatus]}>
                {CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status}
              </Badge>
              <Badge tone={contract.modeRemboursement === "PAR_REVENU" ? "info" : "neutral"}>
                {contract.modeRemboursement === "PAR_REVENU" && contract.tauxPrelevementRevenu != null
                  ? `${MODE_REMBOURSEMENT_LABELS.PAR_REVENU} (${Math.round(contract.tauxPrelevementRevenu * 100)}%)`
                  : MODE_REMBOURSEMENT_LABELS[contract.modeRemboursement]}
              </Badge>
            </div>
            <span className="text-sm text-[color:var(--muted-foreground)]">
              #{(contract.contractId ?? "").slice(0, 12)} · Créé le {formatDate(contract.createdAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {contract.status === "SUSPENDED" && (
              <CanView permission="contract.resume">
                <Button variant="outline" size="sm" onClick={() => setResumeOpen(true)} disabled={resuming}>
                  {resuming ? <Spinner size="sm" /> : <Play className="size-4" />}
                  Reprendre
                </Button>
              </CanView>
            )}
            {contract.status === "ACTIVE" && (
              <CanView permission="contract.suspend">
                <Button variant="outline" size="sm" onClick={() => setSuspendOpen(true)}>
                  <PauseCircle className="size-4" />
                  Suspendre
                </Button>
              </CanView>
            )}
            {(contract.status === "ACTIVE" || contract.status === "SUSPENDED") && (
              <CanView permission="contract.driver.unblock">
                <Button variant="outline" size="sm" onClick={handleUnblock} disabled={unblocking}>
                  {unblocking ? <Spinner size="sm" /> : <Unlock className="size-4" />}
                  Débloquer le chauffeur
                </Button>
              </CanView>
            )}
            {canBreak && (
              <CanView permission="contract.break">
                <Button variant="danger" size="sm" onClick={() => setBreakOpen(true)}>
                  <ShieldOff className="size-4" />
                  Résilier le contrat
                </Button>
              </CanView>
            )}
          </div>
        </div>
      </div>

      {/* ── Alertes ── */}
      {contract.status === "SUSPENDED" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-800 dark:bg-red-950/30">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Chauffeur bloqué — contrat suspendu
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">
              {(contract.nbImpayes ?? 0) > 0
                ? `${contract.nbImpayes} échéance${(contract.nbImpayes ?? 0) > 1 ? "s" : ""} impayée${(contract.nbImpayes ?? 0) > 1 ? "s" : ""} — le driver ne peut plus passer en ligne.`
                : "Le driver ne peut plus passer en ligne jusqu'au règlement des impayés."}
            </p>
          </div>
        </div>
      )}

      {/* Alerte cash-basis : dette non encore encaissée côté PLATFORM */}
      {montantNonReconnu > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 dark:border-sky-800 dark:bg-sky-950/30">
          <TrendingDown className="mt-0.5 size-5 shrink-0 text-sky-500" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
              Recouvrement cash en cours — {formatXof(montantNonReconnu)}
            </p>
            <p className="text-xs text-sky-600/80 dark:text-sky-400/80">
              Ce montant a été imputé sur l'échéancier via le wallet du chauffeur (découvert autorisé),
              mais n'a pas encore été encaissé en cash par la plateforme. Le recouvrement est progressif
              à chaque crédit de gains du chauffeur.
            </p>
          </div>
        </div>
      )}

      {contract.breakReason && (
        <div className="flex items-start gap-3 rounded-xl border border-[color:var(--danger)]/30 bg-red-50 px-5 py-4 dark:bg-red-500/10">
          <XCircle className="mt-0.5 size-5 shrink-0 text-[color:var(--danger)]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--danger)]">
              Motif de résiliation
            </p>
            <p className="mt-0.5 text-sm text-[color:var(--foreground)]">{contract.breakReason}</p>
          </div>
        </div>
      )}

      {/* ── Hero financier ── */}
      <Card className="overflow-hidden p-0">
        <div className={`h-1.5 w-full ${unpaid > 0 ? "bg-red-500" : paid === total ? "bg-emerald-500" : "bg-[color:var(--primary)]"}`} />

        <div className="grid gap-0 divide-y divide-[color:var(--border)] sm:grid-cols-4 sm:divide-x sm:divide-y-0 p-0">
          {/* Montant total */}
          <div className="flex flex-col gap-1 p-5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Montant total
            </span>
            <span className="font-mono text-xl font-bold text-[color:var(--foreground)]">
              {formatXof(contract.montantTotal)}
            </span>
            {contract.prixAchat != null && (
              <span className="text-xs text-[color:var(--muted-foreground)]">
                Achat {formatXof(contract.prixAchat)} · marge {contract.tauxInteret}%
              </span>
            )}
          </div>

          {/* Imputé (= débit wallet total) */}
          <div className="flex flex-col gap-1 p-5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Imputé (wallet)
            </span>
            <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatXof(paidAmt)}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {paid} payée{paid > 1 ? "s" : ""}
              {inRecovery > 0 && <span className="ml-1 font-medium text-sky-600 dark:text-sky-400">· {inRecovery} en recouv.</span>}
              {partial > 0 && <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">· {partial} partielle{partial > 1 ? "s" : ""}</span>}
              {" "}/{" "}{total}
            </span>
          </div>

          {/* Encaissé cash (hors découvert) */}
          <div className="flex flex-col gap-1 p-5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Encaissé cash
            </span>
            <span className={`font-mono text-xl font-bold ${montantNonReconnu > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {formatXof(contract.montantRecouvre ?? Math.max(0, paidAmt - montantNonReconnu))}
            </span>
            {montantNonReconnu > 0 && (
              <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                {formatXof(montantNonReconnu)} en recouvrement
              </span>
            )}
          </div>

          {/* Reste à recouvrer (wallet non imputé + imputé non encaissé) */}
          <div className="flex flex-col justify-between gap-3 p-5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Reste à recouvrer
            </span>
            <div className="flex flex-col gap-2">
              <span className={`font-mono text-xl font-bold ${resteARecouvrer > 0 ? "text-[color:var(--danger)]" : "text-emerald-600 dark:text-emerald-400"}`}>
                {resteARecouvrer > 0 ? formatXof(resteARecouvrer) : "Soldé"}
              </span>
              {resteARecouvrer > 0 && (
                <div className="flex flex-col gap-0.5 text-[10px] text-[color:var(--muted-foreground)]">
                  {remainingAmt > 0 && <span>{formatXof(remainingAmt)} non imputé (wallet)</span>}
                  {montantNonReconnu > 0 && <span>{formatXof(montantNonReconnu)} imputé, cash à collecter</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Revenue share (remboursement par prélèvement) ── */}
      <RevenueShareSection contract={contract} withholdings={revenueShareWithholdings} />

      {/* ── Infos ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contrat */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--primary-soft)]">
              <FileText className="size-4 text-[color:var(--primary)]" />
            </div>
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Contrat</h3>
          </div>
          <dl className="flex flex-col gap-3">
            {[
              { label: "Fréquence", value: PAYMENT_FREQUENCY_LABELS[contract.frequencePaiement] },
              { label: "Durée", value: `${contract.dureeMois} mois` },
              { label: "Début", value: formatDate(contract.dateDebut) },
              {
                label: "Fin estimée",
                value: contract.dateFin ? formatDate(contract.dateFin) : `${contract.dureeMois} mois`,
              },
              {
                label: "Caution",
                value: contract.montantCaution != null ? formatXof(contract.montantCaution) : "—",
              },
              {
                label: "Caution restituée",
                value: contract.cautionRestituee != null
                  ? (contract.cautionRestituee
                      ? <span className="font-medium text-emerald-600 dark:text-emerald-400">Oui</span>
                      : <span className="text-[color:var(--muted-foreground)]">Non</span>)
                  : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-2">
                <dt className="text-xs text-[color:var(--muted-foreground)]">{label}</dt>
                <dd className="text-right text-xs font-medium text-[color:var(--foreground)]">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Driver */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
              <User className="size-4 text-sky-500" />
            </div>
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Chauffeur</h3>
          </div>
          <dl className="flex flex-col gap-3">
            {[
              { label: "Nom complet", value: driverFullName(contract.driver) || "—" },
              { label: "Téléphone", value: contract.driver.phoneNumber ?? "—" },
              { label: "Driver ID", value: <span className="font-mono text-[10px]">{(contract.driver.driverId ?? "").slice(0, 16) || "—"}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-2">
                <dt className="text-xs text-[color:var(--muted-foreground)]">{label}</dt>
                <dd className="text-right text-xs font-medium text-[color:var(--foreground)]">{value}</dd>
              </div>
            ))}
          </dl>
          {earningsWallet != null && (
            <div className={`mt-4 rounded-lg border px-3 py-2.5 ${
              earningsWallet.totalBalance < 0
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
                  Solde Gains
                </span>
                <span className={`font-mono text-sm font-bold ${
                  earningsWallet.totalBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {earningsWallet.totalBalance < 0 ? "−" : "+"}{formatXof(Math.abs(earningsWallet.totalBalance))}
                </span>
              </div>
              {earningsWallet.totalBalance < 0 && (
                <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                  Le driver doit <strong>{formatXof(Math.abs(earningsWallet.totalBalance))}</strong> à la plateforme — bloqué jusqu'au remboursement
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Véhicule */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <Car className="size-4 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Véhicule</h3>
          </div>
          <dl className="flex flex-col gap-3">
            {[
              { label: "Marque / Modèle", value: `${contract.vehicle.make ?? "—"} ${contract.vehicle.model ?? ""}`.trim() },
              { label: "Immatriculation", value: contract.vehicle.licensePlate ? <span className="font-mono text-xs uppercase">{contract.vehicle.licensePlate}</span> : "—" },
              { label: "Type", value: contract.vehicle.vehicleType ?? "—" },
              { label: "Véhicule ID", value: <span className="font-mono text-[10px]">{(contract.vehicle.vehicleId ?? "").slice(0, 16) || "—"}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-2">
                <dt className="text-xs text-[color:var(--muted-foreground)]">{label}</dt>
                <dd className="text-right text-xs font-medium text-[color:var(--foreground)]">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* ── Règles de paiement ── */}
      <div className="flex flex-wrap gap-3">
        {contract.frequencePaiement === "JOURNALIER" && (
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]/50 px-4 py-1.5">
            <CalendarX2 className="size-3.5 text-[color:var(--muted-foreground)]" />
            <span className="text-xs text-[color:var(--muted-foreground)]">
              Dimanches exclus — dates décalées au lundi automatiquement
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 dark:border-amber-800 dark:bg-amber-950/30">
          <Clock className="size-3.5 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Tolérance de paiement : <strong>{toleranceDays} jour{toleranceDays > 1 ? "s" : ""}</strong> — IMPAYÉE au {toleranceDays + 1}e jour de retard
          </span>
        </div>
      </div>

      {/* ── Échéancier timeline ── */}
      <Card className="overflow-hidden p-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
              Échéancier
              {contract.frequencePaiement === "JOURNALIER" ? " · dimanches exclus" : ""}
            </h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {total} échéances · {paid} payées
              {inRecovery > 0 && (
                <span className="ml-1 font-semibold text-sky-600 dark:text-sky-400">
                  · {inRecovery} en recouvrement
                </span>
              )}
              {partial > 0 && (
                <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">
                  · {partial} partielle{partial > 1 ? "s" : ""}
                </span>
              )}
              {unpaid > 0 && (
                <span className="ml-1 font-semibold text-red-600 dark:text-red-400">
                  · {unpaid} impayée{unpaid > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CanView permission="contract.installment.manual_payment">
              {(contract.status === "ACTIVE" || contract.status === "SUSPENDED") && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openManualPay()}
                  disabled={paying}
                >
                  {paying ? <Spinner size="sm" /> : null}
                  Paiement manuel
                </Button>
              )}
            </CanView>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  timestampedFilename(`echeancier-${contract.contractId.slice(0, 8)}`),
                  INSTALLMENT_CSV_COLUMNS,
                  installments,
                )
              }
              disabled={installments.length === 0}
            >
              <Download className="size-4" />
              Exporter
            </Button>
          </div>
          {/* Légende */}
          <div className="hidden w-full sm:flex sm:w-auto items-center gap-3 text-[10px] text-[color:var(--muted-foreground)]">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" />Payée</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-sky-400" />En recouv.</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" />Partielle</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400 opacity-60" />Retard</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-400" />Impayée</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[color:var(--border)]" />À venir</span>
          </div>
        </div>

        {/* Impayés/partiels en tête */}
        {overdueOrUnpaid.length > 0 && !showAllInstallments && (
          <div className="flex items-center gap-2 border-b border-red-200 bg-red-100 px-5 py-2.5 dark:border-red-800/60 dark:bg-red-950/40">
            <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
              {overdueOrUnpaid.length} échéance{overdueOrUnpaid.length > 1 ? "s" : ""} nécessitant une action immédiate
            </p>
          </div>
        )}

        {/* Liste */}
        {installments.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            Aucune échéance enregistrée.
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--border)]/60">
            {!showAllInstallments && overdueOrUnpaid.length > 0 &&
              overdueOrUnpaid.map((row) => (
                <InstallmentRow
                  key={row.installmentId + "-pinned"}
                  row={row}
                  isLast={false}
                  onPaySuggested={openManualPay}
                  disabled={paying}
                  toleranceDays={toleranceDays}
                />
              ))
            }
            {displayedInstallments
              .filter(
                (r) =>
                  showAllInstallments ||
                  overdueOrUnpaid.findIndex((o) => o.installmentId === r.installmentId) === -1,
              )
              .map((row, idx, arr) => (
                <InstallmentRow
                  key={row.installmentId}
                  row={row}
                  isLast={idx === arr.length - 1 && !showAllInstallments}
                  onPaySuggested={openManualPay}
                  disabled={paying}
                  toleranceDays={toleranceDays}
                />
              ))}
          </div>
        )}

        {total > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setShowAllInstallments((v) => !v)}
            className="flex w-full items-center justify-center gap-2 border-t border-[color:var(--border)] py-3 text-xs font-medium text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
          >
            {showAllInstallments ? (
              <><ChevronUp className="size-3.5" />Réduire</>
            ) : (
              <><ChevronDown className="size-3.5" />Voir les {total - PREVIEW_COUNT} échéances restantes</>
            )}
          </button>
        )}
      </Card>

      {/* ── Journal d'audit ── */}
      {auditSorted.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-5 text-sm font-semibold text-[color:var(--foreground)]">
            Journal d'audit
            <span className="ml-2 font-mono text-xs font-normal text-[color:var(--muted-foreground)]">
              {auditSorted.length} entrée{auditSorted.length > 1 ? "s" : ""}
            </span>
          </h2>
          <ol className="flex flex-col">
            {auditSorted.map((log, idx) => {
              const meta = AUDIT_ICON[log.action] ?? { icon: FileText, color: "text-[color:var(--muted-foreground)] bg-[color:var(--muted)]" };
              const Icon = meta.icon;
              const isLast = idx === auditSorted.length - 1;
              return (
                <li key={log.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {!isLast && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[color:var(--border)]" />
                  )}
                  <div className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 pt-1">
                    <span className="text-sm font-medium text-[color:var(--foreground)]">
                      {AUDIT_LOG_ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        {formatDate(log.occurredAt)}
                      </span>
                      <span className="text-xs text-[color:var(--muted-foreground)]">·</span>
                      <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                        {!log.performedBy || log.performedBy === "SYSTEM" ? "Système" : log.performedBy.slice(0, 10)}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <span className="text-[11px] text-[color:var(--muted-foreground)]">
                        {renderAuditDetails(log.details)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {/* ── Modal paiement manuel ── */}
      <Modal
        open={manualPayOpen}
        onClose={() => !paying && setManualPayOpen(false)}
        title="Paiement manuel"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setManualPayOpen(false)} disabled={paying}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={submitManualPayment}
              isLoading={paying}
              disabled={paying || !manualPayFormValid}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Montant collecté hors plateforme (cash ou MoMo direct). Le système imputera automatiquement
          sur les échéances ouvertes de la plus ancienne à la plus récente.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {/* Montant */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[color:var(--foreground)]">
              Montant (FCFA) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={manualPayAmountStr}
              onChange={(e) => setManualPayAmountStr(e.target.value)}
              placeholder="Ex : 5000"
              autoFocus
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 font-mono text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20"
            />
            {manualPayAmountStr && parseInt(manualPayAmountStr, 10) > 0 && (
              <span className="text-[11px] text-[color:var(--muted-foreground)]">
                {formatXof(parseInt(manualPayAmountStr, 10))}
              </span>
            )}
          </div>

          {/* Mode de paiement */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[color:var(--foreground)]">
              Mode de paiement <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(["ESPECES", "MOBILE_MONEY"] as ManualPaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setManualPayMethod(method)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    manualPayMethod === method
                      ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
                      : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--muted-foreground)] hover:border-[color:var(--primary)]/40"
                  }`}
                >
                  {MANUAL_PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          {/* Référence */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[color:var(--foreground)]">
              {manualPayMethod === "MOBILE_MONEY" ? "N° de transaction opérateur" : "N° de reçu"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={manualPayReference}
              onChange={(e) => setManualPayReference(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && manualPayFormValid && submitManualPayment()}
              placeholder={manualPayMethod === "MOBILE_MONEY" ? "Ex : TXN-20240115-001" : "Ex : REC-2024-001"}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20"
            />
            <span className="text-[11px] text-[color:var(--muted-foreground)]">
              {manualPayMethod === "MOBILE_MONEY"
                ? "Numéro fourni par l'opérateur comme preuve du transfert."
                : "Numéro du reçu papier remis au chauffeur."}
            </span>
          </div>
        </div>
      </Modal>

      <ContractBreakModal
        open={breakOpen}
        contractId={contract.contractId}
        vehicleId={contract.vehicle.vehicleId}
        onClose={() => setBreakOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <ContractSuspendModal
        open={suspendOpen}
        contractId={contract.contractId}
        onClose={() => setSuspendOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <ConfirmModal
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onConfirm={handleResume}
        title="Reprendre le contrat ?"
        description={
          <p>
            Le contrat repassera en statut <strong>Actif</strong>. Le chauffeur
            pourra de nouveau passer en ligne. Les dates des échéances{" "}
            <strong>EN_ATTENTE</strong> seront repositionnées automatiquement
            pour compenser la durée de la suspension.
          </p>
        }
        confirmLabel="Reprendre"
        tone="primary"
        withReason={{
          label: "Motif de reprise (optionnel)",
          placeholder: "Ex : Régularisation solde, arrangement avec le chauffeur…",
        }}
        isLoading={resuming}
      />
    </div>
  );
}
