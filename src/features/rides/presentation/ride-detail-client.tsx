"use client";

import { useState, useTransition } from "react";
import { useReverseGeocode } from "@/shared/lib/use-reverse-geocode";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Car,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Flag,
  MapPin,
  Navigation,
  PauseCircle,
  Phone,
  RefreshCw,
  Route,
  Star,
  Timer,
  TrendingUp,
  User,
  Wallet,
  Wrench,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DetailHeader } from "@/shared/ui/detail-header";
import { CopyableId } from "@/shared/ui/copy-button";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs } from "@/shared/ui/tabs";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import { rideStatusMeta, type RideDetail } from "../domain/admin-ride";
import { InterventionDesignModal } from "./intervention-design-modal";
import { RideTelemetryTab } from "./ride-telemetry-tab";
import { GuaranteeSettlementTab } from "./guarantee-settlement-tab";
import { usePermissions } from "@/features/auth/presentation/use-permissions";

/* ─────────────────────────── helpers ──────────────────────────────────── */

const TERMINAL: ReadonlySet<string> = new Set([
  "COMPLETED", "RATED", "CANCELLED_PASSENGER", "CANCELLED_DRIVER", "CANCELLED_SYSTEM",
]);

function fmtSec(s: number | null | undefined): string {
  if (s == null || s === 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m === 0 ? `${sec}s` : `${m}min ${sec > 0 ? ` ${sec}s` : ""}`;
}

function fmtMeter(m: number | null | undefined): string {
  if (m == null) return "—";
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m} m`;
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/* ─────────────────────────── component ────────────────────────────────── */

export interface RideDetailClientProps {
  ride: RideDetail;
}

export function RideDetailClient({ ride }: RideDetailClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [interventionOpen, setInterventionOpen] = useState(false);
  const { canAny, can } = usePermissions();

  const statusMeta  = rideStatusMeta(ride.status);
  const isTerminal  = TERMINAL.has(ride.status);
  const isCancelled = ride.status.startsWith("CANCELLED");
  const isRated     = ride.status === "RATED";

  const finalPrice  = ride.finalPrice     ?? 0;
  const estimated   = ride.estimatedPrice ?? 0;
  const billed      = finalPrice || estimated;
  const commission  = ride.platformCommission ?? null;
  const earnings    = ride.driverEarnings     ?? null;

  const passengerName = `${ride.passenger?.firstName ?? ""} ${ride.passenger?.lastName ?? ""}`.trim() || "—";
  const driverName    = ride.driver
    ? `${ride.driver.firstName ?? ""} ${ride.driver.lastName ?? ""}`.trim() || "—"
    : "—";

  /* ── Tab: Général ─────────────────────────────────────────────────────── */
  const tabGeneral = (
    <div className="flex flex-col gap-6">
      {/* ── Passenger + Driver side by side ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PartyCard
          icon={<User className="size-4" />}
          title="Passager"
          name={passengerName}
          phone={ride.passenger?.phoneNumber}
          id={ride.passenger?.passengerId}
          idPrefix="Passager"
          href={undefined}
          extra={ride.isFirstRideForPassenger
            ? <Badge tone="info">1ère course</Badge>
            : undefined}
        />
        {ride.driver ? (
          <PartyCard
            icon={<Car className="size-4" />}
            title="Driver"
            name={driverName}
            phone={ride.driver.phoneNumber}
            id={ride.driver.driverId}
            idPrefix="Driver"
            href={`/vtc/drivers/${ride.driver.driverId}`}
            extra={
              <div className="flex items-center gap-3 text-xs text-[color:var(--muted-foreground)]">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-mono font-semibold text-[color:var(--foreground)]">
                    {ride.driver.rating.toFixed(1)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Car className="size-3.5" />
                  <span className="font-mono font-semibold text-[color:var(--foreground)]">
                    {ride.driver.totalRides}
                  </span>
                  courses
                </span>
              </div>
            }
          />
        ) : (
          <Card className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground)]">Aucun driver assigné</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">Vérifiez le matching avant d&apos;intervenir.</p>
            </div>
          </Card>
        )}
      </div>

      {/* ── Vehicle banner ───────────────────────────────────────────────── */}
      {ride.vehicle ? (
        <Card className="overflow-hidden">
          <div className="flex items-stretch">
            <div className="flex w-12 shrink-0 items-center justify-center bg-[color:var(--primary-soft)]">
              <Car className="size-5 text-[color:var(--primary)]" />
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2 p-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">Véhicule</p>
                <p className="font-semibold text-[color:var(--foreground)]">
                  {ride.vehicle.make} {ride.vehicle.model}
                </p>
              </div>
              <VehicleChip label="Couleur"         value={ride.vehicle.color} />
              <VehicleChip label="Plaque"          value={ride.vehicle.licensePlate} mono />
              <VehicleChip label="Type"            value={ride.vehicle.type} />
              <VehicleChip label="Catégorie"       value={ride.vehicle.category ?? "—"} />
              <div className="ml-auto">
                <CopyableId id={ride.vehicle.vehicleId} prefix="Véhicule" />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* ── Commande details ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Détails de la commande</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailChip label="Type de course"    value={ride.rideType} />
            <DetailChip label="Catégorie véhicule" value={ride.vehicleType} />
            <DetailChip label="Mode de paiement"  value={ride.paymentMethod} />
            <DetailChip label="Statut"            value={<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>} />
          </div>
        </CardContent>
      </Card>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Chronologie</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineTrack
            steps={[
              { label: "Créée",          at: ride.createdAt,    done: true },
              { label: "Planifiée",      at: ride.scheduledAt,  done: !!ride.scheduledAt },
              { label: "Driver arrivé",  at: ride.arrivedAt,    done: !!ride.arrivedAt },
              { label: "En cours",       at: ride.startedAt,    done: !!ride.startedAt },
              { label: "Terminée",       at: ride.completedAt,  done: !!ride.completedAt || !!ride.cancelledAt },
            ]}
            cancelled={isCancelled}
            cancelledAt={ride.cancelledAt}
          />
        </CardContent>
      </Card>
    </div>
  );

  /* ── Tab: Financier ───────────────────────────────────────────────────── */
  const walletPaid = ride.walletAmountPaid  ?? 0;
  const cashPaid   = ride.cashAmountPaid    ?? 0;
  const totalPaid  = walletPaid + cashPaid || billed;

  const tabFinancier = (
    <div className="flex flex-col gap-6">
      {/* ── Receipt card ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Récapitulatif financier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-[color:var(--border)]">
            <ReceiptRow label="Prix estimé"         value={formatXof(estimated)}        muted />
            {ride.surgeMultiplier > 1 && (
              <ReceiptRow label={`Surge ×${ride.surgeMultiplier}`} value="appliqué" accent="warning" />
            )}
            {ride.waitingFeeFcfa > 0 && (
              <ReceiptRow label="Frais d'attente"   value={`+ ${formatXof(ride.waitingFeeFcfa)}`} accent="warning" />
            )}
            {ride.pauseFeeFcfa > 0 && (
              <ReceiptRow label="Frais de pause"    value={`+ ${formatXof(ride.pauseFeeFcfa)}`}    accent="warning" />
            )}
            {ride.approachFeeFcfa > 0 && (
              <ReceiptRow
                label={`Frais d'approche${ride.approachDistanceMeters != null ? ` (${fmtMeter(ride.approachDistanceMeters)})` : ""}`}
                value={`+ ${formatXof(ride.approachFeeFcfa)}`}
                accent="warning"
              />
            )}
            {ride.discountAmount != null && ride.discountAmount > 0 && (
              <ReceiptRow label="Remise promo"      value={`− ${formatXof(ride.discountAmount)}`}  accent="success" />
            )}
            {ride.cancellationFeeAmount > 0 && (
              <ReceiptRow label="Frais d'annulation" value={`+ ${formatXof(ride.cancellationFeeAmount)}`} accent="danger" />
            )}
            <ReceiptRow label={finalPrice > 0 ? "Prix final" : "Prix facturé (estimation)"} value={formatXof(billed)} bold />
          </div>
        </CardContent>
      </Card>

      {/* ── Payment split ────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-[color:var(--primary)]" />
              <CardTitle className="text-sm">Mode de règlement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SplitBar
              labelA="Wallet"   amountA={walletPaid}
              labelB="Cash"     amountB={cashPaid}
              total={totalPaid}
            />
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[color:var(--primary)]" />
                Wallet — <span className="font-mono font-semibold">{formatXof(walletPaid)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-400" />
                Cash — <span className="font-mono font-semibold">{formatXof(cashPaid)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-[color:var(--primary)]" />
              <CardTitle className="text-sm">Ventilation des gains</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SplitBar
              labelA="Driver"    amountA={earnings ?? 0}
              labelB="Plateforme" amountB={commission ?? 0}
              total={billed}
              colorB="bg-violet-500"
            />
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[color:var(--primary)]" />
                Driver — <span className="font-mono font-semibold">
                  {earnings != null ? formatXof(earnings) : "—"}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-violet-500" />
                Plateforme — <span className="font-mono font-semibold">
                  {commission != null ? formatXof(commission) : "—"}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Promo ────────────────────────────────────────────────────────── */}
      {ride.promoCodeId ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-[color:var(--primary)] bg-[color:var(--primary-soft)]/40 px-4 py-3 text-sm">
          <Badge tone="primary">Promo</Badge>
          <span className="font-mono text-xs text-[color:var(--primary)]">{ride.promoCodeId}</span>
        </div>
      ) : null}
    </div>
  );

  /* ── Tab: Trajet ──────────────────────────────────────────────────────── */
  const tabTrajet = (
    <div className="flex flex-col gap-6">
      {/* ── Route card ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Route className="size-4 text-[color:var(--primary)]" />
            <CardTitle className="text-sm">Itinéraire</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <LocationRow
              dot="bg-emerald-500"
              label="Pickup demandé"
              value={ride.pickup?.address ?? (ride.pickup ? `${ride.pickup.latitude.toFixed(5)}, ${ride.pickup.longitude.toFixed(5)}` : "—")}
            />
            <div className="ml-[9px] h-6 w-px border-l-2 border-dashed border-[color:var(--border)]" />
            <LocationRow
              dot="bg-red-500"
              label="Dropoff demandé"
              value={ride.dropoff?.address ?? (ride.dropoff ? `${ride.dropoff.latitude.toFixed(5)}, ${ride.dropoff.longitude.toFixed(5)}` : "—")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── GPS réels ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <GpsCard
          label="Pickup réel"
          icon={<Navigation className="size-4 text-emerald-600" />}
          lat={ride.actualPickup?.latitude}
          lng={ride.actualPickup?.longitude}
        />
        <GpsCard
          label="Dropoff réel"
          icon={<MapPin className="size-4 text-red-500" />}
          lat={ride.actualDropoff?.latitude}
          lng={ride.actualDropoff?.longitude}
        />
        <GpsCard
          label="Driver en route (au moment d'accepter)"
          icon={<Car className="size-4 text-[color:var(--primary)]" />}
          lat={ride.driverLocationEnRoute?.lat}
          lng={ride.driverLocationEnRoute?.lng}
        />
      </div>

      {/* ── Métriques distance / durée ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Distance"
          estimated={`${ride.estimatedDistanceKm} km`}
          actual={fmtMeter(ride.actualDistanceMeters)}
          icon={<Route className="size-4" />}
        />
        <MetricCard
          label="Durée"
          estimated={`${ride.estimatedDurationMin} min`}
          actual={fmtSec(ride.actualDurationSeconds)}
          icon={<Clock className="size-4" />}
        />
      </div>

      {/* ── Approche chauffeur → passager ────────────────────────────────── */}
      {ride.approachDistanceMeters != null && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={<Navigation className="size-5" />}
            label="Distance d'approche facturable"
            value={fmtMeter(ride.approachDistanceMeters)}
            tone="neutral"
          />
          <StatCard
            icon={<CreditCard className="size-5" />}
            label="Frais d'approche"
            value={formatXof(ride.approachFeeFcfa)}
            tone={ride.approachFeeFcfa > 0 ? "warning" : "neutral"}
          />
        </div>
      )}
    </div>
  );

  /* ── Tab: Pauses & Attente ────────────────────────────────────────────── */
  const tabPauses = (
    <div className="flex flex-col gap-6">
      {/* ── Waiting summary ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Timer className="size-5" />}         label="Temps d'attente"      value={fmtSec(ride.waitingDurationSeconds)} tone="primary" />
        <StatCard icon={<Clock className="size-5" />}         label="Franchise gratuite"    value={`${ride.freeWaitingMinutes} min`}    tone="neutral" />
        <StatCard icon={<CreditCard className="size-5" />}    label="Frais d'attente"       value={formatXof(ride.waitingFeeFcfa)}      tone={ride.waitingFeeFcfa > 0 ? "warning" : "neutral"} />
      </div>

      {ride.noShowMinutes != null && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Seuil no-show : {ride.noShowMinutes} min
            </p>
            {ride.noShowFee != null && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Frais applicables : <span className="font-mono font-semibold">{formatXof(ride.noShowFee)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Pause summary ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<PauseCircle className="size-5" />}   label="Nombre de pauses"      value={`${ride.pausesCount}`}               tone="primary" />
        <StatCard icon={<Timer className="size-5" />}         label="Durée totale pausée"    value={fmtSec(ride.totalPausedSeconds)}     tone="neutral" />
        <StatCard icon={<CreditCard className="size-5" />}    label="Frais de pause"         value={formatXof(ride.pauseFeeFcfa)}        tone={ride.pauseFeeFcfa > 0 ? "warning" : "neutral"} />
      </div>

      {/* ── Pause history ───────────────────────────────────────────────── */}
      {ride.pauseHistory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historique des pauses</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {ride.pauseHistory.map((p, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-3 rounded-lg bg-[color:var(--muted)]/50 px-4 py-3 text-xs"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[10px] font-bold text-[color:var(--primary)]">
                    {i + 1}
                  </span>
                  <span className="text-[color:var(--muted-foreground)]">
                    {formatDateTime(p.startedAt)}
                  </span>
                  <ArrowRight className="size-3 text-[color:var(--muted-foreground)]" />
                  <span className="text-[color:var(--muted-foreground)]">
                    {p.endedAt ? formatDateTime(p.endedAt) : <em>en cours</em>}
                  </span>
                  {p.durationSeconds != null ? (
                    <Badge tone="neutral" className="ml-auto">
                      {fmtSec(p.durationSeconds)}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-dashed border-[color:var(--border)] py-10 text-center text-sm text-[color:var(--muted-foreground)]">
          Aucune pause enregistrée pour cette course.
        </div>
      )}
    </div>
  );

  /* ── Tab: Évaluations ────────────────────────────────────────────────── */
  const hasRatings = ride.passengerRating != null || ride.driverRating != null;
  const tabEvals = hasRatings ? (
    <div className="grid gap-6 lg:grid-cols-2">
      <RatingCard
        who="Passager"
        icon={<User className="size-4" />}
        rating={ride.passengerRating}
        comment={ride.passengerComment}
      />
      <RatingCard
        who="Driver"
        icon={<Car className="size-4" />}
        rating={ride.driverRating}
        comment={ride.driverComment}
      />
    </div>
  ) : (
    <div className="rounded-lg border border-dashed border-[color:var(--border)] py-14 text-center text-sm text-[color:var(--muted-foreground)]">
      Aucune évaluation pour cette course.
    </div>
  );

  /* ── Cancellation banner ─────────────────────────────────────────────── */
  const cancelBanner = isCancelled ? (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
      <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
          Course annulée
          {ride.cancelledBy ? ` par ${ride.cancelledBy}` : ""}
          {ride.cancelledAt ? ` — ${formatDateTime(ride.cancelledAt)}` : ""}
        </p>
        {ride.cancelReason ? (
          <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
            Motif : <em>{ride.cancelReason}</em>
          </p>
        ) : null}
        {ride.cancellationFeeAmount > 0 ? (
          <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
            Frais d&apos;annulation : <span className="font-mono font-semibold">{formatXof(ride.cancellationFeeAmount)}</span>
          </p>
        ) : null}
      </div>
    </div>
  ) : null;

  /* ── Terminal banner ─────────────────────────────────────────────────── */
  const terminalBanner = isTerminal && !isCancelled ? (
    <div className="flex items-start gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
      <Flag className="mt-0.5 size-4 shrink-0" />
      <p>
        Cette course est dans un état terminal (<strong>{statusMeta.label}</strong>) — aucune transition n&apos;est plus autorisée.
      </p>
    </div>
  ) : null;

  /* ── Tabs config ─────────────────────────────────────────────────────── */
  const tabs = [
    { value: "general",   label: "Général",          content: tabGeneral },
    { value: "finance",   label: "Financier",         content: tabFinancier },
    { value: "trajet",    label: "Trajet",            content: tabTrajet },
    { value: "pauses",    label: "Pauses & Attente",
      badge: ride.pausesCount > 0 ? { count: ride.pausesCount, tone: "warning" as const } : undefined,
      content: tabPauses },
    { value: "evals",     label: "Évaluations",
      badge: hasRatings ? { count: [ride.passengerRating, ride.driverRating].filter(Boolean).length, tone: "success" as const } : undefined,
      content: tabEvals },
    // Réservation programmée uniquement (la route rend `guarantee: null` sinon).
    ...(ride.scheduledAt && can("ride.scheduled.settlement.view")
      ? [{ value: "guarantee", label: "Garantie", content: <GuaranteeSettlementTab rideId={ride.rideId} /> }]
      : []),
    ...(canAny(["ride.telemetry.view", "ride.telemetry.track.view"])
      ? [{ value: "telemetry", label: "Télémétrie & GPS", content: <RideTelemetryTab rideId={ride.rideId} /> }]
      : []),
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <DetailHeader
        backHref="/vtc/rides"
        backLabel="Retour aux courses"
        eyebrow={`${ride.rideType} · ${ride.vehicleType} · ${ride.paymentMethod}`}
        title={ride.rideNumber}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <CopyableId id={ride.rideId} prefix="Ride" />
            <Sep />
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatDateTime(ride.createdAt)}
            </span>
            <Sep />
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[color:var(--foreground)]">
              <CreditCard className="size-3" />
              {formatXof(billed)}
            </span>
          </div>
        }
        avatar={
          <div className="relative flex size-14 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
            <Car className="size-7" />
            {isRated && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400">
                <Star className="size-2.5 fill-white text-white" />
              </span>
            )}
          </div>
        }
        status={<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>}
        actions={
          <>
            <Button variant="outline" size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            {!isTerminal && (
              <Button variant="primary" size="sm" onClick={() => setInterventionOpen(true)}>
                <Wrench className="size-4" />
                Modifier le statut
              </Button>
            )}
          </>
        }
      />

      {cancelBanner}
      {terminalBanner}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Prix facturé"
          value={formatXof(billed)}
          sub={finalPrice > 0 ? "prix final" : "estimation"}
          color="bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
          icon={<Banknote className="size-4" />}
        />
        <KpiCard
          label="Gains driver"
          value={earnings != null ? formatXof(earnings) : "—"}
          sub="net après commission"
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          icon={<Wallet className="size-4" />}
        />
        <KpiCard
          label="Commission"
          value={commission != null ? formatXof(commission) : "—"}
          sub="plateforme"
          color="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
          icon={<TrendingUp className="size-4" />}
        />
        <KpiCard
          label="Distance"
          value={fmtMeter(ride.actualDistanceMeters) !== "—" ? fmtMeter(ride.actualDistanceMeters) : `${ride.estimatedDistanceKm} km`}
          sub={ride.actualDistanceMeters != null ? "réelle" : "estimée"}
          color="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
          icon={<Route className="size-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" tabs={tabs} />

      <InterventionDesignModal
        open={interventionOpen}
        onClose={() => setInterventionOpen(false)}
        defaultRideId={ride.rideId}
        defaultRideNumber={ride.rideNumber}
        currentStatus={ride.status}
      />
    </div>
  );
}

/* ─────────────────────────── sub-components ───────────────────────────── */

function Sep() {
  return <span className="text-[color:var(--muted-foreground)]/50">·</span>;
}

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string;
  color: string; icon: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className={`flex size-8 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="font-mono text-xl font-bold text-[color:var(--foreground)]">{value}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">{label}</p>
        <p className="text-[10px] text-[color:var(--muted-foreground)]">{sub}</p>
      </div>
    </Card>
  );
}

function PartyCard({ icon, title, name, phone, id, idPrefix, href, extra }: {
  icon: React.ReactNode; title: string; name: string;
  phone?: string; id?: string; idPrefix: string;
  href?: string; extra?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
        {icon}
        {title}
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={name} className="size-11 text-sm" />
        <div className="flex flex-col gap-1">
          {href ? (
            <a href={href} className="text-sm font-semibold text-[color:var(--foreground)] hover:underline">
              {name}
            </a>
          ) : (
            <span className="text-sm font-semibold text-[color:var(--foreground)]">{name}</span>
          )}
          {phone ? (
            <a href={`tel:${phone}`} className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--primary)] hover:underline">
              <Phone className="size-3" />
              {phone}
            </a>
          ) : null}
          {id ? <CopyableId id={id} prefix={idPrefix} /> : null}
        </div>
      </div>
      {extra ? <div>{extra}</div> : null}
    </Card>
  );
}

function VehicleChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wide text-[color:var(--muted-foreground)]">{label}</span>
      <span className={`text-sm font-medium text-[color:var(--foreground)] ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-[color:var(--muted)]/50 px-3 py-2.5">
      <span className="text-[9px] uppercase tracking-wide text-[color:var(--muted-foreground)]">{label}</span>
      <span className="text-sm font-medium text-[color:var(--foreground)]">{value}</span>
    </div>
  );
}

function TimelineTrack({ steps, cancelled, cancelledAt }: {
  steps: { label: string; at?: string | null; done: boolean }[];
  cancelled?: boolean;
  cancelledAt?: string | null;
}) {
  return (
    <ol className="relative flex flex-col gap-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.label} className="relative flex items-start gap-4 pb-5 last:pb-0">
            {!isLast && (
              <span className="absolute left-[9px] top-5 h-full w-px bg-[color:var(--border)]" />
            )}
            <span className="relative z-10 mt-0.5 shrink-0">
              {step.done ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : (
                <Circle className="size-5 text-[color:var(--muted-foreground)]/40" />
              )}
            </span>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-1 pt-0.5">
              <span className={`text-sm font-medium ${step.done ? "text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]"}`}>
                {step.label}
              </span>
              {step.at ? (
                <span className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(step.at)}</span>
              ) : (
                <span className="text-xs italic text-[color:var(--muted-foreground)]/60">—</span>
              )}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative flex items-start gap-4">
          <span className="relative z-10 mt-0.5 shrink-0">
            <XCircle className="size-5 text-red-500" />
          </span>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-1 pt-0.5">
            <span className="text-sm font-medium text-red-600">Annulée</span>
            {cancelledAt ? (
              <span className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(cancelledAt)}</span>
            ) : null}
          </div>
        </li>
      )}
    </ol>
  );
}

function ReceiptRow({ label, value, muted, bold, accent }: {
  label: string; value: string;
  muted?: boolean; bold?: boolean;
  accent?: "warning" | "success" | "danger";
}) {
  const accentColor = accent === "warning" ? "text-amber-600"
    : accent === "success" ? "text-emerald-600"
    : accent === "danger"  ? "text-red-600"
    : "";
  return (
    <div className={`flex items-center justify-between py-2.5 ${bold ? "mt-1 border-t-2 border-[color:var(--border)]" : ""}`}>
      <span className={`text-sm ${muted ? "text-[color:var(--muted-foreground)]" : "text-[color:var(--foreground)]"}`}>
        {label}
      </span>
      <span className={`font-mono text-sm ${bold ? "text-base font-bold text-[color:var(--foreground)]" : ""} ${accentColor}`}>
        {value}
      </span>
    </div>
  );
}

function SplitBar({ labelA, amountA, labelB, amountB, total, colorB = "bg-amber-400" }: {
  labelA: string; amountA: number;
  labelB: string; amountB: number;
  total: number; colorB?: string;
}) {
  const pctA = pct(amountA, total);
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
      <div
        className="flex h-full"
        title={`${labelA}: ${pctA}% — ${labelB}: ${100 - pctA}%`}
      >
        <div
          className="h-full bg-[color:var(--primary)] transition-all duration-500"
          style={{ width: `${pctA}%` }}
        />
        <div className={`h-full flex-1 ${colorB}`} />
      </div>
    </div>
  );
}

function LocationRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1 size-2.5 shrink-0 rounded-full ${dot}`} />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">{label}</p>
        <p className="text-sm font-medium text-[color:var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}

function GpsCard({ label, icon, lat, lng }: { label: string; icon: React.ReactNode; lat?: number; lng?: number }) {
  const hasCoords = lat != null && lng != null;
  const { address, loading } = useReverseGeocode(lat, lng);

  return (
    <Card className="flex items-start gap-3 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--muted)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">{label}</p>
        {hasCoords ? (
          <>
            <p className="font-mono text-xs text-[color:var(--muted-foreground)]">
              {lat!.toFixed(5)}, {lng!.toFixed(5)}
            </p>
            {loading ? (
              <p className="mt-0.5 text-xs italic text-[color:var(--muted-foreground)]/60">
                Résolution en cours…
              </p>
            ) : address ? (
              <p className="mt-0.5 line-clamp-2 text-xs font-medium text-[color:var(--foreground)]">
                {address}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs italic text-[color:var(--muted-foreground)]">Non disponible</p>
        )}
      </div>
    </Card>
  );
}

function MetricCard({ label, estimated, actual, icon }: {
  label: string; estimated: string; actual: string; icon: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
        {icon}
        {label}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[color:var(--muted-foreground)]">Estimée</p>
          <p className="font-mono text-lg font-bold text-[color:var(--foreground)]">{estimated}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[color:var(--muted-foreground)]">Réelle</p>
          <p className={`font-mono text-lg font-bold ${actual !== "—" ? "text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]"}`}>
            {actual}
          </p>
        </div>
      </div>
    </Card>
  );
}

function StatCard({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: string;
  tone: "primary" | "warning" | "neutral";
}) {
  const bg = tone === "primary" ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
    : tone === "warning" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
    : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]";

  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="font-mono text-base font-bold text-[color:var(--foreground)]">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">{label}</p>
      </div>
    </Card>
  );
}

function RatingCard({ who, icon, rating, comment }: {
  who: string; icon: React.ReactNode; rating: number | null; comment: string | null;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
        {icon}
        {who}
      </div>
      {rating != null ? (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`size-5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-[color:var(--muted-foreground)]/30"}`}
              />
            ))}
          </div>
          <span className="font-mono font-semibold text-[color:var(--foreground)]">{rating.toFixed(1)}</span>
        </div>
      ) : (
        <p className="text-sm italic text-[color:var(--muted-foreground)]">Pas de note</p>
      )}
      {comment ? (
        <blockquote className="rounded-lg border-l-4 border-[color:var(--primary)] bg-[color:var(--muted)]/50 px-4 py-2 text-sm italic text-[color:var(--foreground)]">
          &laquo;{comment}&raquo;
        </blockquote>
      ) : null}
    </Card>
  );
}
