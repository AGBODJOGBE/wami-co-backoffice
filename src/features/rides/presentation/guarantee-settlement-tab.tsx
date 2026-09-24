"use client";

import { useEffect, useState, useTransition } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Spinner } from "@/shared/ui/spinner";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import { getGuaranteeSettlementAction } from "../application/actions";
import {
  GUARANTEE_HOLD_META,
  GUARANTEE_MOVEMENT_LABELS,
  type GuaranteeSettlement,
} from "../domain/scheduled-rides";

export function GuaranteeSettlementTab({ rideId }: { rideId: string }) {
  const [data, setData] = useState<GuaranteeSettlement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  function load() {
    startLoading(async () => {
      const r = await getGuaranteeSettlementAction(rideId);
      if (r.ok && r.data) {
        setData(r.data);
        setError(null);
      } else {
        setError(r.message);
      }
    });
  }

  useEffect(load, [rideId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Garantie de réservation</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Recharger
          </Button>
        </div>
        <CardDescription>
          Qu&apos;est devenue la garantie de ce client, et qui a payé quoi. Le sort de la garantie ne se déduit
          jamais du statut de la course : seuls les mouvements ci-dessous le disent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="flex justify-center py-8">
            <Spinner label="Chargement…" />
          </div>
        ) : error ? (
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        ) : data ? (
          <Body s={data} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function Body({ s }: { s: GuaranteeSettlement }) {
  if (!s.guarantee) {
    return (
      <p className="flex items-start gap-2 text-sm text-[color:var(--muted-foreground)]">
        <Info className="mt-0.5 size-4 shrink-0" />
        Aucune garantie n&apos;a été gelée pour cette course (course instantanée, ou réservation antérieure au
        chantier).
      </p>
    );
  }
  const g = s.guarantee;
  const hold = GUARANTEE_HOLD_META[g.holdStatus];
  const net = s.incident.platformNetOnIncident;
  const hasIncident = s.incident.compensationAmount > 0 || s.incident.penaltyAmount > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={hold.tone}>{hold.label}</Badge>
        <span className="text-xs text-[color:var(--muted-foreground)]">{hold.hint}</span>
        <span className="ml-auto font-mono text-lg font-bold">{formatXof(g.amount)}</span>
        {g.ratePct != null && (
          <span className="text-xs text-[color:var(--muted-foreground)]">({g.ratePct} % du prix)</span>
        )}
      </div>

      <dl className="grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-wider text-[color:var(--muted-foreground)]">Gelée le</dt>
          <dd className="mt-0.5">{formatDateTime(g.heldAt)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-[color:var(--muted-foreground)]">Résolue le</dt>
          <dd className="mt-0.5">{g.resolvedAt ? formatDateTime(g.resolvedAt) : "—"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-[color:var(--muted-foreground)]">Transaction de résolution</dt>
          <dd className="mt-0.5 font-mono">{g.resolutionTransactionId ?? "—"}</dd>
        </div>
      </dl>

      {hasIncident && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Compensation client" value={formatXof(s.incident.compensationAmount)} />
          <Stat label="Pénalité pilote" value={formatXof(s.incident.penaltyAmount)} />
          <Stat
            label="Écart net ForYou"
            value={`${net > 0 ? "+" : ""}${formatXof(net)}`}
            tone={net < 0 ? "danger" : net > 0 ? "success" : "neutral"}
            hint={
              net < 0
                ? "Négatif : ForYou finance l'écart de sa poche. Normal, pas une anomalie."
                : net > 0
                  ? "ForYou encaisse plus qu'elle ne verse."
                  : undefined
            }
          />
        </div>
      )}

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          Mouvements ({s.movements.length})
        </h4>
        {s.movements.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun mouvement enregistré.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[color:var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  <th className="px-4 py-2 font-medium">Opération</th>
                  <th className="px-4 py-2 font-medium">Sens</th>
                  <th className="px-4 py-2 text-right font-medium">Montant</th>
                  <th className="px-4 py-2 text-right font-medium">Solde avant → après</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {s.movements.map((m) => (
                  <tr key={m.transactionId} className={m.isMarker ? "bg-[color:var(--muted)]/30" : ""}>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium">
                          {GUARANTEE_MOVEMENT_LABELS[m.type] ?? m.type}
                        </span>
                        <span className="text-[10px] text-[color:var(--muted-foreground)]">{m.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {m.isMarker ? (
                        <Badge tone="neutral">Marqueur d&apos;audit</Badge>
                      ) : (
                        <Badge tone={m.direction === "CREDIT" ? "success" : "danger"}>
                          {m.direction === "CREDIT" ? "Crédit" : "Débit"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatXof(m.amount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-[color:var(--muted-foreground)]">
                      {m.isMarker ? "aucun mouvement" : `${formatXof(m.balanceBefore)} → ${formatXof(m.balanceAfter)}`}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[color:var(--muted-foreground)]">
                      {formatDateTime(m.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-[color:var(--muted-foreground)]">
          Un « marqueur d&apos;audit » (solde inchangé) n&apos;est pas un encaissement : la saisie et l&apos;imputation
          ont leur jambe économique dans une autre transaction, sur le wallet PLATFORM.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
  hint?: string;
}) {
  const color =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-[color:var(--foreground)]";
  return (
    <div className="rounded-lg border border-[color:var(--border)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</p>
      <p className={`mt-0.5 font-mono text-lg font-bold ${color}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">{hint}</p> : null}
    </div>
  );
}
