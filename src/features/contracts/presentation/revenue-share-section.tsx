"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRightLeft, Pencil, Percent } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CanView } from "@/shared/ui/can-view";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import {
  REVENUE_SHARE_ALERT_REASON_LABELS,
  REVENUE_SHARE_SOURCE_LABELS,
  formatXof,
  type Contract,
  type RevenueShareWithholdingsResult,
} from "../domain/contract";
import { switchToRevenueShareAction, updateRevenueShareRateAction } from "../application/actions";

export interface RevenueShareSectionProps {
  contract: Contract;
  withholdings: RevenueShareWithholdingsResult | null;
}

export function RevenueShareSection({ contract, withholdings }: RevenueShareSectionProps) {
  const router = useRouter();
  const canSwitch = contract.status === "ACTIVE" || contract.status === "SUSPENDED";

  if (contract.modeRemboursement !== "PAR_REVENU") {
    if (!canSwitch) return null;
    return (
      <CanView permission="contract.modify_terms">
        <SwitchToRevenueShareCard contractId={contract.contractId} onDone={() => router.refresh()} />
      </CanView>
    );
  }

  const summary = contract.revenueShareSummary;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
            <Percent className="size-4 text-sky-500" />
          </div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
            Prélèvement sur revenus
          </h3>
        </div>
        <RateEditor
          contractId={contract.contractId}
          current={contract.tauxPrelevementRevenu ?? 0}
          onDone={() => router.refresh()}
        />
      </div>

      {/* Alertes */}
      {summary && summary.alertReasons.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Attention requise
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.alertReasons.map((r) => (
              <Badge key={r} tone="warning">{REVENUE_SHARE_ALERT_REASON_LABELS[r] ?? r}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Résumé */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
            Cumul prélevé
          </span>
          <span className="font-mono text-lg font-bold text-[color:var(--foreground)]">
            {formatXof(summary?.cumulPreleve ?? 0)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
            Dernier prélèvement
          </span>
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {summary?.dernierPrelevement ? formatDateTime(summary.dernierPrelevement) : "Aucun pour l'instant"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
            Basculé le
          </span>
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {contract.dateBasculePrelevement ? formatDate(contract.dateBasculePrelevement) : "—"}
          </span>
        </div>
      </div>

      {/* Historique */}
      <div className="flex flex-col gap-0.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
          Historique des prélèvements
          {withholdings && withholdings.total > 0 && (
            <span className="ml-1.5 font-mono font-normal">({withholdings.total})</span>
          )}
        </h4>
      </div>

      {!withholdings || withholdings.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Aucun prélèvement enregistré pour l&apos;instant.
        </p>
      ) : (
        <div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-[color:var(--border)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[color:var(--muted)]/60 backdrop-blur">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]/60">
              {withholdings.items.map((w) => (
                <tr key={w.transactionId}>
                  <td className="px-4 py-2 text-xs text-[color:var(--muted-foreground)]">
                    {formatDateTime(w.date)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone="info">
                      {w.sourceType ? (REVENUE_SHARE_SOURCE_LABELS[w.sourceType] ?? w.sourceType) : "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-sky-600 dark:text-sky-400">
                    −{formatXof(w.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {withholdings.total > withholdings.items.length && (
            <p className="px-4 py-2 text-center text-[11px] text-[color:var(--muted-foreground)]">
              {withholdings.items.length} sur {withholdings.total} prélèvements affichés.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Bascule ECHEANCIER → PAR_REVENU ───────────────────────────────────────────

function SwitchToRevenueShareCard({ contractId, onDone }: { contractId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [tauxPct, setTauxPct] = useState(50);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const taux = tauxPct / 100;
      const r = await switchToRevenueShareAction(contractId, taux);
      if (r.ok) {
        toast({ kind: "success", title: "Contrat basculé", description: r.message });
        setOpen(false);
        onDone();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
            <ArrowRightLeft className="size-4 text-sky-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">
              Basculer vers un prélèvement sur revenus
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Remplace l&apos;échéancier fixe par un pourcentage prélevé sur chaque course/livraison.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <ArrowRightLeft className="size-4" />
          Basculer
        </Button>
      </Card>

      <ConfirmModal
        open={open}
        onClose={() => !pending && setOpen(false)}
        onConfirm={submit}
        title="Basculer vers le prélèvement sur revenus ?"
        description={
          <div className="flex flex-col gap-3">
            <p>
              Les échéances <strong>à venir</strong> de ce contrat seront{" "}
              <strong>annulées définitivement</strong>. Les échéances déjà en défaut
              continuent d&apos;être recouvrées normalement. Si le chauffeur est
              actuellement bloqué pour impayés, il sera <strong>débloqué automatiquement</strong>.
            </p>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-[color:var(--foreground)]">
              Taux de prélèvement (%)
              <Input
                type="number"
                min={5}
                max={100}
                step={1}
                value={tauxPct}
                onChange={(e) => setTauxPct(Math.min(100, Math.max(5, Number(e.target.value))))}
                hint="Entre 5% et 100% — appliqué à chaque course/livraison du chauffeur."
              />
            </label>
          </div>
        }
        confirmLabel="Basculer le contrat"
        tone="primary"
        isLoading={pending}
      />
    </>
  );
}

// ─── Éditeur de taux inline ─────────────────────────────────────────────────────

function RateEditor({
  contractId,
  current,
  onDone,
}: {
  contractId: string;
  current: number;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState(Math.round(current * 100));
  const [pending, start] = useTransition();

  function save() {
    const taux = pct / 100;
    if (taux === current) { setEditing(false); return; }
    start(async () => {
      const r = await updateRevenueShareRateAction(contractId, taux);
      if (r.ok) {
        toast({ kind: "success", title: "Taux mis à jour", description: r.message });
        setEditing(false);
        onDone();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-bold text-sky-600 dark:text-sky-400">
          {Math.round(current * 100)}%
        </span>
        <CanView permission="contract.modify_terms">
          <button
            type="button"
            onClick={() => { setPct(Math.round(current * 100)); setEditing(true); }}
            className="rounded p-1 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            title="Modifier le taux"
          >
            <Pencil className="size-3.5" />
          </button>
        </CanView>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={5}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => setPct(Math.min(100, Math.max(5, Number(e.target.value))))}
        disabled={pending}
        className="h-8 w-20 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
      />
      <span className="text-xs text-[color:var(--muted-foreground)]">%</span>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded bg-[color:var(--primary)] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
      >
        {pending ? <Spinner size="sm" /> : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={pending}
        className="rounded px-1.5 py-1 text-[10px] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  );
}
