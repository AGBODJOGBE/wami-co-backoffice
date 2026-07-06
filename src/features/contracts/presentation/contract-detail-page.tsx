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
  FileText,
  PauseCircle,
  Play,
  ShieldAlert,
  ShieldOff,
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
import {
  AUDIT_LOG_ACTION_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  INSTALLMENT_STATUS_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  driverFullName,
  formatXof,
  vehicleLabel,
  type Contract,
  type ContractAuditLog,
  type ContractInstallment,
  type ContractStatus,
  type InstallmentStatus,
} from "../domain/contract";
import {
  recordManualPaymentAction,
  resumeContractAction,
  unblockDriverAction,
} from "../application/actions";
import { ContractBreakModal } from "./contract-break-modal";
import { ContractSuspendModal } from "./contract-suspend-modal";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TOLERANCE_DAYS = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOverdueInfo(row: ContractInstallment) {
  if (row.status !== "EN_ATTENTE" || !row.dateEcheance) return null;
  const due = new Date(row.dateEcheance);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (diffDays <= 0) return null;
  return { diffDays, daysUntilImpayee: Math.max(0, TOLERANCE_DAYS - diffDays + 1) };
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
    danger: "text-red-600 dark:text-red-400",
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
  CONTRACT_CREATED:       { icon: FileText,     color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
  CONTRACT_TERMINATED:    { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  CONTRACT_BROKEN:        { icon: XCircle,      color: "text-red-500 bg-red-50 dark:bg-red-950/40" },
  INSTALLMENT_PAID:       { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  INSTALLMENT_UNPAID:     { icon: AlertTriangle,color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
  DRIVER_BLOCKED:         { icon: ShieldAlert,  color: "text-red-500 bg-red-50 dark:bg-red-950/40" },
  DRIVER_UNBLOCKED:       { icon: Unlock,       color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  MANUAL_PAYMENT_RECORDED:{ icon: CheckCircle2, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
};

// ─── Ligne d'échéance ─────────────────────────────────────────────────────────

function InstallmentRow({
  row,
  isLast,
  onPay,
  isPaying,
  disabled,
}: {
  row: ContractInstallment;
  isLast: boolean;
  onPay: (id: string) => void;
  isPaying: boolean;
  disabled: boolean;
}) {
  const overdue = getOverdueInfo(row);
  const future = row.status === "EN_ATTENTE" && isFuture(row.dateEcheance);

  // Couleur du connecteur vertical
  const connectorColor =
    row.status === "PAYEE"    ? "bg-emerald-400"
    : row.status === "IMPAYEE" ? "bg-red-400"
    : overdue                  ? "bg-amber-400"
    : "bg-[color:var(--border)]";

  // Icone du statut
  const StatusIcon =
    row.status === "PAYEE"    ? CheckCircle2
    : row.status === "IMPAYEE" ? AlertTriangle
    : row.status === "ANNULEE" ? XCircle
    : overdue                  ? AlertTriangle
    : Clock;

  const iconColor =
    row.status === "PAYEE"    ? "text-emerald-500"
    : row.status === "IMPAYEE" ? "text-red-500"
    : row.status === "ANNULEE" ? "text-[color:var(--muted-foreground)]"
    : overdue                  ? "text-amber-500"
    : "text-[color:var(--muted-foreground)]";

  const rowBg =
    row.status === "PAYEE"    ? "bg-emerald-50/40 dark:bg-emerald-950/10"
    : row.status === "IMPAYEE" ? "bg-red-50/60 dark:bg-red-950/20"
    : overdue                  ? "bg-amber-50/60 dark:bg-amber-950/20"
    : "";

  return (
    <div className={`relative flex gap-4 px-5 py-3 transition-colors ${rowBg} ${row.status === "ANNULEE" ? "opacity-40" : ""}`}>
      {/* Connecteur vertical */}
      <div className="flex flex-col items-center">
        <div className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm dark:border-[color:var(--background)] dark:bg-[color:var(--background)]`}>
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
          {row.status === "IMPAYEE" && (
            <span className="mt-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
              Échéance impayée — paiement manuel requis
            </span>
          )}
        </div>

        {/* Droite : montant + badge + action */}
        <div className="flex items-center gap-3">
          <span className={`font-mono text-sm font-semibold ${row.status === "PAYEE" ? "text-emerald-600 dark:text-emerald-400" : row.status === "IMPAYEE" ? "text-red-600 dark:text-red-400" : "text-[color:var(--foreground)]"}`}>
            {formatXof(row.montant)}
          </span>
          <Badge
            tone={
              row.status === "PAYEE"    ? "success"
              : row.status === "IMPAYEE" ? "danger"
              : row.status === "ANNULEE" ? "neutral"
              : overdue                  ? "warning"
              : "neutral"
            }
          >
            {INSTALLMENT_STATUS_LABELS[row.status as InstallmentStatus] ?? row.status}
          </Badge>
          {(row.status === "EN_ATTENTE" || row.status === "IMPAYEE") && (
            <Button
              size="sm"
              variant={row.status === "IMPAYEE" ? "primary" : "outline"}
              onClick={() => onPay(row.installmentId)}
              disabled={disabled}
            >
              {isPaying ? <Spinner size="sm" /> : "Payer"}
            </Button>
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
}

export function ContractDetailPage({ contract, installments, auditLogs = [] }: Props) {
  const router = useRouter();
  const [breakOpen, setBreakOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [unblocking, startUnblock] = useTransition();
  const [resuming, startResume] = useTransition();
  const [showAllInstallments, setShowAllInstallments] = useState(false);

  const canBreak = contract.status === "ACTIVE" || contract.status === "SUSPENDED";

  function handleManualPayment(installmentId: string) {
    setPayingId(installmentId);
    recordManualPaymentAction(installmentId, contract.contractId).then((r) => {
      setPayingId(null);
      if (r.ok) {
        toast({ kind: "success", title: "Paiement enregistré", description: r.message });
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

  function handleResume() {
    startResume(async () => {
      const r = await resumeContractAction(contract.contractId);
      if (r.ok) {
        setResumeOpen(false);
        toast({ kind: "success", title: "Contrat repris", description: r.message });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  // Stats d'avancement
  const paid    = installments.filter((i) => i.status === "PAYEE").length;
  const unpaid  = installments.filter((i) => i.status === "IMPAYEE").length;
  const pending = installments.filter((i) => i.status === "EN_ATTENTE").length;
  const total   = installments.length;
  const paidAmt = contract.montantPaye ?? installments.filter(i => i.status === "PAYEE").reduce((s, i) => s + i.montant, 0);

  // Échéances affichées — par défaut : toutes sauf les futures au-delà de +5
  const overdueOrUnpaid = installments.filter(
    (i) => i.status === "IMPAYEE" || getOverdueInfo(i) !== null,
  );
  const PREVIEW_COUNT = 15;
  const displayedInstallments = showAllInstallments
    ? installments
    : installments.slice(0, PREVIEW_COUNT);

  const auditSorted = useMemo(
    () => [...auditLogs].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    [auditLogs],
  );

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
            </div>
            <span className="text-sm text-[color:var(--muted-foreground)]">
              #{(contract.contractId ?? "").slice(0, 12)} · Créé le {formatDate(contract.createdAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Reprendre — contrat suspendu */}
            {contract.status === "SUSPENDED" && (
              <Button variant="outline" size="sm" onClick={() => setResumeOpen(true)} disabled={resuming}>
                {resuming ? <Spinner size="sm" /> : <Play className="size-4" />}
                Reprendre
              </Button>
            )}
            {/* Suspendre — contrat actif */}
            {contract.status === "ACTIVE" && (
              <Button variant="outline" size="sm" onClick={() => setSuspendOpen(true)}>
                <PauseCircle className="size-4" />
                Suspendre
              </Button>
            )}
            {/* Débloquer le chauffeur */}
            {(contract.status === "ACTIVE" || contract.status === "SUSPENDED") && (
              <Button variant="outline" size="sm" onClick={handleUnblock} disabled={unblocking}>
                {unblocking ? <Spinner size="sm" /> : <Unlock className="size-4" />}
                Débloquer le chauffeur
              </Button>
            )}
            {/* Résilier */}
            {canBreak && (
              <Button variant="danger" size="sm" onClick={() => setBreakOpen(true)}>
                <ShieldOff className="size-4" />
                Résilier le contrat
              </Button>
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
        {/* Top strip coloré selon avancement */}
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

          {/* Payé */}
          <div className="flex flex-col gap-1 p-5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Déjà payé
            </span>
            <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatXof(paidAmt)}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {paid} / {total} échéance{total > 1 ? "s" : ""}
            </span>
          </div>

          {/* Restant */}
          <div className="flex flex-col gap-1 p-5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Restant à payer
            </span>
            <span className={`font-mono text-xl font-bold ${(contract.montantRestant ?? 0) > 0 ? "text-[color:var(--foreground)]" : "text-emerald-600 dark:text-emerald-400"}`}>
              {formatXof(contract.montantRestant ?? 0)}
            </span>
            {unpaid > 0 && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                dont {unpaid} impayée{unpaid > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Progression */}
          <div className="flex flex-col justify-between gap-3 p-5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Progression
            </span>
            <div className="flex flex-col gap-2">
              <ProgressBar value={paid} max={total} />
              <div className="flex justify-between text-[10px] text-[color:var(--muted-foreground)]">
                <span>{paid} payée{paid > 1 ? "s" : ""}</span>
                <span>{pending} à venir</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
          {/* Nb impayés */}
          {(contract.nbImpayes ?? 0) > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30">
              <AlertTriangle className="size-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                {contract.nbImpayes} impayé{(contract.nbImpayes ?? 0) > 1 ? "s" : ""}
              </span>
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
            Tolérance de paiement : <strong>3 jours</strong> — IMPAYÉE au 4e jour de retard
          </span>
        </div>
      </div>

      {/* ── Échéancier timeline ── */}
      <Card className="overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-[color:var(--foreground)]">
              Échéancier
              {contract.frequencePaiement === "JOURNALIER" ? " · dimanches exclus" : ""}
            </h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {total} échéances · {paid} payées · {pending} à venir
              {unpaid > 0 && (
                <span className="ml-1 font-semibold text-red-600 dark:text-red-400">
                  · {unpaid} impayée{unpaid > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-[color:var(--muted-foreground)]">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" />Payée</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" />Retard</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-400" />Impayée</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[color:var(--border)]" />À venir</span>
            </div>
          </div>
        </div>

        {/* Impayés en tête si contrat suspendu */}
        {overdueOrUnpaid.length > 0 && !showAllInstallments && (
          <div className="border-b border-[color:var(--border)] bg-red-50/50 px-5 py-2 dark:bg-red-950/10">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              ⚠ Échéances nécessitant une action immédiate
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
            {/* Impayées toujours en premier si pas tout affiché */}
            {!showAllInstallments && overdueOrUnpaid.length > 0 &&
              overdueOrUnpaid.map((row, idx) => (
                <InstallmentRow
                  key={row.installmentId + "-pinned"}
                  row={row}
                  isLast={false}
                  onPay={handleManualPayment}
                  isPaying={payingId === row.installmentId}
                  disabled={!!payingId}
                />
              ))
            }
            {/* Autres échéances */}
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
                  onPay={handleManualPayment}
                  isPaying={payingId === row.installmentId}
                  disabled={!!payingId}
                />
              ))}
          </div>
        )}

        {/* Bouton voir tout */}
        {total > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setShowAllInstallments((v) => !v)}
            className="flex w-full items-center justify-center gap-2 border-t border-[color:var(--border)] py-3 text-xs font-medium text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--muted)]/40 hover:text-[color:var(--foreground)]"
          >
            {showAllInstallments ? (
              <>
                <ChevronUp className="size-3.5" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                Voir les {total - PREVIEW_COUNT} échéances restantes
              </>
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
                  {/* Ligne verticale */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[color:var(--border)]" />
                  )}
                  {/* Icone */}
                  <div className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                    <Icon className="size-4" />
                  </div>
                  {/* Texte */}
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
                      <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                        {Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

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
            pourra de nouveau passer en ligne.
          </p>
        }
        confirmLabel="Reprendre"
        tone="primary"
        isLoading={resuming}
      />
    </div>
  );
}
