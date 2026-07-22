"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Clock3,
  CreditCard,
  KeyRound,
  MapPin,
  Package,
  PackageOpen,
  Phone,
  RefreshCw,
  Snowflake,
  Truck,
  User,
  X,
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
import { Modal } from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import { cancelDeliveryAction } from "../application/actions";
import {
  DELIVERY_PAYMENT_LABELS,
  DELIVERY_TYPE_LABELS,
  DELIVERY_VEHICLE_LABELS,
  deliveryStatusMeta,
  type AdminDeliveryDetail,
  type DeliveryLocation,
  type DeliveryPaymentMethod,
  type DeliveryType,
  type DeliveryVehicleType,
} from "../domain/delivery";

function LocationCard({
  title,
  icon: Icon,
  location,
}: {
  title: string;
  icon: typeof MapPin;
  location: DeliveryLocation;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-[color:var(--primary)]" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Adresse
            </dt>
            <dd className="text-[color:var(--foreground)]">
              {location.address || (
                <span className="italic text-[color:var(--muted-foreground)]">
                  Non renseigné
                </span>
              )}
            </dd>
          </div>
          {location.landmark ? (
            <div className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Point de repère
              </dt>
              <dd className="text-[color:var(--foreground)]">
                {location.landmark}
              </dd>
            </div>
          ) : null}
          {location.contactName || location.contactPhone ? (
            <div className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Contact sur place
              </dt>
              <dd className="flex items-center gap-2 text-[color:var(--foreground)]">
                {location.contactName ? (
                  <span>{location.contactName}</span>
                ) : null}
                {location.contactPhone ? (
                  <a
                    href={`tel:${location.contactPhone}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--primary)] hover:underline"
                  >
                    <Phone className="size-3" />
                    {location.contactPhone}
                  </a>
                ) : null}
              </dd>
            </div>
          ) : null}
          {location.latitude || location.longitude ? (
            <div className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                GPS
              </dt>
              <dd>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[color:var(--primary)] hover:underline"
                >
                  {location.latitude.toFixed(5)},{" "}
                  {location.longitude.toFixed(5)}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}

function PhotoCard({
  title,
  url,
}: {
  title: string;
  url: string | null | undefined;
}) {
  if (!url) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-[color:var(--muted-foreground)]" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs italic text-[color:var(--muted-foreground)]">
            Non renseigné
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Camera className="size-5 text-[color:var(--primary)]" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <a href={url} target="_blank" rel="noopener noreferrer" title="Ouvrir">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={title}
            className="max-h-64 w-full rounded-lg object-cover"
          />
        </a>
      </CardContent>
    </Card>
  );
}

export interface DeliveryDetailClientProps {
  delivery: AdminDeliveryDetail;
  /** URL de retour vers la liste. Défaut : "/delivery-b2b/shipments". */
  backPath?: string;
}

const CANCELLABLE_STATUSES = new Set([
  "PENDING",
  "DRIVER_ASSIGNED",
  "PICKUP_FAILED",
  "DELIVERY_FAILED",
]);

export function DeliveryDetailClient({
  delivery,
  backPath = "/delivery-b2b/shipments",
}: DeliveryDetailClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, startCancel] = useTransition();
  const statusMeta = deliveryStatusMeta(delivery.status);
  const isCancelled =
    delivery.status === "CANCELLED" || delivery.status === "FAILED";
  const canCancel = CANCELLABLE_STATUSES.has(delivery.status);

  function submitCancel() {
    startCancel(async () => {
      const res = await cancelDeliveryAction(delivery.id, cancelReason.trim() || undefined);
      if (res.ok) {
        toast({ kind: "success", title: "Commande annulée", description: res.message });
        setCancelOpen(false);
        setCancelReason("");
        router.refresh();
      } else {
        toast({ kind: "error", title: "Erreur", description: res.message });
      }
    });
  }

  const orderRows: InfoRow[] = [
    {
      label: "Type",
      value:
        DELIVERY_TYPE_LABELS[delivery.deliveryType as DeliveryType] ??
        delivery.deliveryType,
    },
    {
      label: "Véhicule",
      value:
        DELIVERY_VEHICLE_LABELS[delivery.vehicleType as DeliveryVehicleType] ??
        delivery.vehicleType,
    },
    {
      label: "Paiement",
      value:
        DELIVERY_PAYMENT_LABELS[
          delivery.paymentMethod as DeliveryPaymentMethod
        ] ?? delivery.paymentMethod,
    },
    {
      label: "Prix estimé",
      value: formatXof(delivery.estimatedPrice),
    },
    {
      label: "Prix final",
      value: delivery.finalPrice > 0 ? formatXof(delivery.finalPrice) : null,
    },
    {
      label: "OTP confirmé le",
      value: formatDateTime(delivery.otpVerifiedAt),
    },
    {
      label: "Créée le",
      value: formatDateTime(delivery.createdAt),
    },
    {
      label: "Mise à jour le",
      value: formatDateTime(delivery.updatedAt),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref={backPath}
        backLabel="Retour aux livraisons"
        eyebrow="Livraison B2C"
        title={delivery.orderNumber}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CopyableId id={delivery.id} prefix="Order" />
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" />
              {formatDateTime(delivery.createdAt)}
            </span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span className="inline-flex items-center gap-1">
              <CreditCard className="size-3" />
              {formatXof(delivery.finalPrice || delivery.estimatedPrice)}
            </span>
          </div>
        }
        avatar={
          <div className="flex size-14 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
            <PackageOpen className="size-7" />
          </div>
        }
        status={<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>}
        actions={
          <>
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(true)}
                disabled={refreshing || cancelling}
              >
                <X className="size-4 text-[color:var(--danger)]" />
                Annuler la commande
              </Button>
            )}
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
          </>
        }
      />

      {isCancelled && (delivery.cancelReason || delivery.cancelledBy) ? (
        <Card className="border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5">
          <CardContent>
            <p className="text-sm text-[color:var(--danger)]">
              <strong>Annulée</strong>
              {delivery.cancelledBy ? ` par ${delivery.cancelledBy}` : ""}
              {delivery.cancelReason ? ` — ${delivery.cancelReason}` : ""}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Commande</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={orderRows} columns={2} />
          </CardContent>
        </Card>

        {/* Passenger */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Expéditeur</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {delivery.passenger ? (
              <div className="flex items-center gap-3">
                <Avatar name={delivery.passenger.name} className="size-12" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-[color:var(--foreground)]">
                    {delivery.passenger.name}
                  </span>
                  <a
                    href={`tel:${delivery.passenger.phone}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--primary)] hover:underline"
                  >
                    <Phone className="size-3" />
                    {delivery.passenger.phone}
                  </a>
                  <CopyableId
                    id={delivery.passenger.passengerId}
                    prefix="Passager"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-[color:var(--muted-foreground)]">
                Non renseigné
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Driver — full card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="size-5 text-[color:var(--primary)]" />
            <CardTitle>Driver assigné</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {delivery.driver ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  name={delivery.driver.name}
                  className="size-12 text-base"
                />
                <div className="flex flex-col leading-tight">
                  <a
                    href={`/vtc/drivers/${delivery.driver.driverId}`}
                    className="text-sm font-semibold text-[color:var(--foreground)] hover:underline"
                  >
                    {delivery.driver.name}
                  </a>
                  <a
                    href={`tel:${delivery.driver.phone}`}
                    className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--primary)] hover:underline"
                  >
                    <Phone className="size-3" />
                    {delivery.driver.phone}
                  </a>
                  <CopyableId
                    id={delivery.driver.driverId}
                    prefix="Driver"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-[color:var(--muted)]/40 p-3 text-center lg:min-w-80">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[color:var(--muted-foreground)]">
                    Note
                  </span>
                  <span className="text-sm font-semibold">
                    ★ {delivery.driver.rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex flex-col border-x border-[color:var(--border)]">
                  <span className="text-[10px] text-[color:var(--muted-foreground)]">
                    Courses
                  </span>
                  <span className="text-sm font-semibold">
                    {delivery.driver.totalRides}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[color:var(--muted-foreground)]">
                    Véhicule
                  </span>
                  <span className="text-xs font-semibold">
                    {delivery.driver.vehicle
                      ? `${delivery.driver.vehicle.make} ${delivery.driver.vehicle.model}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm italic text-[color:var(--muted-foreground)]">
              Aucun driver n&apos;est encore assigné à cette commande.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <LocationCard
          title="Point de collecte"
          icon={MapPin}
          location={delivery.pickup}
        />
        <LocationCard
          title="Point de livraison"
          icon={MapPin}
          location={delivery.dropoff}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Parcel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Colis</CardTitle>
              {delivery.parcel?.requiresRefrigeration ? (
                <Badge tone="info">
                  <Snowflake className="size-3" />
                  Réfrigéré
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <InfoGrid
              columns={2}
              rows={[
                { label: "Type", value: delivery.parcel?.type ?? null },
                {
                  label: "Description",
                  value: delivery.parcel?.description ?? null,
                },
                {
                  label: "Poids estimé",
                  value:
                    delivery.parcel?.estimatedWeightKg &&
                    delivery.parcel.estimatedWeightKg > 0
                      ? `${delivery.parcel.estimatedWeightKg.toFixed(1)} kg`
                      : null,
                },
                {
                  label: "Instructions",
                  value: delivery.parcel?.specialInstructions ?? null,
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* Recipient */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Destinataire</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {delivery.recipient ? (
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex flex-col">
                  <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Nom
                  </dt>
                  <dd className="text-[color:var(--foreground)]">
                    {delivery.recipient.name || (
                      <span className="italic text-[color:var(--muted-foreground)]">
                        Non renseigné
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Téléphone
                  </dt>
                  <dd>
                    {delivery.recipient.phone ? (
                      <a
                        href={`tel:${delivery.recipient.phone}`}
                        className="inline-flex items-center gap-1 font-mono text-sm text-[color:var(--primary)] hover:underline"
                      >
                        <Phone className="size-3" />
                        {delivery.recipient.phone}
                      </a>
                    ) : (
                      <span className="italic text-[color:var(--muted-foreground)]">
                        Non renseigné
                      </span>
                    )}
                  </dd>
                </div>
                {delivery.otpVerifiedAt ? (
                  <div className="flex flex-col">
                    <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                      OTP
                    </dt>
                    <dd className="inline-flex items-center gap-1 text-[color:var(--success)]">
                      <KeyRound className="size-3" />
                      Confirmé le {formatDateTime(delivery.otpVerifiedAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm italic text-[color:var(--muted-foreground)]">
                Non renseigné
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PhotoCard title="Photo de collecte" url={delivery.pickupPhoto} />
        <PhotoCard title="Photo de livraison" url={delivery.deliveryPhoto} />
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler la commande">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--danger)]" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[color:var(--danger)]">
                Annulation irréversible
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                La commande <strong>{delivery.orderNumber}</strong> sera annulée immédiatement.
                Le driver sera notifié et la commande ne pourra pas être relancée.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[color:var(--foreground)]">
              Motif d&apos;annulation <span className="text-[color:var(--muted-foreground)]">(optionnel)</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="ex: Demande du client, adresse incorrecte…"
              className="resize-none rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--danger)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Fermer
            </Button>
            <Button
              onClick={submitCancel}
              disabled={cancelling}
              className="bg-[color:var(--danger)] text-white hover:opacity-90"
            >
              {cancelling ? <><Spinner size="sm" /> Annulation…</> : "Confirmer l'annulation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
