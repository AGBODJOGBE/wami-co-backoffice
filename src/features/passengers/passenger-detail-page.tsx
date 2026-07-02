"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Calendar,
  Car as CarIcon,
  Mail,
  MapPin,
  Package,
  Phone,
  Star,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import {
  DetailHeader,
  DetailNotFound,
  InfoGrid,
} from "@/shared/ui/detail-header";
import { Tabs } from "@/shared/ui/tabs";
import { formatDate, formatXof } from "@/shared/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  VEHICLE_TYPE_LABELS,
} from "@/features/rides/domain/ride";
import {
  rideStatusMeta,
  fullParty,
  type AdminRide,
} from "@/features/rides/domain/admin-ride";
import type { AdminWallet } from "@/features/wallet/domain/wallet";
import type { PassengerRow } from "./store";

interface PassengerDetailPageProps {
  passengerId: string;
  passenger: PassengerRow | null;
  rides: AdminRide[];
  wallet: AdminWallet | null;
}

export function PassengerDetailPage({
  passengerId: _passengerId,
  passenger,
  rides,
  wallet,
}: PassengerDetailPageProps) {
  const router = useRouter();
  const [_editOpen, _setEditOpen] = useState(false);

  if (!passenger) {
    return (
      <DetailNotFound
        backHref="/vtc/passengers"
        backLabel="Retour à la liste des passagers"
        message="Passager introuvable. Le compte a peut-être été supprimé."
      />
    );
  }

  const walletBalance = wallet?.totalBalance ?? passenger.walletBalance;
  const totalRides = rides.length > 0 ? rides.length : passenger.totalRides;

  // Compute registeredAgo from createdAt
  const registeredAgo = (() => {
    if (!passenger.createdAt) return passenger.registeredAgo;
    const ms = Date.now() - new Date(passenger.createdAt).getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (days === 0) return "aujourd'hui";
    if (days < 30) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `il y a ${months} mois`;
    return `il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? "s" : ""}`;
  })();

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
            {passenger.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3" />
                {passenger.email}
              </span>
            ) : null}
            {passenger.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {passenger.city}
              </span>
            ) : null}
            {registeredAgo && registeredAgo !== "—" ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" />
                Inscrit {registeredAgo}
              </span>
            ) : null}
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
      />

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Wallet
          </p>
          <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
            {formatXof(walletBalance)}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {wallet ? `solde ${wallet.walletType}` : "solde courant"}
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Total courses
          </p>
          <p className="text-2xl font-semibold text-[color:var(--foreground)]">
            {totalRides}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            depuis l&apos;inscription
          </p>
        </Card>
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Note moyenne donnée
          </p>
          {passenger.rating > 0 ? (
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
            Wallet statut
          </p>
          <p className="text-base font-medium text-[color:var(--foreground)]">
            {wallet ? (
              <Badge tone={wallet.status === "ACTIVE" ? "success" : "warning"}>
                {wallet.status}
              </Badge>
            ) : (
              <span className="text-sm italic text-[color:var(--muted-foreground)]">—</span>
            )}
          </p>
        </Card>
      </section>

      <Tabs
        defaultValue="overview"
        tabs={[
          // ── Vue d'ensemble ────────────────────────────────────────────
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
                      {
                        label: "Téléphone",
                        value: <span className="font-mono">{passenger.phone}</span>,
                      },
                      {
                        label: "Email",
                        value: (
                          <span className="font-mono">
                            {passenger.email || "—"}
                          </span>
                        ),
                      },
                      { label: "Ville", value: passenger.city || "—" },
                      { label: "Inscrit", value: registeredAgo },
                      {
                        label: "Inscrit le",
                        value: passenger.createdAt
                          ? formatDate(passenger.createdAt)
                          : "—",
                      },
                      {
                        label: "Passenger ID",
                        value: (
                          <span className="font-mono text-xs">
                            {passenger.passengerId}
                          </span>
                        ),
                      },
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
                          {rides.length} course{rides.length !== 1 ? "s" : ""} enregistrée{rides.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {rides.length > 0 && (
                        <Badge tone="primary">{rides.length}</Badge>
                      )}
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
                          Aucune livraison enregistrée
                        </p>
                      </div>
                    </li>
                    <li className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                        <Banknote className="size-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[color:var(--foreground)]">
                          Wallet
                        </p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {wallet
                            ? `Solde : ${formatXof(wallet.totalBalance)} · Statut : ${wallet.status}`
                            : "Aucun wallet trouvé"}
                        </p>
                      </div>
                    </li>
                  </ul>
                </Card>
              </div>
            ),
          },

          // ── Courses ───────────────────────────────────────────────────
          {
            value: "rides",
            label: "Courses",
            badge:
              rides.length > 0
                ? { count: rides.length, tone: "primary" }
                : undefined,
            content:
              rides.length === 0 ? (
                <Card className="p-12 text-center text-sm text-[color:var(--muted-foreground)]">
                  Aucune course enregistrée pour ce passager.
                </Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                        <th className="px-5 py-2.5 font-medium">Course</th>
                        <th className="px-5 py-2.5 font-medium">Driver</th>
                        <th className="px-5 py-2.5 font-medium">Véhicule</th>
                        <th className="px-5 py-2.5 text-right font-medium">Prix</th>
                        <th className="px-5 py-2.5 font-medium">Date</th>
                        <th className="px-5 py-2.5 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rides.map((ride) => {
                        const meta = rideStatusMeta(ride.status);
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
                                {PAYMENT_METHOD_LABELS[ride.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? ride.paymentMethod}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              {ride.driver ? (
                                <span className="text-sm text-[color:var(--foreground)]">
                                  {fullParty(ride.driver)}
                                </span>
                              ) : (
                                <span className="text-xs italic text-[color:var(--muted-foreground)]">
                                  Non assigné
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-sm text-[color:var(--foreground)]">
                              {VEHICLE_TYPE_LABELS[ride.vehicleType as keyof typeof VEHICLE_TYPE_LABELS] ?? ride.vehicleType}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-sm text-[color:var(--foreground)]">
                              {formatXof(ride.pricing.finalPrice ?? ride.pricing.estimatedPrice)}
                            </td>
                            <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                              {formatDate(ride.createdAt)}
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone={meta.tone}>{meta.label}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              ),
          },

          // ── Livraisons ────────────────────────────────────────────────
          {
            value: "deliveries",
            label: "Livraisons",
            content: (
              <Card className="p-12 text-center text-sm text-[color:var(--muted-foreground)]">
                <Package className="mx-auto mb-3 size-8 opacity-40" />
                Aucune livraison enregistrée pour ce passager.
              </Card>
            ),
          },

          // ── Wallet ────────────────────────────────────────────────────
          {
            value: "wallet",
            label: "Wallet",
            content: wallet ? (
              <Card className="p-0">
                <div className="border-b border-[color:var(--border)] px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Solde total
                  </p>
                  <p className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
                    {formatXof(wallet.totalBalance)}
                  </p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[color:var(--border)] border-b border-[color:var(--border)]">
                  <div className="px-5 py-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Principal</p>
                    <p className="font-mono text-sm font-semibold text-[color:var(--foreground)]">
                      {formatXof(wallet.mainBalance)}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Bonus</p>
                    <p className="font-mono text-sm font-semibold text-[color:var(--foreground)]">
                      {formatXof(wallet.bonusBalance)}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Parrainage</p>
                    <p className="font-mono text-sm font-semibold text-[color:var(--foreground)]">
                      {formatXof(wallet.referralBalance)}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <InfoGrid
                    rows={[
                      { label: "Wallet ID", value: <span className="font-mono text-xs">{wallet.walletId}</span> },
                      { label: "Type", value: wallet.walletType },
                      {
                        label: "Statut",
                        value: (
                          <Badge tone={wallet.status === "ACTIVE" ? "success" : "warning"}>
                            {wallet.status}
                          </Badge>
                        ),
                      },
                      { label: "Créé le", value: formatDate(wallet.createdAt) },
                    ]}
                  />
                </div>
                <div className="border-t border-[color:var(--border)] px-5 py-4 text-center text-xs text-[color:var(--muted-foreground)]">
                  Historique des transactions non disponible via l&apos;API.
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center text-sm text-[color:var(--muted-foreground)]">
                <Banknote className="mx-auto mb-3 size-8 opacity-40" />
                Aucun wallet trouvé pour ce passager.
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
