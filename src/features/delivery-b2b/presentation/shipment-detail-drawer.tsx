"use client";

import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  MapPin,
  PackageOpen,
  Phone,
  Pencil,
  Repeat,
  ShieldX,
  TruckIcon,
  Wallet,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { formatXof, formatDateTime } from "@/shared/lib/format";
import {
  PARCEL_LABELS,
  PRIORITY_META,
  SHIPMENT_STATUS_META,
  type Shipment,
} from "../domain/types";
import { ShipmentPipeline } from "./shipment-pipeline";

export function ShipmentDetailDrawer({
  shipment,
  onClose,
}: {
  shipment: Shipment | null;
  onClose: () => void;
}) {
  if (!shipment) return null;
  const statusMeta = SHIPMENT_STATUS_META[shipment.status];
  const prioMeta = PRIORITY_META[shipment.priority];

  return (
    <Modal
      open={!!shipment}
      onClose={onClose}
      size="xl"
      title={`Livraison ${shipment.reference}`}
      description={`${shipment.senderName} → ${shipment.dropoff.city}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="outline">
            <Pencil className="size-4" />
            Modifier
          </Button>
          <Button>
            <CheckCircle2 className="size-4" />
            Marquer livrée
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          <Badge tone={prioMeta.tone}>{prioMeta.label}</Badge>
          <Badge tone="neutral">{PARCEL_LABELS[shipment.category]}</Badge>
          <Badge tone="info">{shipment.weightKg.toFixed(1)} kg</Badge>
          <Badge tone="info">{shipment.distanceKm.toFixed(1)} km</Badge>
        </div>

        <ShipmentPipeline status={shipment.status} />

        <section className="grid gap-6 lg:grid-cols-2">
          <PointCard
            kind="pickup"
            label="Collecte"
            place={shipment.pickup.label}
            city={`${shipment.pickup.city} · ${shipment.pickup.district}`}
            contact={shipment.pickup.contactName}
            phone={shipment.pickup.contactPhone}
            scheduledAt={shipment.pickupAt}
          />
          <PointCard
            kind="dropoff"
            label="Livraison"
            place={shipment.dropoff.label}
            city={`${shipment.dropoff.city} · ${shipment.dropoff.district}`}
            contact={shipment.dropoff.contactName}
            phone={shipment.dropoff.contactPhone}
            scheduledAt={shipment.expectedDropoffAt}
            doneAt={shipment.deliveredAt ?? undefined}
          />
        </section>

        <section className="grid gap-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4 sm:grid-cols-3">
          <Stat label="Prix de la course" value={formatXof(shipment.price)} />
          <Stat
            label="Valeur déclarée"
            value={formatXof(shipment.declaredValue)}
          />
          <Stat
            label="Mode paiement"
            value={
              shipment.paymentMethod === "INVOICE"
                ? "Facture mensuelle"
                : shipment.paymentMethod === "WALLET"
                  ? "Wallet"
                  : "Mobile Money"
            }
          />
        </section>

        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <TruckIcon className="size-4 text-[color:var(--primary)]" />
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
              Livreur
            </h3>
          </div>
          {shipment.courierName ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-[color:var(--primary-soft)] font-semibold text-[color:var(--primary)]">
                  {shipment.courierName
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium">
                    {shipment.courierName}
                  </span>
                  <span className="text-xs text-[color:var(--muted-foreground)]">
                    {shipment.vehicle ?? "—"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="size-4" />
                  Appeler
                </Button>
                <Button variant="outline" size="sm">
                  <Repeat className="size-4" />
                  Réassigner
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm italic text-[color:var(--muted-foreground)]">
                Aucun livreur assigné — en attente du dispatch.
              </p>
              <Button size="sm">
                <TruckIcon className="size-4" />
                Forcer dispatch
              </Button>
            </div>
          )}
        </section>

        {shipment.notes ? (
          <div className="flex items-start gap-2 rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-2 text-xs text-[color:var(--warning)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>Note :</strong> {shipment.notes}
            </p>
          </div>
        ) : null}

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
            <PackageOpen className="size-4 text-[color:var(--primary)]" />
            Historique
          </h3>
          <ol className="relative ml-3 flex flex-col gap-3 border-l border-[color:var(--border)] pl-5">
            {shipment.timeline.map((evt, i) => (
              <li key={i} className="relative">
                <span
                  className={
                    "absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2 border-[color:var(--background)] " +
                    (evt.kind === "success"
                      ? "bg-[color:var(--success)]"
                      : evt.kind === "danger"
                        ? "bg-[color:var(--danger)]"
                        : evt.kind === "warning"
                          ? "bg-[color:var(--warning)]"
                          : "bg-[color:var(--primary)]")
                  }
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">
                    {evt.label}
                  </span>
                  <span className="text-[10px] text-[color:var(--muted-foreground)]">
                    {formatDateTime(evt.at)}
                    {evt.by ? ` · ${evt.by}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border)] pt-4">
          <span className="mr-auto text-sm font-medium text-[color:var(--foreground)]">
            Actions admin
          </span>
          <Button variant="outline" size="sm">
            <Wallet className="size-4" />
            Rembourser
          </Button>
          <Button variant="outline" size="sm">
            <Repeat className="size-4" />
            Forcer le statut
          </Button>
          <Button variant="outline" size="sm">
            <ShieldX className="size-4" />
            Marquer en échec
          </Button>
          <Button variant="danger" size="sm">
            <Ban className="size-4" />
            Annuler la livraison
          </Button>
        </section>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
        {label}
      </span>
      <span className="text-sm font-semibold text-[color:var(--foreground)]">
        {value}
      </span>
    </div>
  );
}

function PointCard({
  kind,
  label,
  place,
  city,
  contact,
  phone,
  scheduledAt,
  doneAt,
}: {
  kind: "pickup" | "dropoff";
  label: string;
  place: string;
  city: string;
  contact: string;
  phone: string;
  scheduledAt: string;
  doneAt?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
      <div className="flex items-center gap-2">
        <span
          className={
            "flex size-7 items-center justify-center rounded-full " +
            (kind === "pickup"
              ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
              : "bg-[color:var(--success)]/10 text-[color:var(--success)]")
          }
        >
          {kind === "pickup" ? (
            <MapPin className="size-3.5" />
          ) : (
            <ArrowRight className="size-3.5" />
          )}
        </span>
        <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
          {label}
        </span>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-[color:var(--foreground)]">
          {place}
        </span>
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {city}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 text-xs">
        <span>{contact}</span>
        <a
          href={`tel:${phone}`}
          className="font-mono text-[color:var(--primary)] hover:underline"
        >
          {phone}
        </a>
      </div>
      <div className="flex flex-col gap-0.5 border-t border-[color:var(--border)] pt-2 text-[10px] text-[color:var(--muted-foreground)]">
        <span>
          {kind === "pickup" ? "Collecte prévue : " : "Livraison prévue : "}
          <span className="font-medium text-[color:var(--foreground)]">
            {formatDateTime(scheduledAt)}
          </span>
        </span>
        {doneAt ? (
          <span>
            Réalisée à :{" "}
            <span className="font-medium text-[color:var(--success)]">
              {formatDateTime(doneAt)}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
