"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Info, MapPinned, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Spinner } from "@/shared/ui/spinner";
import { formatDateTime } from "@/shared/lib/format";
import { usePermissions } from "@/features/auth/presentation/use-permissions";
import { getRideGpsTrackAction, getRideTelemetryAction } from "../application/actions";
import {
  DATA_AVAILABILITY_META,
  RIDE_END_STATUS_LABELS,
  ROUTE_SOURCE_LABELS,
  TELEMETRY_UNAVAILABLE_REASONS,
  TRACK_STATUS_COLORS,
  TRACK_STATUS_LABELS,
  TRACK_UNAVAILABLE_REASONS,
  type RideGpsTrackResponse,
  type RideTelemetryResponse,
  type RideTelemetrySummary,
} from "../domain/ride-telemetry";

const RideTrackMap = dynamic(() => import("./ride-track-map").then((m) => m.RideTrackMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/30">
      <Spinner label="Chargement de la carte…" />
    </div>
  ),
});

// ─── Formatage — null = « inconnu », jamais 0 (doctrine D2 du backend) ───────

const UNKNOWN = "—";

function meters(v: number | null): string {
  if (v == null) return UNKNOWN;
  return v >= 1000 ? `${(v / 1000).toFixed(2)} km` : `${Math.round(v)} m`;
}
function seconds(v: number | null): string {
  if (v == null) return UNKNOWN;
  const m = Math.floor(v / 60);
  const s = Math.round(v % 60);
  return m > 0 ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}
function num(v: number | null, suffix = ""): string {
  return v == null ? UNKNOWN : `${Number.isInteger(v) ? v : v.toFixed(1)}${suffix}`;
}
function yesNo(v: boolean | null): React.ReactNode {
  if (v == null) return <span className="text-[color:var(--muted-foreground)]">{UNKNOWN}</span>;
  return v ? <Badge tone="warning">Oui</Badge> : <Badge tone="neutral">Non</Badge>;
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <div className="flex flex-col">
        <span className="text-[color:var(--muted-foreground)]">{label}</span>
        {hint ? <span className="text-[10px] text-[color:var(--muted-foreground)]/80">{hint}</span> : null}
      </div>
      <span className="text-right font-mono font-medium text-[color:var(--foreground)]">{value}</span>
    </div>
  );
}

// ─── Onglet ───────────────────────────────────────────────────────────────────

export function RideTelemetryTab({ rideId }: { rideId: string }) {
  const { can } = usePermissions();
  const canSummary = can("ride.telemetry.view");
  const canTrack = can("ride.telemetry.track.view");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Outil d&apos;arbitrage de litiges de distance. <strong>Chaque consultation est journalisée</strong> — si le
          journal est indisponible, l&apos;accès est refusé plutôt que non tracé. Une valeur « — » signifie
          « inconnu », jamais zéro.
        </p>
      </div>

      {canSummary ? (
        <SummarySection rideId={rideId} />
      ) : (
        <NoAccess label="le résumé télémétrique" permission="ride.telemetry.view" />
      )}

      {canTrack ? (
        <TrackSection rideId={rideId} />
      ) : (
        <NoAccess label="la trace GPS brute" permission="ride.telemetry.track.view" />
      )}
    </div>
  );
}

function NoAccess({ label, permission }: { label: string; permission: string }) {
  return (
    <Card className="flex items-center gap-3 p-5 text-sm text-[color:var(--muted-foreground)]">
      <ShieldAlert className="size-5 shrink-0" />
      <span>
        Accès à {label} réservé — permission <span className="font-mono">{permission}</span> requise.
      </span>
    </Card>
  );
}

// ─── Résumé permanent ─────────────────────────────────────────────────────────

function SummarySection({ rideId }: { rideId: string }) {
  const [data, setData] = useState<RideTelemetryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  function load() {
    startLoading(async () => {
      const r = await getRideTelemetryAction(rideId);
      if (r.ok && r.data) {
        setData(r.data);
        setError(null);
      } else {
        setError(r.message);
      }
    });
  }

  // Chargé à l'ouverture de l'onglet uniquement (le contenu n'est monté que
  // quand l'onglet est actif) — jamais au rendu de la page.
  useEffect(load, [rideId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Résumé télémétrique</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Recharger
          </Button>
        </div>
        <CardDescription>Calculé une seule fois à la fin de vie de la course, conservé sans limite de durée.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="flex justify-center py-8">
            <Spinner label="Chargement du résumé…" />
          </div>
        ) : error ? (
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        ) : data && !data.available ? (
          <p className="flex items-start gap-2 text-sm text-[color:var(--muted-foreground)]">
            <Info className="mt-0.5 size-4 shrink-0" />
            {TELEMETRY_UNAVAILABLE_REASONS[data.reason] ?? data.reason}
          </p>
        ) : data ? (
          <SummaryBody summary={data.summary} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryBody({ summary }: { summary: RideTelemetrySummary }) {
  const { distances: d, durations: t, decisions: dec, signal: s } = summary;
  const avail = DATA_AVAILABILITY_META[summary.dataAvailability];
  const isCompleted = summary.outcome === "COMPLETED";

  const discrepancy =
    d.clientReportedMeters != null && d.serverMeteredMeters != null
      ? d.clientReportedMeters - d.serverMeteredMeters
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{RIDE_END_STATUS_LABELS[summary.outcome] ?? summary.outcome}</Badge>
        <Badge tone={avail.tone}>{avail.label}</Badge>
        <span className="text-xs text-[color:var(--muted-foreground)]">{avail.hint}</span>
        <span className="ml-auto text-[11px] text-[color:var(--muted-foreground)]">
          Calculé le {formatDateTime(summary.computedAt)}
        </span>
      </div>

      {dec.distanceUnverifiable === true && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          La distance n&apos;a pas pu être vérifiée par une route réelle (repli d&apos;estimation) — elle ne peut pas
          servir seule à trancher un litige.
        </div>
      )}
      {dec.runawayGuardTriggered === true && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Garde-fou anti-dérive déclenché : la distance facturée a été plafonnée
          {dec.runawayGuardPreCapMeters != null ? ` (avant plafonnement : ${meters(dec.runawayGuardPreCapMeters)})` : ""}.
        </div>
      )}

      <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Distances</h4>
          <div className="divide-y divide-[color:var(--border)]">
            <Row label="Distance facturée" value={meters(d.billedMeters)} />
            <Row label="Mesurée par le serveur" value={meters(d.serverMeteredMeters)} />
            <Row label="Annoncée par l'application" value={meters(d.clientReportedMeters)} />
            <Row
              label="Écart app − serveur"
              value={discrepancy == null ? UNKNOWN : `${discrepancy > 0 ? "+" : ""}${meters(discrepancy)}`}
              hint="Un fort écart positif suggère une distance gonflée côté application."
            />
            <Row label="Parcourue en course (facturable)" value={meters(d.billableDrivenMeters)} />
            <Row
              label="Route de référence OSRM"
              value={meters(d.osrmReferenceRouteMeters)}
              hint={d.osrmReferenceRouteSource ? ROUTE_SOURCE_LABELS[d.osrmReferenceRouteSource] : undefined}
            />
            <Row label="Approche du chauffeur (parcourue)" value={meters(d.approachDrivenMeters)} />
            <Row label="Approche (ligne droite)" value={meters(d.approachStraightLineMeters)} />
          </div>
        </section>

        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Durées</h4>
          <div className="divide-y divide-[color:var(--border)]">
            <Row label="Approche du chauffeur" value={seconds(t.approachSeconds)} />
            <Row label="Attente au point de départ" value={seconds(t.waitingAtPickupSeconds)} />
            <Row label="Course" value={seconds(t.rideSeconds)} />
            <Row label="Total en pause" value={seconds(t.totalPausedSeconds)} />
          </div>

          <h4 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Décisions du système
          </h4>
          {isCompleted ? (
            <div className="divide-y divide-[color:var(--border)]">
              <Row label="Distance plancher appliquée" value={yesNo(dec.distanceFloorApplied)} hint="Le minimum de distance a remplacé la mesure." />
              <Row label="Garde-fou anti-dérive" value={yesNo(dec.runawayGuardTriggered)} />
              <Row label="Distance non vérifiable" value={yesNo(dec.distanceUnverifiable)} />
              <Row label="Trous GPS comblés" value={num(dec.gapRecoveries)} />
              <Row label="… dont repli ligne droite" value={num(dec.gapHaversineFallbacks)} />
            </div>
          ) : (
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Non applicable : une course non terminée n&apos;a jamais été facturée.
            </p>
          )}
        </section>
      </div>

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Qualité du signal GPS</h4>
        <div className="grid gap-x-8 divide-y divide-[color:var(--border)] lg:grid-cols-2 lg:divide-y-0">
          <div className="divide-y divide-[color:var(--border)]">
            <Row label="Points captés" value={num(s.pointsCount)} />
            <Row label="Précision moyenne" value={num(s.averageAccuracyMeters, " m")} />
            <Row label="Précision max (pire)" value={num(s.maxAccuracyMeters, " m")} />
            <Row label="Intervalle médian entre points" value={seconds(s.medianPingIntervalSeconds)} />
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            <Row label="Plus long trou de signal" value={seconds(s.longestGapSeconds)} />
            <Row label="Points écartés" value={num(s.discardedPointsCount)} />
            <Row label="Trace tronquée" value={yesNo(s.truncated)} />
            <Row label="Points avec horodatage téléphone" value={num(s.pointsWithDeviceTimestampCount)} />
            <Row
              label="Points probablement rejoués"
              value={num(s.likelyReplayedPointsCount)}
              hint="Positions anciennes renvoyées après une coupure réseau."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Trace GPS brute ──────────────────────────────────────────────────────────

const EVERY_OPTIONS = [
  { value: "1", label: "Résolution complète" },
  { value: "2", label: "1 point sur 2" },
  { value: "5", label: "1 point sur 5" },
  { value: "10", label: "1 point sur 10" },
  { value: "20", label: "1 point sur 20" },
];

function TrackSection({ rideId }: { rideId: string }) {
  const [every, setEvery] = useState("1");
  const [data, setData] = useState<RideGpsTrackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  // Volontairement PAS de chargement automatique : localisation individuelle
  // sensible, chaque accès est journalisé — l'admin la demande explicitement.
  function load() {
    startLoading(async () => {
      const r = await getRideGpsTrackAction(rideId, Number(every));
      if (r.ok && r.data) {
        setData(r.data);
        setError(null);
      } else {
        setError(r.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPinned className="size-4" />
            Trace GPS brute
          </CardTitle>
          <div className="flex items-center gap-2">
            <Combobox options={EVERY_OPTIONS} value={every} onChange={setEvery} className="w-48" />
            <Button size="sm" onClick={load} disabled={loading}>
              {loading ? <Spinner size="sm" /> : <MapPinned className="size-4" />}
              {data ? "Recharger la trace" : "Afficher la trace"}
            </Button>
          </div>
        </div>
        <CardDescription>
          Positions individuelles du chauffeur, rejouées sur la carte. Donnée de localisation sensible — chaque
          affichage est journalisé. Conservée 14 jours après la clôture de la course.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        ) : !data ? (
          <p className="text-sm text-[color:var(--muted-foreground)]">
            La trace n&apos;est pas chargée automatiquement. Clique sur « Afficher la trace » pour la consulter.
          </p>
        ) : !data.trackAvailable ? (
          <p className="flex items-start gap-2 text-sm text-[color:var(--muted-foreground)]">
            <Info className="mt-0.5 size-4 shrink-0" />
            {TRACK_UNAVAILABLE_REASONS[data.reason] ?? data.reason}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <RideTrackMap segments={data.geojson.features} points={data.points} />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
              {Object.keys(TRACK_STATUS_COLORS).map((st) => (
                <span key={st} className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-5 rounded-full" style={{ backgroundColor: TRACK_STATUS_COLORS[st] }} />
                  {TRACK_STATUS_LABELS[st]}
                </span>
              ))}
              <span className="ml-auto font-mono">
                {data.decimatedPointCount.toLocaleString("fr-FR")} affichés / {data.pointCount.toLocaleString("fr-FR")} archivés
                {data.every > 1 ? ` (1 sur ${data.every})` : ""}
              </span>
            </div>

            {data.truncated && (
              <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Trace tronquée : {data.discardedPointsCount.toLocaleString("fr-FR")} point(s) écarté(s) au-delà du plafond d&apos;archivage.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
