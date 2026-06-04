"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Calendar,
  Car as CarIcon,
  KeyRound,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  PowerOff,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import {
  DetailHeader,
  DetailNotFound,
  InfoGrid,
} from "@/shared/ui/detail-header";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Combobox } from "@/shared/ui/combobox";
import { Tabs } from "@/shared/ui/tabs";
import { toast } from "@/shared/ui/toast";
import { formatXof } from "@/shared/lib/format";
import { mockDeliveryOrders } from "@/features/delivery/domain/mock";
import {
  DELIVERY_STATUS_META,
  PARCEL_TYPE_META,
} from "@/features/delivery/domain/delivery";
import { mockRides } from "@/features/rides/domain/mock";
import {
  PAYMENT_METHOD_LABELS,
  RIDE_STATUS_META,
  VEHICLE_TYPE_LABELS,
} from "@/features/rides/domain/ride";
import { useWalletStore } from "@/features/wallet/store";
import { usePassengersStore, type PassengerRow } from "./store";

type ConfirmAction = "suspend" | "reactivate" | "reset-password" | "delete";

const CITY_OPTIONS = [
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
];

function PassengerEditModal({
  open,
  passenger,
  onClose,
}: {
  open: boolean;
  passenger: PassengerRow;
  onClose: () => void;
}) {
  const update = usePassengersStore((s) => s.update);
  const [form, setForm] = useState({
    fullName: passenger.fullName,
    phone: passenger.phone,
    email: passenger.email,
    city: passenger.city,
  });

  function handleSubmit() {
    update(passenger.passengerId, form);
    toast({
      kind: "success",
      title: "Profil mis à jour",
      description: form.fullName,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifier le profil"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Enregistrer</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom complet"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        />
        <Input
          label="Téléphone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="sm:col-span-2"
        />
        <Combobox
          label="Ville"
          options={CITY_OPTIONS}
          value={form.city}
          onChange={(v) => setForm((f) => ({ ...f, city: v }))}
        />
      </div>
    </Modal>
  );
}

export function PassengerDetailPage({ passengerId }: { passengerId: string }) {
  const router = useRouter();
  const passenger = usePassengersStore((s) =>
    s.passengers.find((p) => p.passengerId === passengerId),
  );
  const suspend = usePassengersStore((s) => s.suspend);
  const reactivate = usePassengersStore((s) => s.reactivate);
  const remove = usePassengersStore((s) => s.remove);
  const transactions = useWalletStore((s) => s.transactions);

  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: ConfirmAction;
  }>({ open: false, action: "suspend" });

  const passengerRides = useMemo(
    () =>
      passenger
        ? mockRides.filter((r) => r.passengerName === passenger.fullName)
        : [],
    [passenger],
  );

  const passengerDeliveries = useMemo(
    () =>
      passenger
        ? mockDeliveryOrders.filter((o) => o.passengerName === passenger.fullName)
        : [],
    [passenger],
  );

  const passengerTransactions = useMemo(
    () =>
      transactions.filter((t) => passenger && t.userName === passenger.fullName),
    [transactions, passenger],
  );

  if (!passenger) {
    return (
      <DetailNotFound
        backHref="/vtc/passengers"
        backLabel="Retour à la liste des passagers"
        message="Passager introuvable. Le compte a peut-être été supprimé."
      />
    );
  }

  function runConfirm(reason?: string) {
    if (!passenger) return;
    if (confirm.action === "suspend") {
      suspend(passenger.passengerId);
      toast({
        kind: "warning",
        title: "Compte suspendu",
        description: reason ?? passenger.fullName,
      });
    } else if (confirm.action === "reactivate") {
      reactivate(passenger.passengerId);
      toast({
        kind: "success",
        title: "Compte réactivé",
        description: passenger.fullName,
      });
    } else if (confirm.action === "reset-password") {
      toast({
        kind: "info",
        title: "Mot de passe réinitialisé",
        description: `Un SMS a été envoyé à ${passenger.phone}.`,
      });
    } else if (confirm.action === "delete") {
      remove(passenger.passengerId);
      toast({
        kind: "info",
        title: "Compte supprimé",
        description: passenger.fullName,
      });
      router.push("/vtc/passengers");
      return;
    }
    setConfirm({ open: false, action: confirm.action });
  }

  const headerActions = (
    <DropdownMenu
      trigger={<Button size="sm">Actions</Button>}
      groups={[
        {
          label: "Cas d'usage",
          items: [
            { label: "Modifier le profil", icon: Pencil, onSelect: () => setEditOpen(true) },
            {
              label: "Réinitialiser le mot de passe",
              icon: KeyRound,
              onSelect: () => setConfirm({ open: true, action: "reset-password" }),
            },
            passenger.isSuspended
              ? {
                  label: "Réactiver",
                  icon: ShieldCheck,
                  onSelect: () => setConfirm({ open: true, action: "reactivate" }),
                }
              : {
                  label: "Suspendre",
                  icon: PowerOff,
                  onSelect: () => setConfirm({ open: true, action: "suspend" }),
                  danger: true,
                },
          ],
        },
        {
          items: [
            {
              label: "Supprimer",
              icon: Trash2,
              onSelect: () => setConfirm({ open: true, action: "delete" }),
              danger: true,
            },
          ],
        },
      ]}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/vtc/passengers"
        backLabel="Retour aux passagers"
        eyebrow="Client passager"
        title={passenger.fullName}
        subtitle={
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {passenger.phone}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3" />
              {passenger.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {passenger.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              Inscrit {passenger.registeredAgo}
            </span>
          </div>
        }
        avatar={<Avatar name={passenger.fullName} className="size-16 text-lg" />}
        status={
          passenger.isSuspended ? (
            <Badge tone="danger">Suspendu</Badge>
          ) : (
            <Badge tone="success">Actif</Badge>
          )
        }
        actions={headerActions}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Wallet
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(passenger.walletBalance)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">solde courant</p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Total courses
          </p>
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">
            {passenger.totalRides}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            depuis l&apos;inscription
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Note moyenne donnée
          </p>
          {passenger.totalRides > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-2xl font-semibold text-[color:var(--foreground)]">
              <Star className="size-5 fill-[color:var(--secondary)] text-[color:var(--secondary)]" />
              {passenger.rating.toFixed(1)}
            </p>
          ) : (
            <p className="text-sm italic text-[color:var(--muted-foreground)]">
              Pas encore d&apos;évaluation
            </p>
          )}
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Dernière activité
          </p>
          <p className="text-base font-medium text-[color:var(--foreground)]">
            {passenger.lastActivity}
          </p>
        </Card>
      </section>

      <Tabs
        defaultValue="overview"
        tabs={[
          {
            value: "overview",
            label: "Vue d'ensemble",
            content: (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-4 text-base font-semibold text-[color:var(--foreground)]">
                    Identité
                  </h3>
                  <InfoGrid
                    rows={[
                      { label: "Nom complet", value: passenger.fullName },
                      { label: "Téléphone", value: <span className="font-mono">{passenger.phone}</span> },
                      { label: "Email", value: <span className="font-mono">{passenger.email}</span> },
                      { label: "Ville", value: passenger.city },
                      { label: "Inscrit", value: passenger.registeredAgo },
                      { label: "Passenger ID", value: <span className="font-mono text-xs">{passenger.passengerId}</span> },
                    ]}
                  />
                </Card>

                <Card className="p-5">
                  <h3 className="mb-4 text-base font-semibold text-[color:var(--foreground)]">
                    Activité agrégée
                  </h3>
                  <ul className="flex flex-col gap-3">
                    <li className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                        <CarIcon className="size-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[color:var(--foreground)]">
                          Courses VTC
                        </p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {passengerRides.length} courses récentes en session
                        </p>
                      </div>
                    </li>
                    <li className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                        <Package className="size-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[color:var(--foreground)]">
                          Livraisons B2C
                        </p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {passengerDeliveries.length} commande
                          {passengerDeliveries.length !== 1 ? "s" : ""} récente
                          {passengerDeliveries.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                        <Banknote className="size-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[color:var(--foreground)]">
                          Mouvements wallet
                        </p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {passengerTransactions.length} transaction
                          {passengerTransactions.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </li>
                  </ul>
                </Card>
              </div>
            ),
          },
          {
            value: "rides",
            label: "Courses",
            badge: passengerRides.length
              ? { count: passengerRides.length, tone: "primary" }
              : undefined,
            content:
              passengerRides.length === 0 ? (
                <Card className="p-12 text-center text-sm text-[color:var(--muted-foreground)]">
                  Aucune course récente.
                </Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                        <th className="px-5 py-2.5 font-medium">Course</th>
                        <th className="px-5 py-2.5 font-medium">Driver</th>
                        <th className="px-5 py-2.5 font-medium">Trajet</th>
                        <th className="px-5 py-2.5 text-right font-medium">Prix</th>
                        <th className="px-5 py-2.5 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengerRides.map((ride) => {
                        const rmeta = RIDE_STATUS_META[ride.status];
                        return (
                          <tr
                            key={ride.rideId}
                            className="cursor-pointer border-b border-[color:var(--border)] last:border-b-0 hover:bg-[color:var(--muted)]/40"
                            onClick={() => router.push(`/vtc/rides/${ride.rideId}`)}
                          >
                            <td className="px-5 py-3">
                              <p className="font-mono text-xs font-semibold text-[color:var(--primary)]">
                                {ride.rideNumber}
                              </p>
                              <p className="text-xs text-[color:var(--muted-foreground)]">
                                {VEHICLE_TYPE_LABELS[ride.vehicleType]} ·{" "}
                                {PAYMENT_METHOD_LABELS[ride.paymentMethod]}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              {ride.driverName ? (
                                <span className="text-sm text-[color:var(--foreground)]">
                                  {ride.driverName}
                                </span>
                              ) : (
                                <span className="text-xs italic text-[color:var(--muted-foreground)]">
                                  Non assigné
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-sm text-[color:var(--foreground)]">
                                {ride.pickupAddress}
                              </p>
                              <p className="text-xs text-[color:var(--muted-foreground)]">
                                → {ride.dropoffAddress}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-sm text-[color:var(--foreground)]">
                              {formatXof(ride.finalPrice ?? ride.estimatedPrice)}
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone={rmeta.tone}>{rmeta.label}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              ),
          },
          {
            value: "deliveries",
            label: "Livraisons",
            badge: passengerDeliveries.length
              ? { count: passengerDeliveries.length, tone: "primary" }
              : undefined,
            content:
              passengerDeliveries.length === 0 ? (
                <Card className="p-12 text-center text-sm text-[color:var(--muted-foreground)]">
                  Aucune livraison récente.
                </Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                        <th className="px-5 py-2.5 font-medium">Commande</th>
                        <th className="px-5 py-2.5 font-medium">Colis</th>
                        <th className="px-5 py-2.5 font-medium">Trajet</th>
                        <th className="px-5 py-2.5 text-right font-medium">Prix</th>
                        <th className="px-5 py-2.5 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengerDeliveries.map((order) => {
                        const dmeta = DELIVERY_STATUS_META[order.status];
                        const pmeta = PARCEL_TYPE_META[order.parcelType];
                        return (
                          <tr
                            key={order.orderId}
                            className="cursor-pointer border-b border-[color:var(--border)] last:border-b-0 hover:bg-[color:var(--muted)]/40"
                            onClick={() =>
                              router.push(`/delivery/orders/${order.orderId}`)
                            }
                          >
                            <td className="px-5 py-3">
                              <p className="font-mono text-xs font-semibold text-[color:var(--primary)]">
                                {order.orderNumber}
                              </p>
                              <p className="text-xs text-[color:var(--muted-foreground)]">
                                {order.vehicleType} · {order.ago}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1.5 text-sm text-[color:var(--foreground)]">
                                <span aria-hidden>{pmeta.emoji}</span>
                                {pmeta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-sm text-[color:var(--foreground)]">
                                {order.pickupAddress}
                              </p>
                              <p className="text-xs text-[color:var(--muted-foreground)]">
                                → {order.dropoffAddress}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-sm text-[color:var(--foreground)]">
                              {formatXof(order.finalPrice ?? order.estimatedPrice)}
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone={dmeta.tone}>{dmeta.label}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              ),
          },
          {
            value: "wallet",
            label: "Wallet",
            content: (
              <Card className="p-0">
                <div className="border-b border-[color:var(--border)] px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Solde
                  </p>
                  <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
                    {formatXof(passenger.walletBalance)}
                  </p>
                </div>
                {passengerTransactions.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                    Aucun mouvement pour ce passager dans la session courante.
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {passengerTransactions.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 border-t border-[color:var(--border)] px-5 py-3 first:border-t-0"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--muted)]">
                          <Banknote className="size-4 text-[color:var(--muted-foreground)]" />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-[color:var(--foreground)]">
                            {t.type}
                          </p>
                          <p className="font-mono text-xs text-[color:var(--muted-foreground)]">
                            {t.reference} · {t.ago}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-medium text-[color:var(--foreground)]">
                          {formatXof(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ),
          },
        ]}
      />

      <PassengerEditModal
        open={editOpen}
        passenger={passenger}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          {
            suspend: "Suspendre ce passager ?",
            reactivate: "Réactiver ce passager ?",
            "reset-password": "Réinitialiser le mot de passe ?",
            delete: "Supprimer définitivement ?",
          }[confirm.action]
        }
        description={
          <p>
            <span className="font-medium text-[color:var(--foreground)]">
              {passenger.fullName}
            </span>{" "}
            · {passenger.phone}
          </p>
        }
        confirmLabel={
          {
            suspend: "Suspendre",
            reactivate: "Réactiver",
            "reset-password": "Envoyer le SMS",
            delete: "Supprimer",
          }[confirm.action]
        }
        tone={
          confirm.action === "delete" || confirm.action === "suspend"
            ? "danger"
            : "primary"
        }
        withReason={
          confirm.action === "suspend"
            ? { label: "Motif", required: true }
            : undefined
        }
      />
    </div>
  );
}
