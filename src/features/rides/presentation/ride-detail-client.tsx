"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Car,
  Clock3,
  CreditCard,
  Flag,
  Hash,
  Phone,
  RefreshCw,
  User,
  Wrench,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  DetailHeader,
  InfoGrid,
  type InfoRow,
} from "@/shared/ui/detail-header";
import { CopyableId } from "@/shared/ui/copy-button";
import { Spinner } from "@/shared/ui/spinner";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import {
  fullParty,
  rideStatusMeta,
  type AdminRide,
  type RideStatus,
} from "../domain/admin-ride";
import { InterventionDesignModal } from "./intervention-design-modal";

const TERMINAL_STATUSES: ReadonlySet<RideStatus | string> = new Set([
  "COMPLETED",
  "RATED",
  "CANCELLED_PASSENGER",
  "CANCELLED_DRIVER",
  "CANCELLED_SYSTEM",
]);

export interface RideDetailClientProps {
  ride: AdminRide;
}

export function RideDetailClient({ ride }: RideDetailClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [interventionOpen, setInterventionOpen] = useState(false);
  const statusMeta = rideStatusMeta(ride.status);
  const finalPrice = ride.finalPrice || 0;
  const estimated = ride.estimatedPrice || 0;
  const billed = finalPrice || estimated;
  // Same 82 / 18 split surfaced as a hint, not a contractual number — when
  // the backend exposes the real breakdown we'll switch.
  const driverEarnings = Math.round(billed * 0.82);
  const platformFee = billed - driverEarnings;
  const isTerminal = TERMINAL_STATUSES.has(ride.status);

  const orderRows: InfoRow[] = [
    {
      label: "Numéro",
      value: <span className="font-mono">{ride.rideNumber}</span>,
    },
    { label: "Type de course", value: ride.rideType },
    { label: "Catégorie véhicule", value: ride.vehicleType },
    { label: "Mode de paiement", value: ride.paymentMethod },
    { label: "Statut", value: statusMeta.label },
    {
      label: "Planifiée le",
      value: formatDateTime(ride.scheduledAt),
    },
    {
      label: "Démarrée le",
      value: formatDateTime(ride.startedAt),
    },
    {
      label: "Terminée le",
      value: formatDateTime(ride.completedAt),
    },
  ];

  const passengerName = fullParty(ride.passenger);
  const driverName = fullParty(ride.driver);

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/vtc/rides"
        backLabel="Retour aux courses"
        eyebrow={`Course · ${ride.vehicleType} · ${ride.paymentMethod}`}
        title={ride.rideNumber}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CopyableId id={ride.rideId} prefix="Ride" />
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" />
              {formatDateTime(ride.createdAt)}
            </span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span className="inline-flex items-center gap-1">
              <CreditCard className="size-3" />
              {formatXof(billed)}
            </span>
          </div>
        }
        avatar={
          <div className="flex size-14 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
            <Car className="size-7" />
          </div>
        }
        status={<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Rafraîchir
            </Button>
            {isTerminal ? null : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setInterventionOpen(true)}
              >
                <Wrench className="size-4" />
                Modifier le statut
              </Button>
            )}
          </>
        }
      />

      {isTerminal ? (
        <div className="flex items-start gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-3 text-xs text-[color:var(--muted-foreground)]">
          <Flag className="mt-0.5 size-4 shrink-0 text-[color:var(--muted-foreground)]" />
          <p>
            Cette course est dans un état terminal (
            <strong>{statusMeta.label}</strong>) — aucune transition n&apos;est
            plus autorisée. Toute action passera par le journal d&apos;audit.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Prix facturé
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(billed)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {finalPrice > 0 ? "final" : "estimation"}
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Prix estimé
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(estimated)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            tarif au lancement
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Driver gagne
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(driverEarnings)}
          </p>
          <p className="text-xs italic text-[color:var(--muted-foreground)]">
            estimation 82 % du facturé
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Commission plateforme
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(platformFee)}
          </p>
          <p className="text-xs italic text-[color:var(--muted-foreground)]">
            estimation 18 %
          </p>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Hash className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Commande</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={orderRows} columns={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Banknote className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Lifecycle</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3 text-sm">
              <LifecycleStep
                label="Créée"
                at={ride.createdAt}
                done
              />
              <LifecycleStep
                label="Planifiée"
                at={ride.scheduledAt}
                done={!!ride.scheduledAt}
              />
              <LifecycleStep
                label="Démarrée"
                at={ride.startedAt}
                done={!!ride.startedAt}
              />
              <LifecycleStep
                label="Terminée"
                at={ride.completedAt}
                done={!!ride.completedAt}
              />
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Passenger */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Passager</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {ride.passenger ? (
              <div className="flex items-center gap-3">
                <Avatar name={passengerName} className="size-12 text-base" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-[color:var(--foreground)]">
                    {passengerName}
                  </span>
                  <a
                    href={`tel:${ride.passenger.phoneNumber}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--primary)] hover:underline"
                  >
                    <Phone className="size-3" />
                    {ride.passenger.phoneNumber}
                  </a>
                  {ride.passenger.passengerId ? (
                    <CopyableId
                      id={ride.passenger.passengerId}
                      prefix="Passager"
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-[color:var(--muted-foreground)]">
                Non renseigné
              </p>
            )}
          </CardContent>
        </Card>

        {/* Driver */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Car className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Driver</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {ride.driver ? (
              <div className="flex items-center gap-3">
                <Avatar name={driverName} className="size-12 text-base" />
                <div className="flex flex-col leading-tight">
                  <a
                    href={
                      ride.driver.driverId
                        ? `/vtc/drivers/${ride.driver.driverId}`
                        : undefined
                    }
                    className="text-sm font-semibold text-[color:var(--foreground)] hover:underline"
                  >
                    {driverName}
                  </a>
                  <a
                    href={`tel:${ride.driver.phoneNumber}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--primary)] hover:underline"
                  >
                    <Phone className="size-3" />
                    {ride.driver.phoneNumber}
                  </a>
                  {ride.driver.driverId ? (
                    <CopyableId
                      id={ride.driver.driverId}
                      prefix="Driver"
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-dashed border-[color:var(--border)] p-3 text-xs text-[color:var(--muted-foreground)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--warning)]" />
                <p>
                  Aucun driver assigné pour cette course — vérifie le match
                  avant d&apos;intervenir.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

/** Compact lifecycle row with a dot + label + timestamp (or "—"). */
function LifecycleStep({
  label,
  at,
  done,
}: {
  label: string;
  at?: string | null;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={
          "size-2.5 shrink-0 rounded-full " +
          (done
            ? "bg-[color:var(--success)]"
            : "bg-[color:var(--muted-foreground)]/30")
        }
      />
      <span className="flex-1 text-[color:var(--foreground)]">{label}</span>
      <span className="text-xs text-[color:var(--muted-foreground)]">
        {at ? (
          formatDateTime(at)
        ) : (
          <span className="italic">—</span>
        )}
      </span>
    </li>
  );
}
