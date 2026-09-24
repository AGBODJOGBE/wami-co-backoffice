"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Lock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatXof } from "@/shared/lib/format";
import { CanView } from "@/shared/ui/can-view";
import {
  suspendAffiliateAction,
  reactivateAffiliateAction,
  updateCommissionRateAction,
  closeAffiliateAction,
  reopenAffiliateAction,
  holdCommissionAction,
  releaseCommissionAction,
  cancelCommissionAction,
  getAffiliateCommissionDetailAction,
} from "../application/actions";
import {
  AFFILIATE_STATUS_LABELS,
  COMMISSION_STATUS_LABELS,
  SUSPENSION_MODE_LABELS,
  type AffiliateCommissionDetail,
  type AffiliateDetail,
  type AffiliateStatementLine,
  type AffiliateSuspensionMode,
} from "../domain/affiliate";

interface Props {
  detail: AffiliateDetail;
}

export function AffiliateDetailPage({ detail }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing · Affiliés"
        title={detail.name}
        description={`${detail.phoneNumber} · ${detail.socialNetwork}`}
        dataSource="live"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/affiliate"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] dark:bg-transparent"
            >
              <ArrowLeft className="size-4" />
              Retour
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { label: "Taux effectif",  value: `${detail.statement.totals.totalPayable > 0 ? detail.commissionRate ?? "—" : "—"}%`, sub: detail.commissionRate != null ? "taux personnalisé" : "taux par défaut" },
          { label: "Total accumulé", value: formatXof(detail.statement.totals.totalAccrued), sub: "commissions brutes" },
          { label: "À verser",       value: formatXof(detail.statement.totals.outstandingPayable), sub: detail.statement.totals.heldOutstanding > 0 ? `dont ${formatXof(detail.statement.totals.heldOutstanding)} gelés` : "net déblocable" },
          { label: "Déjà payé",      value: formatXof(detail.statement.totals.totalPaid), sub: "versements effectués" },
        ] as const).map(({ label, value, sub }) => (
          <Card key={label} className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">{label}</p>
            <p className="mt-1 font-mono text-xl font-bold">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{sub}</p>}
          </Card>
        ))}
      </section>

      {/* Tabs */}
      <Tabs
        defaultValue="commissions"
        tabs={[
          {
            value: "commissions",
            label: "Commissions",
            badge: detail.statement.pagination.total > 0
              ? { count: detail.statement.pagination.total, tone: "info" as const }
              : undefined,
            content: (
              <CommissionsTab
                lines={detail.statement.lines}
                total={detail.statement.pagination.total}
                onRefresh={() => startRefresh(() => router.refresh())}
              />
            ),
          },
          {
            value: "profile",
            label: "Profil & actions",
            content: <ProfileTab detail={detail} onRefresh={() => startRefresh(() => router.refresh())} />,
          },
          {
            value: "codes",
            label: `Codes promo (${detail.codes.length})`,
            content: <CodesTab codes={detail.codes} />,
          },
        ]}
      />
    </div>
  );
}

// ─── Tab : commissions ────────────────────────────────────────────────────────

function CommissionsTab({
  lines,
  total,
  onRefresh,
}: {
  lines: AffiliateStatementLine[];
  total: number;
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [holdModal, setHoldModal]   = useState<{ open: boolean; commissionId: string }>({ open: false, commissionId: "" });
  const [cancelModal, setCancelModal] = useState<{ open: boolean; commissionId: string; amount: number }>({ open: false, commissionId: "", amount: 0 });
  const [holdReason,   setHoldReason]   = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [detailTarget, setDetailTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return lines;
    return lines.filter((l) => l.status === statusFilter);
  }, [lines, statusFilter]);

  function handleHold() {
    if (!holdReason.trim()) {
      toast({ kind: "error", title: "Motif requis", description: "Indiquez le motif du gel." });
      return;
    }
    startTransition(async () => {
      const res = await holdCommissionAction(holdModal.commissionId, holdReason.trim());
      if (res.success) {
        toast({ kind: "success", title: "Commission gelée" });
        setHoldModal({ open: false, commissionId: "" });
        setHoldReason("");
        onRefresh();
      } else {
        toast({ kind: "error", title: "Gel impossible", description: res.error });
      }
    });
  }

  function handleRelease(commissionId: string) {
    startTransition(async () => {
      const res = await releaseCommissionAction(commissionId);
      if (res.success) {
        toast({ kind: "success", title: "Gel relâché" });
        onRefresh();
      } else {
        toast({ kind: "error", title: "Relâchement impossible", description: res.error });
      }
    });
  }

  function handleCancel() {
    if (!cancelReason.trim()) {
      toast({ kind: "error", title: "Motif requis", description: "Indiquez le motif d'annulation." });
      return;
    }
    startTransition(async () => {
      const res = await cancelCommissionAction(cancelModal.commissionId, cancelReason.trim());
      if (res.success) {
        toast({ kind: "success", title: "Commission annulée", description: `${formatXof(res.data?.amount ?? 0)} annulé.` });
        setCancelModal({ open: false, commissionId: "", amount: 0 });
        setCancelReason("");
        onRefresh();
      } else {
        toast({ kind: "error", title: "Annulation impossible", description: res.error });
      }
    });
  }

  if (lines.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm font-medium">Aucune commission</p>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Les commissions apparaîtront ici quand des codes promo de cet affilié seront utilisés.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Modales */}
      <Modal
        open={holdModal.open}
        onClose={() => { setHoldModal({ open: false, commissionId: "" }); setHoldReason(""); }}
        size="md"
        title="Geler la commission"
        description="La commission sera exclue du prochain versement jusqu'à relâchement explicite."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setHoldModal({ open: false, commissionId: "" }); setHoldReason(""); }} disabled={pending}>Annuler</Button>
            <Button variant="danger" onClick={handleHold} disabled={pending || !holdReason.trim()}>
              {pending && <Spinner size="sm" />}
              Geler
            </Button>
          </>
        }
      >
        <Textarea label="Motif du gel *" required value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="Signalement fraude, litige en cours…" rows={3} />
      </Modal>

      <Modal
        open={cancelModal.open}
        onClose={() => { setCancelModal({ open: false, commissionId: "", amount: 0 }); setCancelReason(""); }}
        size="md"
        title="Annuler la commission"
        description={`Montant : ${formatXof(cancelModal.amount)} — cette action est irréversible.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCancelModal({ open: false, commissionId: "", amount: 0 }); setCancelReason(""); }} disabled={pending}>Annuler</Button>
            <Button variant="danger" onClick={handleCancel} disabled={pending || !cancelReason.trim()}>
              {pending && <Spinner size="sm" />}
              Confirmer l&apos;annulation
            </Button>
          </>
        }
      >
        <Textarea label="Motif d'annulation *" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Fraude confirmée après enquête…" rows={3} />
      </Modal>

      <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
        <Combobox
          options={[
            { value: "ALL",                label: "Statut : tous"         },
            { value: "ACCRUED",            label: "Accumulé"              },
            { value: "PARTIALLY_PAYABLE",  label: "Partiellement payable" },
            { value: "PAYABLE",            label: "Payable"               },
            { value: "PAID",               label: "Payé"                  },
            { value: "CANCELLED",          label: "Annulé"                },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          className="sm:w-52"
        />
        <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">{filtered.length} / {total}</span>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <th className="px-5 py-2.5 font-medium">Source</th>
              <th className="px-5 py-2.5 font-medium">Statut</th>
              <th className="px-5 py-2.5 text-right font-medium">Montant</th>
              <th className="px-5 py-2.5 text-right font-medium">Payable</th>
              <th className="px-5 py-2.5 text-right font-medium">Taux</th>
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {filtered.map((line) => (
              <tr key={line.commissionId} className={`hover:bg-[color:var(--muted)]/30 ${line.held ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium">{line.sourceType}</span>
                  <span className="ml-1 font-mono text-[10px] text-[color:var(--muted-foreground)]">{line.sourceId.slice(0, 8)}…</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      tone={
                        line.status === "PAID"      ? "success"
                        : line.status === "CANCELLED" ? "danger"
                        : line.status === "PAYABLE"   ? "info"
                        : "warning"
                      }
                    >
                      {COMMISSION_STATUS_LABELS[line.status] ?? line.status}
                    </Badge>
                    {line.held && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        <Lock className="size-2.5" />
                        Gelé
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-mono">{formatXof(line.amount)}</td>
                <td className="px-5 py-3 text-right font-mono">{formatXof(line.payableAmount)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{line.appliedRate}%</td>
                <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">{formatDate(line.accruedAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px]"
                      onClick={() => setDetailTarget(line.commissionId)}
                    >
                      <Eye className="size-3" />
                      Détail
                    </Button>
                  {line.status !== "CANCELLED" && line.status !== "PAID" && (
                    <CanView permission="affiliate.manage">
                      <>
                        {line.held ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px]"
                              onClick={() => handleRelease(line.commissionId)}
                              disabled={pending}
                            >
                              <CheckCircle2 className="size-3" />
                              Relâcher
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 border-red-300 text-[11px] text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                              onClick={() => { setCancelModal({ open: true, commissionId: line.commissionId, amount: line.amount }); setCancelReason(""); }}
                              disabled={pending}
                            >
                              <XCircle className="size-3" />
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px]"
                            onClick={() => { setHoldModal({ open: true, commissionId: line.commissionId }); setHoldReason(""); }}
                            disabled={pending}
                          >
                            <Lock className="size-3" />
                            Geler
                          </Button>
                        )}
                      </>
                    </CanView>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <CommissionDetailModal
        commissionId={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
}

// ─── Modale détail commission (écrêtage, gel, annulation) ─────────────────────

function CommissionDetailModal({
  commissionId,
  onClose,
}: {
  commissionId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AffiliateCommissionDetail | null>(null);
  const [loading, startLoading] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!commissionId) {
      setDetail(null);
      setLoadError(null);
      return;
    }
    startLoading(async () => {
      const res = await getAffiliateCommissionDetailAction(commissionId);
      if (res.success && res.data) {
        setDetail(res.data);
        setLoadError(null);
      } else {
        setLoadError(res.error ?? "Détail indisponible.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissionId]);

  return (
    <Modal
      open={!!commissionId}
      onClose={onClose}
      size="md"
      title="Détail de la commission"
      description={commissionId ? `ID : ${commissionId}` : undefined}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-[color:var(--danger)]">{loadError}</p>
      ) : detail ? (
        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Statut" value={<Badge tone={detail.status === "PAID" ? "success" : detail.status === "CANCELLED" ? "danger" : "warning"}>{COMMISSION_STATUS_LABELS[detail.status] ?? detail.status}</Badge>} />
            <Field label="Taux appliqué" value={`${detail.appliedRate}% (${detail.rateSource})`} />
            <Field label="Commission ForYou" value={formatXof(detail.platformCommission)} />
            <Field label="Montant" value={<span className="font-mono font-semibold">{formatXof(detail.amount)}</span>} />
            {detail.wasCapped && (
              <>
                <Field label="Montant avant écrêtage" value={detail.rawAmount != null ? formatXof(detail.rawAmount) : "—"} />
                <Field label="Plafond de marge" value={detail.maxAllowedAmount != null ? formatXof(detail.maxAllowedAmount) : "—"} />
                <Field
                  label="Manque à gagner (écrêtage)"
                  value={<span className="text-amber-600 dark:text-amber-400">{formatXof(detail.cappingShortfall)}</span>}
                />
              </>
            )}
            {detail.zeroAmountReason && (
              <Field
                label="Pourquoi 0 FCFA"
                value={
                  detail.zeroAmountReason === "NEGATIVE_MARGIN"
                    ? "Marge ForYou nulle/négative sur cette course"
                    : "Taux historique résolu à 0"
                }
              />
            )}
            <Field label="Part cash (non recouvrée)" value={formatXof(detail.cashPortionAmount)} />
            <Field label="Payable" value={formatXof(detail.payableAmount)} />
            <Field label="Payé" value={formatXof(detail.paidAmount)} />
            <Field label="Accumulé le" value={formatDate(detail.accruedAt)} />
          </div>

          {detail.held && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Gelée</p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{detail.holdReason ?? "—"}</p>
              {detail.heldAt && <p className="mt-0.5 text-[10px] text-amber-600/80 dark:text-amber-500/80">le {formatDate(detail.heldAt)}</p>}
            </div>
          )}
          {detail.cancelledAt && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">Annulée le {formatDate(detail.cancelledAt)}</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{detail.cancelReason ?? "—"}</p>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

// ─── Tab : profil & actions ───────────────────────────────────────────────────

function ProfileTab({ detail, onRefresh }: { detail: AffiliateDetail; onRefresh: () => void }) {
  const [suspendModal, setSuspendModal]   = useState(false);
  const [rateModal,    setRateModal]      = useState(false);
  const [closeModal,   setCloseModal]     = useState(false);
  const [reopenModal,  setReopenModal]    = useState(false);
  const [suspendMode,  setSuspendMode]    = useState<AffiliateSuspensionMode>("PAUSE");
  const [suspendReason, setSuspendReason] = useState("");
  const [closeReason,  setCloseReason]    = useState("");
  const [reopenReason, setReopenReason]   = useState("");
  const [newRate, setNewRate]             = useState<string>("");
  const [pending, startTransition]        = useTransition();

  function handleSuspend() {
    if (suspendMode === "SANCTION" && !suspendReason.trim()) {
      toast({ kind: "error", title: "Motif requis pour une sanction", description: "Indiquez le motif." });
      return;
    }
    startTransition(async () => {
      const res = await suspendAffiliateAction(detail.affiliateId, {
        mode: suspendMode,
        reason: suspendReason.trim() || null,
      });
      if (res.success) {
        toast({ kind: "success", title: "Affilié suspendu" });
        setSuspendModal(false);
        setSuspendReason("");
        onRefresh();
      } else {
        toast({ kind: "error", title: "Suspension impossible", description: res.error });
      }
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const res = await reactivateAffiliateAction(detail.affiliateId);
      if (res.success) {
        toast({ kind: "success", title: "Affilié réactivé" });
        onRefresh();
      } else {
        toast({ kind: "error", title: "Réactivation impossible", description: res.error });
      }
    });
  }

  function handleUpdateRate() {
    const rate = newRate === "" ? null : Number(newRate);
    startTransition(async () => {
      const res = await updateCommissionRateAction(detail.affiliateId, rate);
      if (res.success) {
        toast({ kind: "success", title: "Taux mis à jour" });
        setRateModal(false);
        setNewRate("");
        onRefresh();
      } else {
        toast({ kind: "error", title: "Mise à jour impossible", description: res.error });
      }
    });
  }

  function handleClose() {
    if (!closeReason.trim()) {
      toast({ kind: "error", title: "Motif requis", description: "La clôture est définitive — indiquez le motif." });
      return;
    }
    startTransition(async () => {
      const res = await closeAffiliateAction(detail.affiliateId, closeReason.trim());
      if (res.success) {
        toast({
          kind: "success",
          title: "Partenariat clôturé",
          description: res.data?.deactivatedCodes ? `${res.data.deactivatedCodes} code(s) promo désactivé(s).` : undefined,
        });
        setCloseModal(false);
        setCloseReason("");
        onRefresh();
      } else {
        toast({ kind: "error", title: "Clôture impossible", description: res.error });
      }
    });
  }

  function handleReopen() {
    if (!reopenReason.trim()) {
      toast({ kind: "error", title: "Motif requis" });
      return;
    }
    startTransition(async () => {
      const res = await reopenAffiliateAction(detail.affiliateId, reopenReason.trim());
      if (res.success) {
        toast({
          kind: "success",
          title: "Partenariat réouvert",
          description: res.data?.walletRebound ? "Rattaché à un nouveau wallet PAYMENT." : undefined,
        });
        setReopenModal(false);
        setReopenReason("");
        onRefresh();
      } else {
        toast({ kind: "error", title: "Réouverture impossible", description: res.error });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Infos */}
      <Card className="flex flex-col gap-4 p-5">
        <CardHeader className="p-0">
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {([
            { label: "ID",           value: <span className="font-mono text-xs">{detail.affiliateId}</span> },
            { label: "Statut",       value: <Badge tone={detail.status === "ACTIVE" ? "success" : detail.status === "CLOSED" ? "neutral" : "danger"}>{AFFILIATE_STATUS_LABELS[detail.status] ?? detail.status}</Badge> },
            { label: "Téléphone",    value: detail.phoneNumber },
            { label: "Réseau",       value: detail.socialNetwork },
            { label: "Audience",     value: detail.audienceSize != null ? detail.audienceSize.toLocaleString("fr-FR") : "—" },
            { label: "Taux perso",   value: detail.commissionRate != null ? `${detail.commissionRate}%` : <span className="text-[color:var(--muted-foreground)]">par défaut</span> },
            { label: "Mode suspend.", value: detail.suspensionMode ? SUSPENSION_MODE_LABELS[detail.suspensionMode] : "—" },
            { label: "Motif suspend.", value: detail.suspensionReason ?? "—" },
            { label: "Créé le",      value: formatDate(detail.createdAt) },
          ] as const).map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</dt>
              <dd className="mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Actions */}
      <Card className="flex flex-col gap-4 p-5">
        <CardHeader className="p-0">
          <CardTitle>Actions</CardTitle>
          <CardDescription>Opérations sur ce profil affilié</CardDescription>
        </CardHeader>
        <CanView permission="affiliate.manage">
          <div className="flex flex-col gap-3">
            {detail.status === "ACTIVE" && (
              <Button
                variant="outline"
                className="justify-start border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                onClick={() => setSuspendModal(true)}
                disabled={pending}
              >
                <XCircle className="size-4" />
                Suspendre
              </Button>
            )}
            {detail.status === "SUSPENDED" && (
              <Button
                variant="outline"
                className="justify-start border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                onClick={handleReactivate}
                disabled={pending}
              >
                {pending ? <Spinner size="sm" /> : <CheckCircle2 className="size-4" />}
                Réactiver
              </Button>
            )}
            {detail.status !== "CLOSED" && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setRateModal(true)}
                disabled={pending}
              >
                Modifier le taux de commission
              </Button>
            )}
            {detail.status === "CLOSED" ? (
              <Button
                variant="outline"
                className="justify-start border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                onClick={() => setReopenModal(true)}
                disabled={pending}
              >
                <ArchiveRestore className="size-4" />
                Réouvrir le partenariat
              </Button>
            ) : (
              <Button
                variant="outline"
                className="justify-start border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                onClick={() => setCloseModal(true)}
                disabled={pending}
              >
                <Archive className="size-4" />
                Clôturer le partenariat
              </Button>
            )}
          </div>
        </CanView>
      </Card>

      {/* Modale suspension */}
      <Modal
        open={suspendModal}
        onClose={() => { setSuspendModal(false); setSuspendReason(""); }}
        size="md"
        title="Suspendre l'affilié"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setSuspendModal(false); setSuspendReason(""); }} disabled={pending}>Annuler</Button>
            <Button variant="danger" onClick={handleSuspend} disabled={pending || (suspendMode === "SANCTION" && !suspendReason.trim())}>
              {pending && <Spinner size="sm" />}
              Suspendre
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Combobox
            label="Mode de suspension"
            options={[
              { value: "PAUSE",    label: "PAUSE — temporaire, aucune raison requise"  },
              { value: "SANCTION", label: "SANCTION — permanente, motif obligatoire"   },
            ]}
            value={suspendMode}
            onChange={(v) => setSuspendMode(v as AffiliateSuspensionMode)}
          />
          <Textarea
            label={suspendMode === "SANCTION" ? "Motif * (obligatoire pour SANCTION)" : "Motif (optionnel)"}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Explications internes…"
            rows={3}
            required={suspendMode === "SANCTION"}
          />
        </div>
      </Modal>

      {/* Modale taux */}
      <Modal
        open={rateModal}
        onClose={() => { setRateModal(false); setNewRate(""); }}
        size="sm"
        title="Modifier le taux de commission"
        description="Laissez vide pour retomber sur le taux par défaut de la configuration."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRateModal(false); setNewRate(""); }} disabled={pending}>Annuler</Button>
            <Button onClick={handleUpdateRate} disabled={pending}>
              {pending && <Spinner size="sm" />}
              Enregistrer
            </Button>
          </>
        }
      >
        <Input
          label="Taux (%)"
          type="number"
          value={newRate}
          onChange={(e) => setNewRate(e.target.value)}
          placeholder="ex. 15 (vide = taux par défaut)"
        />
      </Modal>

      {/* Modale clôture */}
      <Modal
        open={closeModal}
        onClose={() => { setCloseModal(false); setCloseReason(""); }}
        size="md"
        title="Clôturer le partenariat"
        description="Action définitive : les codes promo de l'affilié seront désactivés. Les commissions déjà dues restent versables."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCloseModal(false); setCloseReason(""); }} disabled={pending}>Annuler</Button>
            <Button variant="danger" onClick={handleClose} disabled={pending || !closeReason.trim()}>
              {pending && <Spinner size="sm" />}
              Clôturer définitivement
            </Button>
          </>
        }
      >
        <Textarea label="Motif de la clôture *" required value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Fin d'accord commercial, non-respect des conditions…" rows={3} />
      </Modal>

      {/* Modale réouverture */}
      <Modal
        open={reopenModal}
        onClose={() => { setReopenModal(false); setReopenReason(""); }}
        size="md"
        title="Réouvrir le partenariat"
        description="Le profil repasse à ACTIF. S'il n'a plus de wallet PAYMENT d'origine, il sera rattaché à son wallet passager actuel."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setReopenModal(false); setReopenReason(""); }} disabled={pending}>Annuler</Button>
            <Button onClick={handleReopen} disabled={pending || !reopenReason.trim()}>
              {pending && <Spinner size="sm" />}
              Réouvrir
            </Button>
          </>
        }
      >
        <Textarea label="Motif de la réouverture *" required value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Nouvel accord signé, erreur de clôture…" rows={3} />
      </Modal>
    </div>
  );
}

// ─── Tab : codes promo ────────────────────────────────────────────────────────

function CodesTab({ codes }: { codes: AffiliateDetail["codes"] }) {
  if (codes.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm font-medium">Aucun code promo rattaché</p>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Les codes promo se rattachent depuis la gestion des codes promo (PATCH /api/admin/promo-codes/:id/affiliate).
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
            <th className="px-5 py-2.5 font-medium">Code</th>
            <th className="px-5 py-2.5 font-medium">Vertical</th>
            <th className="px-5 py-2.5 font-medium">Remise</th>
            <th className="px-5 py-2.5 text-right font-medium">Taux / code</th>
            <th className="px-5 py-2.5 text-right font-medium">Usages</th>
            <th className="px-5 py-2.5 font-medium">Validité</th>
            <th className="px-5 py-2.5 font-medium">Utilisable</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {codes.map((c) => (
            <tr key={c.promoCodeId} className="hover:bg-[color:var(--muted)]/30">
              <td className="px-5 py-3">
                <span className="font-mono font-semibold">{c.code}</span>
              </td>
              <td className="px-5 py-3 text-xs">{c.vertical}</td>
              <td className="px-5 py-3 text-xs">
                {c.discountType === "PERCENTAGE"
                  ? `${c.discountValue}%`
                  : formatXof(c.discountValue)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-xs">
                {c.affiliateCommissionRate != null ? `${c.affiliateCommissionRate}%` : <span className="text-[color:var(--muted-foreground)]">cascade</span>}
              </td>
              <td className="px-5 py-3 text-right font-mono text-xs">
                {c.currentUsages}
                {c.maxTotalUsages != null && (
                  <span className="text-[color:var(--muted-foreground)]"> / {c.maxTotalUsages}</span>
                )}
              </td>
              <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                {formatDate(c.startDate)} → {formatDate(c.endDate)}
              </td>
              <td className="px-5 py-3">
                <Badge tone={c.isCurrentlyUsable ? "success" : "neutral"}>
                  {c.isCurrentlyUsable ? "Oui" : "Non"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
