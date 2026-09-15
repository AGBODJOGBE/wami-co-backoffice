"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatDateTime, formatXof } from "@/shared/lib/format";
import { CanView } from "@/shared/ui/can-view";
import {
  approveGrantCampaignAction,
  rejectGrantCampaignAction,
  cancelGrantCampaignAction,
  retryFailedGrantLinesAction,
} from "../application/grant-actions";
import {
  GRANT_AUDIENCE_LABELS,
  GRANT_BALANCE_LABELS,
  GRANT_STATUS_LABELS,
  type GrantBalanceType,
  type WalletGrantCampaignDetail,
  type WalletGrantCampaignStatus,
} from "../domain/wallet-grant";

interface Props {
  detail: WalletGrantCampaignDetail;
}

export function WalletGrantDetailPage({ detail }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  const isPending   = detail.status === "PENDING_APPROVAL";
  const isFailed    = detail.status === "PARTIALLY_FAILED";
  const isCancellable = detail.status === "PENDING_APPROVAL";

  function handleApprove() {
    startTransition(async () => {
      const res = await approveGrantCampaignAction(detail.campaignId);
      if (res.success) {
        toast({
          kind: "success",
          title: "Campagne approuvée",
          description: `${res.data?.creditedCount} crédités${res.data?.failedCount ? `, ${res.data.failedCount} échoués` : ""}.`,
        });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Approbation impossible", description: res.error });
      }
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      toast({ kind: "error", title: "Motif requis" });
      return;
    }
    startTransition(async () => {
      const res = await rejectGrantCampaignAction(detail.campaignId, rejectReason.trim());
      if (res.success) {
        toast({ kind: "success", title: "Campagne rejetée" });
        setRejectModal(false);
        setRejectReason("");
        router.refresh();
      } else {
        toast({ kind: "error", title: "Rejet impossible", description: res.error });
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelGrantCampaignAction(detail.campaignId);
      if (res.success) {
        toast({ kind: "success", title: "Campagne annulée" });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Annulation impossible", description: res.error });
      }
    });
  }

  function handleRetry() {
    startTransition(async () => {
      const res = await retryFailedGrantLinesAction(detail.campaignId);
      if (res.success) {
        toast({
          kind: "success",
          title: "Relance effectuée",
          description: `${res.data?.creditedCount} crédités, ${res.data?.failedCount} encore échoués.`,
        });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Relance impossible", description: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance · Campagnes de crédit"
        title={detail.label}
        description={`${GRANT_AUDIENCE_LABELS[detail.audience]} · ${GRANT_BALANCE_LABELS[detail.balanceType as GrantBalanceType] ?? detail.balanceType}`}
        dataSource="live"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/wallet/grants"
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

      {/* Modale rejet */}
      <Modal
        open={rejectModal}
        onClose={() => { setRejectModal(false); setRejectReason(""); }}
        size="md"
        title="Rejeter la campagne"
        description="Le demandeur sera notifié du motif de refus."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectModal(false); setRejectReason(""); }} disabled={pending}>Annuler</Button>
            <Button variant="danger" onClick={handleReject} disabled={pending || !rejectReason.trim()}>
              {pending && <Spinner size="sm" />}
              Rejeter
            </Button>
          </>
        }
      >
        <Textarea label="Motif du refus *" required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Budget insuffisant, ciblage trop large…" rows={3} />
      </Modal>

      {/* Actions maker/checker */}
      {(isPending || isFailed || isCancellable) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
          {isPending && (
            <CanView permission="wallet.grant.approve">
              <Button
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                variant="outline"
                onClick={handleApprove}
                disabled={pending}
              >
                {pending ? <Spinner size="sm" /> : <CheckCircle2 className="size-4" />}
                Approuver et exécuter
              </Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                onClick={() => setRejectModal(true)}
                disabled={pending}
              >
                <XCircle className="size-4" />
                Rejeter
              </Button>
            </CanView>
          )}
          {isCancellable && (
            <CanView permission="wallet.grant.request">
              <Button variant="outline" onClick={handleCancel} disabled={pending}>
                {pending && <Spinner size="sm" />}
                Annuler la demande
              </Button>
            </CanView>
          )}
          {isFailed && (
            <CanView permission="wallet.grant.approve">
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                onClick={handleRetry}
                disabled={pending}
              >
                {pending ? <Spinner size="sm" /> : <RotateCcw className="size-4" />}
                Rejouer les lignes échouées ({detail.failedCount})
              </Button>
            </CanView>
          )}
        </div>
      )}

      {/* Infos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {([
              { label: "Statut",        value: <StatusBadge status={detail.status} /> },
              { label: "Audience",      value: GRANT_AUDIENCE_LABELS[detail.audience] },
              { label: "Balance",       value: GRANT_BALANCE_LABELS[detail.balanceType as GrantBalanceType] ?? detail.balanceType },
              { label: "Par bénéf.",    value: <span className="font-mono">{formatXof(detail.amountPerBeneficiary)}</span> },
              { label: "Total",         value: <span className="font-mono font-semibold">{formatXof(detail.totalAmount)}</span> },
              { label: "Bénéficiaires", value: detail.beneficiaryCount.toLocaleString("fr-FR") },
              { label: "Crédités",      value: <span className="text-emerald-600">{detail.creditedCount}</span> },
              { label: "Échoués",       value: detail.failedCount > 0 ? <span className="font-semibold text-red-600">{detail.failedCount}</span> : "0" },
              { label: "Créé par",      value: <span className="font-mono text-xs">{detail.createdBy.slice(0, 12)}…</span> },
              { label: "Créé le",       value: formatDate(detail.createdAt) },
              { label: "Approuvé par",  value: detail.approvedBy ? <span className="font-mono text-xs">{detail.approvedBy.slice(0, 12)}…</span> : "—" },
              { label: "Approuvé le",   value: detail.approvedAt ? formatDate(detail.approvedAt) : "—" },
              { label: "Exécuté le",    value: detail.executedAt ? formatDate(detail.executedAt) : "—" },
              { label: "Expiration",    value: detail.expiresAt ? formatDate(detail.expiresAt) : "—" },
            ] as const).map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          {detail.rejectionReason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">Motif du rejet</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{detail.rejectionReason}</p>
            </div>
          )}
        </Card>

        {/* Ciblage */}
        <Card className="p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Ciblage</CardTitle>
            <CardDescription>
              Mode : <span className="font-mono">{detail.targeting.mode}</span>
            </CardDescription>
          </CardHeader>
          {detail.targeting.mode === "EXPLICIT" && detail.targeting.beneficiaryIds ? (
            <div>
              <p className="mb-2 text-xs text-[color:var(--muted-foreground)]">
                {detail.targeting.beneficiaryIds.length} IDs explicites
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[color:var(--border)] p-2">
                {detail.targeting.beneficiaryIds.slice(0, 20).map((id) => (
                  <p key={id} className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{id}</p>
                ))}
                {detail.targeting.beneficiaryIds.length > 20 && (
                  <p className="text-[10px] text-[color:var(--muted-foreground)]">+{detail.targeting.beneficiaryIds.length - 20} autres</p>
                )}
              </div>
            </div>
          ) : detail.targeting.filters && Object.keys(detail.targeting.filters).length > 0 ? (
            <pre className="overflow-auto rounded-lg border border-[color:var(--border)] p-2 text-[10px]">
              {JSON.stringify(detail.targeting.filters, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-[color:var(--muted-foreground)]">Tous les membres de l&apos;audience</p>
          )}
        </Card>
      </div>

      {/* Lignes d'exécution */}
      {detail.lines.length > 0 && (
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-5 py-4">
            <CardTitle>Lignes d&apos;exécution</CardTitle>
            <CardDescription>{detail.lines.length} lignes</CardDescription>
          </CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <th className="px-5 py-2.5 font-medium">Bénéficiaire</th>
                <th className="px-5 py-2.5 text-right font-medium">Montant</th>
                <th className="px-5 py-2.5 font-medium">Statut</th>
                <th className="px-5 py-2.5 font-medium">Crédité le</th>
                <th className="px-5 py-2.5 font-medium">Erreur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {detail.lines.map((line, i) => (
                <tr key={line.beneficiaryId + i} className="hover:bg-[color:var(--muted)]/30">
                  <td className="px-5 py-3 font-mono text-xs">{line.beneficiaryId.slice(0, 16)}…</td>
                  <td className="px-5 py-3 text-right font-mono">{formatXof(line.amount)}</td>
                  <td className="px-5 py-3">
                    <Badge
                      tone={
                        line.status === "CREDITED" ? "success"
                        : line.status === "FAILED"  ? "danger"
                        : "warning"
                      }
                    >
                      {line.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                    {line.creditedAt ? formatDateTime(line.creditedAt) : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-red-600 dark:text-red-400">
                    {line.failureReason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: WalletGrantCampaignStatus }) {
  const tone =
    status === "COMPLETED"          ? "success"
    : status === "APPROVED"         ? "info"
    : status === "PENDING_APPROVAL" ? "warning"
    : status === "PARTIALLY_FAILED" ? "danger"
    : "neutral";
  return <Badge tone={tone}>{GRANT_STATUS_LABELS[status] ?? status}</Badge>;
}
