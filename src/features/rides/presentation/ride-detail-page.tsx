"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Clock,
  CreditCard,
  Gauge,
  MapPin,
  Phone,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  DetailHeader,
  DetailNotFound,
  InfoGrid,
} from "@/shared/ui/detail-header";
import { formatXof } from "@/shared/lib/format";
import { mockRides } from "./../domain/mock";
import {
  PAYMENT_METHOD_LABELS,
  RIDE_STATUS_META,
  VEHICLE_TYPE_LABELS,
} from "../domain/ride";
import { useDriversStore } from "@/features/drivers/store";
import { usePassengersStore } from "@/features/passengers/store";

export function RideDetailPage({ rideId }: { rideId: string }) {
  const router = useRouter();
  const drivers = useDriversStore((s) => s.drivers);
  const passengers = usePassengersStore((s) => s.passengers);
  const ride = useMemo(() => mockRides.find((r) => r.rideId === rideId), [rideId]);

  const driver = useMemo(
    () => drivers.find((d) => ride && d.fullName === ride.driverName),
    [drivers, ride],
  );
  const passenger = useMemo(
    () => passengers.find((p) => ride && p.fullName === ride.passengerName),
    [passengers, ride],
  );

  if (!ride) {
    return (
      <DetailNotFound
        backHref="/vtc/rides"
        backLabel="Retour aux courses"
        message="Course introuvable."
      />
    );
  }

  const meta = RIDE_STATUS_META[ride.status];
  const finalPrice = ride.finalPrice ?? ride.estimatedPrice;
  const driverEarnings = Math.round(finalPrice * 0.82);
  const platformFee = finalPrice - driverEarnings;

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/vtc/rides"
        backLabel="Retour aux courses"
        eyebrow={`Course · ${VEHICLE_TYPE_LABELS[ride.vehicleType]} · ${PAYMENT_METHOD_LABELS[ride.paymentMethod]}`}
        title={ride.rideNumber}
        subtitle={
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>Créée {ride.ago}</span>
            <span>· Distance estimée {ride.distanceKm.toFixed(1)} km</span>
            <span>· Durée estimée {ride.durationMin} min</span>
          </div>
        }
        avatar={
          <span className="flex size-16 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] font-mono text-xs font-bold text-[color:var(--primary)]">
            FY-RD
          </span>
        }
        status={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {ride.surgeMultiplier > 1 ? (
              <Badge tone="warning">Surge ×{ride.surgeMultiplier}</Badge>
            ) : null}
          </div>
        }
        actions={
          <>
            <Button variant="outline" size="sm">
              Annuler la course
            </Button>
            <Button variant="outline" size="sm">
              Forcer remboursement
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Prix final
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(finalPrice)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {ride.finalPrice ? "facturé" : "estimation initiale"}
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Driver gagne
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(driverEarnings)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">82 % du final</p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Commission plateforme
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(platformFee)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">18 %</p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Méthode de paiement
          </p>
          <p className="text-base font-medium text-[color:var(--foreground)]">
            {PAYMENT_METHOD_LABELS[ride.paymentMethod]}
          </p>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[color:var(--foreground)]">
            <MapPin className="size-4 text-[color:var(--primary)]" />
            Trajet
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-3 rounded-full bg-emerald-500" />
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Pickup
                </p>
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {ride.pickupAddress}
                </p>
              </div>
            </div>
            <div className="ml-1 h-6 w-px bg-[color:var(--border)]" />
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-3 rounded-full bg-red-500" />
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Dropoff
                </p>
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {ride.dropoffAddress}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[color:var(--border)] pt-4">
            <div>
              <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                <Gauge className="size-3" />
                Distance
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium text-[color:var(--foreground)]">
                {ride.distanceKm.toFixed(1)} km
              </p>
            </div>
            <div>
              <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                <Clock className="size-3" />
                Durée
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium text-[color:var(--foreground)]">
                {ride.durationMin} min
              </p>
            </div>
            <div>
              <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                <CreditCard className="size-3" />
                Surge
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium text-[color:var(--foreground)]">
                ×{ride.surgeMultiplier}
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h3 className="text-base font-semibold text-[color:var(--foreground)]">
            Parties
          </h3>

          <button
            type="button"
            onClick={() =>
              passenger
                ? router.push(`/vtc/passengers/${passenger.passengerId}`)
                : null
            }
            className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3 text-left transition hover:border-[color:var(--primary)] disabled:cursor-not-allowed"
            disabled={!passenger}
          >
            <Avatar name={ride.passengerName} className="size-10 text-sm" />
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Passager
              </p>
              <p className="text-sm font-medium text-[color:var(--foreground)]">
                {ride.passengerName}
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                <Phone className="size-3" />
                {ride.passengerPhone}
              </p>
            </div>
          </button>

          {ride.driverName ? (
            <button
              type="button"
              onClick={() =>
                driver ? router.push(`/vtc/drivers/${driver.driverId}`) : null
              }
              className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3 text-left transition hover:border-[color:var(--primary)] disabled:cursor-not-allowed"
              disabled={!driver}
            >
              <Avatar name={ride.driverName} className="size-10 text-sm" />
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Driver
                </p>
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {ride.driverName}
                </p>
                <p className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                  <Phone className="size-3" />
                  {ride.driverPhone}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted-foreground)]">
              <p>Aucun driver assigné</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[color:var(--foreground)]">
          <Banknote className="size-4 text-[color:var(--primary)]" />
          Détails de facturation
        </h3>
        <InfoGrid
          rows={[
            { label: "Ride ID", value: <span className="font-mono text-xs">{ride.rideId}</span> },
            { label: "Numéro humain", value: <span className="font-mono">{ride.rideNumber}</span> },
            { label: "Catégorie", value: VEHICLE_TYPE_LABELS[ride.vehicleType] },
            { label: "Statut", value: meta.label },
            { label: "Prix estimé", value: <span className="font-mono">{formatXof(ride.estimatedPrice)}</span> },
            {
              label: "Prix final",
              value: ride.finalPrice ? (
                <span className="font-mono">{formatXof(ride.finalPrice)}</span>
              ) : (
                <span className="italic text-[color:var(--muted-foreground)]">en attente</span>
              ),
            },
            { label: "Surge multiplier", value: `×${ride.surgeMultiplier}` },
            { label: "Méthode de paiement", value: PAYMENT_METHOD_LABELS[ride.paymentMethod] },
          ]}
          columns={2}
        />
      </Card>
    </div>
  );
}
