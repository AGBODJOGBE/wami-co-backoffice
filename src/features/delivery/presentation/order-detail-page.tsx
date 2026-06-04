"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Clock,
  KeyRound,
  MapPin,
  Package,
  Phone,
  User,
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
import { useDriversStore } from "@/features/drivers/store";
import { usePassengersStore } from "@/features/passengers/store";
import { mockDeliveryOrders } from "../domain/mock";
import { DELIVERY_STATUS_META, PARCEL_TYPE_META } from "../domain/delivery";

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const drivers = useDriversStore((s) => s.drivers);
  const passengers = usePassengersStore((s) => s.passengers);

  const order = useMemo(
    () => mockDeliveryOrders.find((o) => o.orderId === orderId),
    [orderId],
  );

  const driver = useMemo(
    () => drivers.find((d) => order && d.fullName === order.driverName),
    [drivers, order],
  );
  const passenger = useMemo(
    () => passengers.find((p) => order && p.fullName === order.passengerName),
    [passengers, order],
  );

  if (!order) {
    return (
      <DetailNotFound
        backHref="/delivery/orders"
        backLabel="Retour aux commandes"
        message="Commande introuvable."
      />
    );
  }

  const meta = DELIVERY_STATUS_META[order.status];
  const parcel = PARCEL_TYPE_META[order.parcelType];
  const finalPrice = order.finalPrice ?? order.estimatedPrice;

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/delivery/orders"
        backLabel="Retour aux commandes"
        eyebrow={`Livraison · ${parcel.label} · ${order.vehicleType}`}
        title={order.orderNumber}
        subtitle={
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>Créée {order.ago}</span>
            <span>· Destinataire : {order.recipientName}</span>
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {order.recipientPhone}
            </span>
          </div>
        }
        avatar={
          <span className="flex size-16 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-3xl">
            {parcel.emoji}
          </span>
        }
        status={<Badge tone={meta.tone}>{meta.label}</Badge>}
        actions={
          <>
            <Button variant="outline" size="sm">
              Annuler la commande
            </Button>
            <Button variant="outline" size="sm">
              Renvoyer l&apos;OTP
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Prix
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(finalPrice)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {order.finalPrice ? "facturé" : "estimation"}
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Catégorie
          </p>
          <p className="text-base font-medium text-[color:var(--foreground)]">
            {parcel.label}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            ≤ {parcel.maxKg} kg · véhicule par défaut {parcel.defaultVehicle}
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            OTP destinataire
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {order.isOtpValidated ? "Validé" : "En attente"}
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Photos preuve
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex size-7 items-center justify-center rounded-full ${
                order.hasPickupPhoto
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
              }`}
              title="Photo pickup"
            >
              <Camera className="size-3.5" />
            </span>
            <span
              className={`inline-flex size-7 items-center justify-center rounded-full ${
                order.hasDeliveryPhoto
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
              }`}
              title="Photo livraison"
            >
              <Camera className="size-3.5" />
            </span>
          </div>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            pickup / delivery
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
                  {order.pickupAddress}
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
                  {order.dropoffAddress}
                </p>
                <div className="mt-2 rounded-lg bg-[color:var(--muted)] p-2.5 text-xs">
                  <p className="font-medium text-[color:var(--foreground)]">
                    Destinataire : {order.recipientName}
                  </p>
                  <p className="inline-flex items-center gap-1 text-[color:var(--muted-foreground)]">
                    <Phone className="size-3" />
                    {order.recipientPhone}
                  </p>
                </div>
              </div>
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
            <Avatar name={order.passengerName} className="size-10 text-sm" />
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Expéditeur
              </p>
              <p className="text-sm font-medium text-[color:var(--foreground)]">
                {order.passengerName}
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
                <Phone className="size-3" />
                {order.passengerPhone}
              </p>
            </div>
          </button>

          {order.driverName ? (
            <button
              type="button"
              onClick={() =>
                driver ? router.push(`/vtc/drivers/${driver.driverId}`) : null
              }
              className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3 text-left transition hover:border-[color:var(--primary)] disabled:cursor-not-allowed"
              disabled={!driver}
            >
              <Avatar name={order.driverName} className="size-10 text-sm" />
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  Driver / Livreur
                </p>
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {order.driverName}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted-foreground)]">
              <p>Aucun driver assigné</p>
            </div>
          )}

          <div className="rounded-lg bg-[color:var(--muted)] p-3">
            <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
              <User className="size-3" />
              Destinataire
            </p>
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              {order.recipientName}
            </p>
            <p className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
              <Phone className="size-3" />
              {order.recipientPhone}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[color:var(--foreground)]">
          <Package className="size-4 text-[color:var(--primary)]" />
          Détails de la commande
        </h3>
        <InfoGrid
          rows={[
            {
              label: "Order ID",
              value: <span className="font-mono text-xs">{order.orderId}</span>,
            },
            { label: "Numéro humain", value: <span className="font-mono">{order.orderNumber}</span> },
            { label: "Catégorie de colis", value: `${parcel.emoji} ${parcel.label}` },
            { label: "Véhicule utilisé", value: order.vehicleType },
            {
              label: "Prix estimé",
              value: <span className="font-mono">{formatXof(order.estimatedPrice)}</span>,
            },
            {
              label: "Prix final",
              value: order.finalPrice ? (
                <span className="font-mono">{formatXof(order.finalPrice)}</span>
              ) : (
                <span className="italic text-[color:var(--muted-foreground)]">en attente</span>
              ),
            },
            {
              label: "OTP",
              value: (
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="size-3.5 text-[color:var(--muted-foreground)]" />
                  {order.isOtpValidated ? "validé" : "en attente"}
                </span>
              ),
            },
            {
              label: "Photo pickup",
              value: order.hasPickupPhoto ? "Reçue" : "Non reçue",
            },
            {
              label: "Photo livraison",
              value: order.hasDeliveryPhoto ? "Reçue" : "Non reçue",
            },
            {
              label: "Créée",
              value: (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {order.ago}
                </span>
              ),
            },
            { label: "Statut", value: <Badge tone={meta.tone}>{meta.label}</Badge> },
          ]}
          columns={2}
        />
      </Card>
    </div>
  );
}
