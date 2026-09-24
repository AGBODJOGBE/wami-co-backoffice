"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Info,
  MapPin,
  Phone,
  RefreshCw,
  UserCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { CanView } from "@/shared/ui/can-view";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import { assignScheduledDriverAction } from "../application/actions";
import type {
  ManualAssignmentQueue,
  ScheduledRideCandidate,
  ScheduledRideToAssign,
} from "../domain/scheduled-rides";

function urgency(minutes: number): { label: string; tone: "danger" | "warning" | "info" } {
  if (minutes < 0) return { label: `Départ dépassé de ${Math.abs(minutes)} min`, tone: "danger" };
  if (minutes <= 15) return { label: `Départ dans ${minutes} min`, tone: "danger" };
  return { label: `Départ dans ${minutes} min`, tone: "warning" };
}

export function ScheduledManualAssignmentPage({ queue }: { queue: ManualAssignmentQueue }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [target, setTarget] = useState<{
    ride: ScheduledRideToAssign;
    candidate: ScheduledRideCandidate;
  } | null>(null);
  const [assigning, startAssign] = useTransition();

  function confirmAssign() {
    if (!target) return;
    const { ride, candidate } = target;
    startAssign(async () => {
      const r = await assignScheduledDriverAction(ride.rideId, candidate.driverId);
      if (r.ok) {
        toast({ kind: "success", title: "Pilote affecté", description: r.message });
        setTarget(null);
        router.refresh();
      } else {
        // Message français littéral du backend (13 refus possibles) — affichable tel quel.
        toast({ kind: "error", title: "Affectation refusée", description: r.message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations · VTC"
        title="Réservations à affecter"
        description={`Réservations encore sans pilote dans la fenêtre de ±${queue.thresholdMinutes} min autour du départ. ${queue.total} à traiter.`}
        dataSource="live"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Actualiser
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Le pilote affecté <strong>ne peut pas refuser</strong> et <strong>n&apos;est pas notifié</strong> :
          appelle-le. Pour un pilote hors ligne, la donnée utile est son numéro de téléphone — aucune
          position n&apos;est conservée pour un pilote hors ligne.
        </p>
      </div>

      {queue.rides.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CalendarClock className="size-10 opacity-30" />
          <p className="text-sm font-medium">Aucune réservation à affecter</p>
          <p className="max-w-sm text-xs text-[color:var(--muted-foreground)]">
            Toutes les réservations proches de leur départ ont déjà un pilote.
          </p>
        </Card>
      ) : (
        queue.rides.map((ride) => (
          <RideBlock key={ride.rideId} ride={ride} onPick={(candidate) => setTarget({ ride, candidate })} />
        ))
      )}

      <Modal
        open={!!target}
        onClose={() => (assigning ? undefined : setTarget(null))}
        size="md"
        title="Imposer ce pilote ?"
        description="Action immédiate : la réservation passe directement en « confirmée »."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={assigning}>
              Annuler
            </Button>
            <Button onClick={confirmAssign} isLoading={assigning}>
              <UserCheck className="size-4" />
              Confirmer l&apos;affectation
            </Button>
          </>
        }
      >
        {target && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              <strong>
                {target.candidate.firstName} {target.candidate.lastName}
              </strong>{" "}
              ({target.candidate.phoneNumber}) sera affecté à la réservation{" "}
              <strong className="font-mono">{target.ride.rideNumber}</strong>, départ {formatDateTime(target.ride.scheduledAt)}.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-[color:var(--muted-foreground)]">
              <li>Il ne peut pas refuser et ne reçoit aucune notification : préviens-le par téléphone.</li>
              <li>Il sera verrouillé : aucune autre course ne lui sera proposée.</li>
              <li>Exempté de la libération automatique pour absence, même s&apos;il se déconnecte ensuite.</li>
              <li>Son véhicule est résolu par le serveur, qui revalide le type de la réservation.</li>
            </ul>
            {!target.candidate.isOnline && (
              <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Ce pilote est hors ligne : assure-toi de l&apos;avoir joint avant de confirmer.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function RideBlock({
  ride,
  onPick,
}: {
  ride: ScheduledRideToAssign;
  onPick: (c: ScheduledRideCandidate) => void;
}) {
  const u = urgency(ride.minutesUntilDeparture);
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/vtc/rides/${ride.rideId}`} className="font-mono text-sm font-semibold hover:underline">
              {ride.rideNumber}
            </Link>
            <Badge tone={u.tone}>{u.label}</Badge>
            <Badge tone="neutral">{ride.vehicleType}</Badge>
          </div>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            Départ prévu {formatDateTime(ride.scheduledAt)}
          </span>
          <span className="flex items-start gap-1.5 text-xs text-[color:var(--muted-foreground)]">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {ride.pickup.address ?? `${ride.pickup.latitude.toFixed(4)}, ${ride.pickup.longitude.toFixed(4)}`}
            {" → "}
            {ride.dropoff.address ?? `${ride.dropoff.latitude.toFixed(4)}, ${ride.dropoff.longitude.toFixed(4)}`}
          </span>
        </div>
        <div className="text-right text-xs text-[color:var(--muted-foreground)]">
          <p>
            Prix estimé <strong className="font-mono text-[color:var(--foreground)]">{formatXof(ride.estimatedPrice)}</strong>
          </p>
          <p>
            Garantie gelée{" "}
            <strong className="font-mono text-[color:var(--foreground)]">
              {ride.guaranteeAmount != null ? formatXof(ride.guaranteeAmount) : "—"}
            </strong>
          </p>
        </div>
      </div>

      {ride.candidates.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[color:var(--muted-foreground)]">
          Aucun pilote éligible pour ce type de véhicule.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <th className="px-5 py-2.5 font-medium">Pilote</th>
                <th className="px-5 py-2.5 font-medium">Contact</th>
                <th className="px-5 py-2.5 font-medium">Véhicule</th>
                <th className="px-5 py-2.5 font-medium">Note</th>
                <th className="px-5 py-2.5 font-medium">Présence</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {ride.candidates.map((c) => (
                <tr key={c.driverId} className="hover:bg-[color:var(--muted)]/30">
                  <td className="px-5 py-3 font-medium">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-5 py-3">
                    <a href={`tel:${c.phoneNumber}`} className="inline-flex items-center gap-1.5 font-mono text-xs hover:underline">
                      <Phone className="size-3.5" />
                      {c.phoneNumber}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <div className="flex flex-col leading-tight">
                      <span>
                        {c.vehicle.make} {c.vehicle.model} · {c.vehicle.color}
                      </span>
                      <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                        {c.vehicle.licensePlate} · {c.vehicle.vehicleType}
                        {c.vehicle.ownership === "PLATFORM" ? " · ForYou" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {c.rating.toFixed(1)} ★
                    <span className="ml-1 text-[color:var(--muted-foreground)]">({c.totalRides})</span>
                  </td>
                  <td className="px-5 py-3">
                    {c.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <Wifi className="size-3.5" />
                        En ligne
                        {c.distanceMeters != null ? ` · ${(c.distanceMeters / 1000).toFixed(1)} km` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
                        <WifiOff className="size-3.5" />
                        Hors ligne
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <CanView permission="ride.scheduled.assign">
                      <Button size="sm" variant="outline" onClick={() => onPick(c)}>
                        <UserCheck className="size-4" />
                        Affecter
                      </Button>
                    </CanView>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
