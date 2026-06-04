"use client";

import {
  Bike,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldX,
  Star,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { formatXof, formatDate } from "@/shared/lib/format";
import {
  COURIER_STATUS_META,
  VEHICLE_LABELS,
  type Courier,
} from "../domain/types";
import { SHIPMENTS } from "../domain/mock";

export function CourierDetailDrawer({
  courier,
  onClose,
}: {
  courier: Courier | null;
  onClose: () => void;
}) {
  if (!courier) return null;
  const meta = COURIER_STATUS_META[courier.status];
  const recent = SHIPMENTS.filter((s) => s.courierId === courier.id).slice(0, 5);

  return (
    <Modal
      open={!!courier}
      onClose={onClose}
      size="xl"
      title={courier.fullName}
      description={`${VEHICLE_LABELS[courier.primaryVehicle]} · ${courier.city}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          {courier.status === "SUSPENDED" ? (
            <Button>
              <ShieldCheck className="size-4" />
              Réactiver
            </Button>
          ) : (
            <Button variant="danger">
              <ShieldX className="size-4" />
              Suspendre
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <Avatar name={courier.fullName} className="size-16 text-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {courier.isVerified ? (
                <Badge tone="success">
                  <CheckCircle2 className="size-3" />
                  Vérifié
                </Badge>
              ) : (
                <Badge tone="warning">KYC en attente</Badge>
              )}
              <Badge tone="info">★ {courier.rating.toFixed(2)}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--muted-foreground)]">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3" />
                {courier.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3" />
                {courier.id}@livreurs.4u-foryou.bj
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3" />
                Zones : {courier.zonesCovered.join(", ")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3" />
                Inscrit le {formatDate(courier.joinedAt)}
              </span>
            </div>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Livraisons"
            value={courier.totalDeliveries.toLocaleString("fr-FR")}
            icon={<Bike className="size-4" />}
          />
          <Stat
            label="Taux de succès"
            value={`${courier.successRate.toFixed(1)} %`}
            icon={<CheckCircle2 className="size-4" />}
          />
          <Stat
            label="Note client"
            value={`★ ${courier.rating.toFixed(1)}`}
            icon={<Star className="size-4" />}
          />
          <Stat
            label="Revenu mois"
            value={formatXof(courier.monthRevenueFcfa)}
            icon={<Wallet className="size-4" />}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
              Dernières livraisons
            </h3>
            {recent.length === 0 ? (
              <p className="text-sm italic text-[color:var(--muted-foreground)]">
                Aucune livraison récente.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[color:var(--border)]">
                {recent.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="flex flex-col leading-tight">
                      <span className="font-mono">{s.reference}</span>
                      <span className="text-[10px] text-[color:var(--muted-foreground)]">
                        {s.pickup.city} → {s.dropoff.city}
                      </span>
                    </div>
                    <Badge tone="primary">{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
              Wallet & paiements
            </h3>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[color:var(--muted-foreground)]">Solde</dt>
                <dd className="font-semibold">
                  {formatXof(courier.walletBalance)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[color:var(--muted-foreground)]">
                  À reverser
                </dt>
                <dd className="font-semibold">
                  {formatXof(courier.pendingPayouts)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[color:var(--border)] pt-2">
                <dt className="text-[color:var(--muted-foreground)]">
                  Dernier reversement
                </dt>
                <dd className="text-xs">il y a 4 j</dd>
              </div>
            </dl>
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <Wallet className="size-4" />
              Initier un retrait
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3">
      <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
        {icon}
        {label}
      </span>
      <span className="text-base font-semibold text-[color:var(--foreground)]">
        {value}
      </span>
    </div>
  );
}
