"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Calendar,
  Car as CarIcon,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Star,
  TrendingUp,
  UserCircle,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DetailHeader, DetailNotFound } from "@/shared/ui/detail-header";
import { CopyableId } from "@/shared/ui/copy-button";
import { Spinner } from "@/shared/ui/spinner";
import { formatDate, formatDateTime, formatXof } from "@/shared/lib/format";
import { PAYMENT_METHOD_LABELS, VEHICLE_TYPE_LABELS } from "@/features/rides/domain/ride";
import { fullParty, rideStatusMeta, type AdminRide } from "@/features/rides/domain/admin-ride";
import type { AdminWallet } from "@/features/wallet/domain/wallet";
import type { PassengerRow } from "./store";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PassengerDetailPageProps {
  passengerId: string;
  passenger: PassengerRow | null;
  rides: AdminRide[];
  wallet: AdminWallet | null;
}

// ─── MiniStat ─────────────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        accent
          ? "border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5"
          : "border-[color:var(--border)] bg-[color:var(--background)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          {label}
        </p>
        {Icon && (
          <Icon
            className={`size-4 ${accent ? "text-[color:var(--primary)]" : "text-[color:var(--muted-foreground)]"}`}
          />
        )}
      </div>
      <div className="mt-1.5 text-sm font-bold text-[color:var(--foreground)]">{value}</div>
      {sub && (
        <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">{sub}</p>
      )}
    </div>
  );
}

// ─── InfoCell ─────────────────────────────────────────────────────────────────

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {label}
      </span>
      <span className="text-sm text-[color:var(--foreground)]">{children}</span>
    </div>
  );
}

// ─── WalletCard ───────────────────────────────────────────────────────────────

function WalletCard({ wallet, fallbackBalance }: { wallet: AdminWallet | null; fallbackBalance: number }) {
  if (!wallet) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-[color:var(--muted)]">
            <Wallet className="size-5 text-[color:var(--muted-foreground)]" />
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun wallet rattaché</p>
        </div>
        {fallbackBalance > 0 && (
          <div className="rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Solde estimé (profil)
            </p>
            <p className="text-lg font-bold tabular-nums text-[color:var(--foreground)]">
              {formatXof(fallbackBalance)}
            </p>
          </div>
        )}
      </div>
    );
  }

  const total = wallet.totalBalance;
  const pctMain = total > 0 ? (wallet.mainBalance / total) * 100 : 0;
  const pctBonus = total > 0 ? (wallet.bonusBalance / total) * 100 : 0;
  const pctRef = total > 0 ? (wallet.referralBalance / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Solde total
          </span>
          <span className="text-2xl font-bold tabular-nums text-[color:var(--foreground)]">
            {formatXof(total)}
          </span>
        </div>
        <Badge tone={wallet.status === "ACTIVE" ? "success" : "neutral"}>
          {wallet.status === "ACTIVE" ? "Actif" : wallet.status}
        </Badge>
      </div>

      {total > 0 && (
        <div className="flex h-2 w-full overflow-hidden rounded-full">
          <div className="bg-[color:var(--primary)]" style={{ width: `${pctMain}%` }} />
          <div className="bg-[color:var(--warning)]" style={{ width: `${pctBonus}%` }} />
          <div className="bg-emerald-500" style={{ width: `${pctRef}%` }} />
        </div>
      )}

      <dl className="flex flex-col gap-2 text-sm">
        {[
          { label: "Principal", value: wallet.mainBalance, color: "bg-[color:var(--primary)]" },
          { label: "Bonus", value: wallet.bonusBalance, color: "bg-[color:var(--warning)]" },
          { label: "Parrainage", value: wallet.referralBalance, color: "bg-emerald-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
              <span className={`size-2 rounded-full ${color}`} />
              {label}
            </dt>
            <dd className="font-medium tabular-nums">{formatXof(value)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-[11px] text-[color:var(--muted-foreground)]">
        <CopyableId id={wallet.walletId} prefix="Wallet" />
        <span>{formatDate(wallet.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── RidesTable ───────────────────────────────────────────────────────────────

function RidesTable({ rides, onRideClick }: { rides: AdminRide[]; onRideClick: (id: string) => void }) {
  if (rides.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
          <CarIcon className="size-5 text-[color:var(--muted-foreground)]" />
        </div>
        <p className="text-sm text-[color:var(--muted-foreground)]">Aucune course enregistrée</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)] text-left">
            <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Course
            </th>
            <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Trajet
            </th>
            <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Driver
            </th>
            <th className="pb-2.5 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Montant
            </th>
            <th className="pb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Statut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {rides.map((ride) => {
            const meta = rideStatusMeta(ride.status);
            const price = ride.pricing.finalPrice ?? ride.pricing.estimatedPrice;

            return (
              <tr
                key={ride.rideId}
                onClick={() => onRideClick(ride.rideId)}
                className="cursor-pointer transition-colors hover:bg-[color:var(--muted)]/40"
              >
                <td className="py-3 pr-4">
                  <p className="font-mono text-xs font-bold text-[color:var(--primary)]">
                    {ride.rideNumber}
                  </p>
                  <p className="text-[10px] text-[color:var(--muted-foreground)]">
                    {VEHICLE_TYPE_LABELS[ride.vehicleType as keyof typeof VEHICLE_TYPE_LABELS] ??
                      ride.vehicleType}
                    {" · "}
                    {PAYMENT_METHOD_LABELS[ride.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ??
                      ride.paymentMethod}
                  </p>
                  <p className="text-[10px] text-[color:var(--muted-foreground)]">
                    {formatDate(ride.createdAt)}
                  </p>
                </td>
                <td className="max-w-[200px] py-3 pr-4">
                  {ride.pickup?.address && (
                    <p className="flex items-center gap-1 truncate text-xs text-[color:var(--muted-foreground)]">
                      <MapPin className="size-3 flex-shrink-0 text-emerald-500" />
                      <span className="truncate">{ride.pickup.address}</span>
                    </p>
                  )}
                  {ride.dropoff?.address && (
                    <p className="flex items-center gap-1 truncate text-xs text-[color:var(--muted-foreground)]">
                      <MapPin className="size-3 flex-shrink-0 text-[color:var(--danger)]" />
                      <span className="truncate">{ride.dropoff.address}</span>
                    </p>
                  )}
                  {!ride.pickup?.address && !ride.dropoff?.address && (
                    <span className="text-xs italic text-[color:var(--muted-foreground)]">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {ride.driver ? (
                    <span className="text-xs text-[color:var(--foreground)]">
                      {fullParty(ride.driver)}
                    </span>
                  ) : (
                    <span className="text-xs italic text-[color:var(--muted-foreground)]">
                      Non assigné
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className="font-mono text-sm font-bold tabular-nums text-[color:var(--foreground)]">
                    {formatXof(price)}
                  </span>
                  {ride.pricing.discountAmount ? (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      -{formatXof(ride.pricing.discountAmount)}
                    </p>
                  ) : null}
                </td>
                <td className="py-3">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── PassengerDetailPage ──────────────────────────────────────────────────────

export function PassengerDetailPage({
  passengerId,
  passenger,
  rides,
  wallet,
}: PassengerDetailPageProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  if (!passenger) {
    return (
      <DetailNotFound
        backHref="/vtc/passengers"
        backLabel="Retour aux passagers"
        message="Passager introuvable. Le compte a peut-être été supprimé."
      />
    );
  }

  const walletBalance = wallet?.totalBalance ?? passenger.walletBalance;
  const totalRides = rides.length > 0 ? rides.length : passenger.totalRides;

  const totalSpent = rides
    .filter((r) => r.status === "COMPLETED" || r.status === "RATED")
    .reduce((sum, r) => sum + (r.pricing.finalPrice ?? r.pricing.estimatedPrice), 0);

  const completedRides = rides.filter(
    (r) => r.status === "COMPLETED" || r.status === "RATED",
  ).length;

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
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <DetailHeader
        backHref="/vtc/passengers"
        backLabel="Retour aux passagers"
        eyebrow="Client passager"
        title={passenger.fullName}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <a
              href={`tel:${passenger.phone}`}
              className="inline-flex items-center gap-1 text-[color:var(--primary)] hover:underline"
            >
              <Phone className="size-3" />
              {passenger.phone}
            </a>
            {passenger.email && (
              <span className="inline-flex items-center gap-1 text-[color:var(--muted-foreground)]">
                <Mail className="size-3" />
                {passenger.email}
              </span>
            )}
            {passenger.city && (
              <span className="inline-flex items-center gap-1 text-[color:var(--muted-foreground)]">
                <MapPin className="size-3" />
                {passenger.city}
              </span>
            )}
            {registeredAgo && registeredAgo !== "—" && (
              <span className="inline-flex items-center gap-1 text-[color:var(--muted-foreground)]">
                <Calendar className="size-3" />
                Inscrit {registeredAgo}
              </span>
            )}
          </div>
        }
        avatar={
          <Avatar name={passenger.fullName} className="size-14 text-base" />
        }
        status={
          passenger.isSuspended ? (
            <Badge tone="danger">Suspendu</Badge>
          ) : (
            <Badge tone="success">Actif</Badge>
          )
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
          </>
        }
      />

      {/* ── Suspension alert ─────────────────────────────────────────────────── */}
      {passenger.isSuspended && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/8 px-4 py-3">
          <AlertTriangle className="size-5 flex-shrink-0 text-[color:var(--danger)]" />
          <p className="text-sm font-semibold text-[color:var(--danger)]">
            Ce compte est suspendu — le passager ne peut pas commander de courses.
          </p>
        </div>
      )}

      {/* ── KPI stats ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Wallet"
          value={<span className="tabular-nums">{formatXof(walletBalance)}</span>}
          sub={wallet ? `${wallet.walletType} · ${wallet.status}` : "solde profil"}
          icon={Wallet}
          accent={walletBalance > 0}
        />
        <MiniStat
          label="Courses totales"
          value={totalRides.toLocaleString("fr-FR")}
          sub={`${completedRides} terminée${completedRides > 1 ? "s" : ""}`}
          icon={CarIcon}
        />
        <MiniStat
          label="Dépenses totales"
          value={<span className="tabular-nums">{totalSpent > 0 ? formatXof(totalSpent) : "—"}</span>}
          sub={totalSpent > 0 ? "courses terminées" : "aucune course terminée"}
          icon={CreditCard}
        />
        <MiniStat
          label="Note moyenne"
          value={
            passenger.rating > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                {passenger.rating.toFixed(1)}
              </span>
            ) : (
              <span className="text-[color:var(--muted-foreground)]">—</span>
            )
          }
          sub="note donnée aux drivers"
          icon={Star}
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left — Identité + Courses ──────────────────────── */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Identité */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircle className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Identité</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <InfoCell label="Nom complet">
                  <span className="font-medium">{passenger.fullName}</span>
                </InfoCell>
                <InfoCell label="Téléphone">
                  <a
                    href={`tel:${passenger.phone}`}
                    className="inline-flex items-center gap-1 font-mono text-[color:var(--primary)] hover:underline"
                  >
                    <Phone className="size-3" />
                    {passenger.phone}
                  </a>
                </InfoCell>
                <InfoCell label="Email">
                  {passenger.email ? (
                    <a
                      href={`mailto:${passenger.email}`}
                      className="inline-flex items-center gap-1 font-mono text-[color:var(--primary)] hover:underline"
                    >
                      <Mail className="size-3" />
                      {passenger.email}
                    </a>
                  ) : (
                    <span className="text-[color:var(--muted-foreground)]">—</span>
                  )}
                </InfoCell>
                <InfoCell label="Ville">
                  {passenger.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3 text-[color:var(--muted-foreground)]" />
                      {passenger.city}
                    </span>
                  ) : (
                    <span className="text-[color:var(--muted-foreground)]">—</span>
                  )}
                </InfoCell>
                <InfoCell label="Statut">
                  {passenger.isSuspended ? (
                    <Badge tone="danger">Suspendu</Badge>
                  ) : (
                    <Badge tone="success">Actif</Badge>
                  )}
                </InfoCell>
                <InfoCell label="Inscrit le">
                  {passenger.createdAt
                    ? formatDateTime(passenger.createdAt)
                    : passenger.registeredAgo}
                </InfoCell>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--border)] pt-4">
                <CopyableId id={passenger.passengerId} prefix="Passager" />
              </div>
            </CardContent>
          </Card>

          {/* Courses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-[color:var(--primary)]" />
                  <CardTitle>Courses ({rides.length})</CardTitle>
                </div>
                {completedRides > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    {completedRides} terminée{completedRides > 1 ? "s" : ""}
                    {totalSpent > 0 && ` · ${formatXof(totalSpent)}`}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <RidesTable
                rides={rides}
                onRideClick={(id) => router.push(`/vtc/rides/${id}`)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right — Wallet + Activité + Cycle de vie ──────── */}
        <div className="flex flex-col gap-6">
          {/* Wallet */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Wallet</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <WalletCard wallet={wallet} fallbackBalance={passenger.walletBalance} />
            </CardContent>
          </Card>

          {/* Activité */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Activité</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {/* VTC */}
                <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] px-3 py-2.5">
                  <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10">
                    <CarIcon className="size-4 text-[color:var(--primary)]" />
                  </div>
                  <div className="flex-1 leading-tight">
                    <p className="text-sm font-medium text-[color:var(--foreground)]">
                      Courses VTC
                    </p>
                    <p className="text-[11px] text-[color:var(--muted-foreground)]">
                      {rides.length} enregistrée{rides.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {rides.length > 0 && (
                    <Badge tone="primary">{rides.length}</Badge>
                  )}
                </div>

                {/* Livraisons B2C */}
                <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] px-3 py-2.5 opacity-60">
                  <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--muted)]">
                    <Package className="size-4 text-[color:var(--muted-foreground)]" />
                  </div>
                  <div className="flex-1 leading-tight">
                    <p className="text-sm font-medium text-[color:var(--foreground)]">
                      Livraisons B2C
                    </p>
                    <p className="text-[11px] text-[color:var(--muted-foreground)]">
                      Non disponible via l&apos;API
                    </p>
                  </div>
                </div>

                {/* Paiements */}
                <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] px-3 py-2.5">
                  <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10">
                    <Banknote className="size-4 text-[color:var(--primary)]" />
                  </div>
                  <div className="flex-1 leading-tight">
                    <p className="text-sm font-medium text-[color:var(--foreground)]">
                      Dépenses totales
                    </p>
                    <p className="text-[11px] font-semibold text-[color:var(--foreground)]">
                      {totalSpent > 0 ? formatXof(totalSpent) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cycle de vie */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Cycle de vie</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col divide-y divide-[color:var(--border)]">
                {[
                  {
                    label: "Passenger ID",
                    value: <CopyableId id={passenger.passengerId} prefix="" />,
                  },
                  {
                    label: "Statut",
                    value: passenger.isSuspended ? (
                      <Badge tone="danger">Suspendu</Badge>
                    ) : (
                      <Badge tone="success">Actif</Badge>
                    ),
                  },
                  {
                    label: "Inscrit le",
                    value: passenger.createdAt
                      ? formatDateTime(passenger.createdAt)
                      : registeredAgo,
                  },
                  {
                    label: "Dernière activité",
                    value: passenger.lastActivity ?? "—",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                      {row.label}
                    </dt>
                    <dd className="text-sm text-[color:var(--foreground)]">
                      {row.value as React.ReactNode}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
