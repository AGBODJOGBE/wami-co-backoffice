"use client";

import { useEffect, useState, useTransition } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Spinner } from "@/shared/ui/spinner";
import { formatDateTime } from "@/shared/lib/format";
import { getRideMatchingAction } from "../application/actions";
import {
  MATCHING_FAILURE_REASON_LABELS,
  MATCHING_MILESTONE_LABELS,
  MATCHING_OUTCOME_LABELS,
  MATCHING_TRIGGER_LABELS,
  type MatchingCycle,
  type RideMatchingResponse,
} from "../domain/admin-ride";

export function RideMatchingTab({ rideId }: { rideId: string }) {
  const [data, setData] = useState<RideMatchingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  function load() {
    startLoading(async () => {
      const r = await getRideMatchingAction(rideId);
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
          <CardTitle className="text-sm">Recherche chauffeur</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Recharger
          </Button>
        </div>
        <CardDescription>
          Compteurs et cycles de dispatch — jamais de nom, téléphone ou position de chauffeur ici.
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
          <Body d={data} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function Body({ d }: { d: RideMatchingResponse }) {
  if (!d.available) {
    return (
      <p className="flex items-start gap-2 text-sm text-[color:var(--muted-foreground)]">
        <Info className="mt-0.5 size-4 shrink-0" />
        Cette course n&apos;a pas été tracée (antérieure au chantier de traçabilité, ou pickup/réservation
        jamais dispatchée). Ce n&apos;est pas la preuve d&apos;une absence de chauffeur trouvé.
      </p>
    );
  }

  const s = d.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Chauffeurs sollicités" value={s.solicitedCount} />
        <Stat label="Ignorés (timeout + refus)" value={s.ignoredCount} />
        <Stat label="Cycles enregistrés" value={s.cycles.length} />
      </div>

      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="uppercase tracking-wider text-[color:var(--muted-foreground)]">Première sollicitation</dt>
          <dd className="mt-0.5">{s.firstSolicitedAt ? formatDateTime(s.firstSolicitedAt) : "—"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-[color:var(--muted-foreground)]">Dernière sollicitation</dt>
          <dd className="mt-0.5">{s.lastSolicitedAt ? formatDateTime(s.lastSolicitedAt) : "—"}</dd>
        </div>
      </dl>

      {s.finalReason && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-950/30">
          <Badge tone="danger">Échec</Badge>
          <span className="text-sm text-red-700 dark:text-red-300">
            {MATCHING_FAILURE_REASON_LABELS[s.finalReason] ?? s.finalReason}
          </span>
          {s.finalAt && (
            <span className="ml-auto text-[11px] text-[color:var(--muted-foreground)]">
              {formatDateTime(s.finalAt)}
            </span>
          )}
        </div>
      )}

      {s.milestones.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Jalons ({s.milestones.length})
          </h4>
          <div className="flex flex-col gap-1.5">
            {s.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Badge tone="info">{MATCHING_MILESTONE_LABELS[m.code] ?? m.code}</Badge>
                <span className="text-[color:var(--muted-foreground)]">{formatDateTime(m.at)}</span>
                {m.detail && <span className="text-[color:var(--muted-foreground)]">· {m.detail}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          Cycles ({s.cycles.length}{s.cycles.length === 30 ? " — fenêtre de 30 pleine" : ""})
        </h4>
        {s.cycles.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun cycle enregistré.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {s.cycles.map((c, i) => <CycleRow key={i} cycle={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function CycleRow({ cycle }: { cycle: MatchingCycle }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{MATCHING_TRIGGER_LABELS[cycle.trigger] ?? cycle.trigger}</Badge>
        <span className="text-xs text-[color:var(--muted-foreground)]">{cycle.vehicleType}</span>
        <span className="text-[11px] text-[color:var(--muted-foreground)]">{formatDateTime(cycle.at)}</span>
        <Badge
          tone={cycle.outcome === "SOLICITED" ? "success" : "warning"}
          className="ml-auto"
        >
          {MATCHING_OUTCOME_LABELS[cycle.outcome] ?? cycle.outcome}
        </Badge>
      </div>
      {cycle.steps.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <th className="py-1 pr-3 font-medium">Rayon</th>
                <th className="py-1 pr-3 font-medium">Trouvés</th>
                <th className="py-1 pr-3 font-medium">Exclus (solde)</th>
                <th className="py-1 pr-3 font-medium">Déjà contactés</th>
                <th className="py-1 font-medium">Éligibles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]/60">
              {cycle.steps.map((s, i) => (
                <tr key={i}>
                  <td className="py-1 pr-3 font-mono">{s.radiusKm} km</td>
                  <td className="py-1 pr-3 font-mono">{s.found >= 20 ? "≥20" : s.found}</td>
                  <td className="py-1 pr-3 font-mono">{s.excludedBalance}</td>
                  <td className="py-1 pr-3 font-mono">{s.alreadyContacted}</td>
                  <td className="py-1 font-mono">{s.eligible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cycle.presence && (
        <p className="mt-2 text-[11px] text-[color:var(--muted-foreground)]">
          Présence au moment du cycle : {cycle.presence.onlineTotal} en ligne au total ·{" "}
          {cycle.presence.onlineAnyCategoryInRadius} dans le rayon ·{" "}
          {cycle.presence.onlineFreeAnyCategoryInRadius} libres dans le rayon
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}
