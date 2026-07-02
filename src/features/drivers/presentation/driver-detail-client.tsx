"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Car as CarIcon,
  History,
  MapPin,
  Phone,
  RefreshCw,
  ShieldX,
  Star,
  UserCircle,
  Wallet,
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
import { DevNote } from "@/shared/ui/dev-note";
import { Spinner } from "@/shared/ui/spinner";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import {
  DriverInlineActionButton,
  SuspendDriverModal,
  type DriverTarget,
} from "./driver-action-modals";
import {
  ADMIN_DRIVER_STATUS_META,
  fullName,
  type AdminDriver,
  type AdminDriverStatus,
  type OnlineDriver,
} from "../domain/admin-driver";
import {
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_OWNERSHIP_LABELS,
  VEHICLE_STATUS_META,
  VEHICLE_TYPE_LABELS,
  type VehicleSummary,
} from "@/features/vehicles/domain/vehicle";
import { DocumentsList } from "@/features/documents/presentation/documents-list";
import type { DocumentMetadata } from "@/features/documents/domain/document";
import type { AdminWallet } from "@/features/wallet/domain/wallet";
import {
  fullParty,
  rideStatusMeta,
  type AdminRide,
} from "@/features/rides/domain/admin-ride";

export interface DriverDetailClientProps {
  driverId: string;
  userId: string;
  category: string;
  isDocumentsVerified: boolean;
  createdAt: string;
  status?: AdminDriverStatus;
  vehicles: VehicleSummary[];
  documents: DocumentMetadata[];
  documentsError?: string;
  vehiclesError?: string;
  /** Rich profile from GET /admin/drivers. When present, we show name/
   * phone/photo/rating/totalRides instead of the UUID-only fallback. */
  enriched?: AdminDriver;
  /** Real-time presence — when present the driver is online (GPS + ride). */
  online?: OnlineDriver;
  /** Driver wallet — from GET /admin/wallets matched by profileId. */
  wallet?: AdminWallet;
  /** Recent rides where this driver is the assigned driver. */
  recentRides?: AdminRide[];
}

export function DriverDetailClient({
  driverId,
  userId,
  category,
  isDocumentsVerified,
  createdAt,
  status = "PENDING",
  vehicles,
  documents,
  documentsError,
  vehiclesError,
  enriched,
  online,
  wallet,
  recentRides = [],
}: DriverDetailClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [suspendTarget, setSuspendTarget] = useState<DriverTarget | null>(null);
  const statusMeta = ADMIN_DRIVER_STATUS_META[status];

  const displayName = enriched
    ? fullName(enriched)
    : `Driver #${driverId.slice(0, 8)}`;
  const headerAvatar = enriched ? (
    <Avatar name={displayName} className="size-14 text-base" />
  ) : (
    <div className="flex size-14 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
      <UserCircle className="size-7" />
    </div>
  );

  const identityRows: InfoRow[] = enriched
    ? [
        {
          label: "Téléphone",
          value: (
            <a
              href={`tel:${enriched.phoneNumber}`}
              className="inline-flex items-center gap-1 font-mono text-sm text-[color:var(--primary)] hover:underline"
            >
              <Phone className="size-3" />
              {enriched.phoneNumber}
            </a>
          ),
        },
        {
          label: "Catégorie",
          value: (
            <span>
              {enriched.category}{" "}
              <Badge tone="info" className="ml-1">
                {enriched.driverType}
              </Badge>
            </span>
          ),
        },
        {
          label: "Note",
          value: (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-[color:var(--warning)] text-[color:var(--warning)]" />
              {enriched.rating.toFixed(2)}
            </span>
          ),
        },
        {
          label: "Courses totales",
          value: (recentRides.length > enriched.totalRides
            ? recentRides.length
            : enriched.totalRides
          ).toLocaleString("fr-FR"),
        },
        {
          label: "Documents vérifiés",
          value: enriched.isApproved ? (
            <Badge tone="success">Oui</Badge>
          ) : (
            <Badge tone="warning">Non</Badge>
          ),
        },
        {
          label: "Véhicule propriétaire",
          value: enriched.isVehicleOwner ? "Oui" : "Non",
        },
        { label: "Inscrit le", value: formatDateTime(enriched.createdAt) },
      ]
    : [
        { label: "Catégorie", value: category },
        {
          label: "Documents vérifiés",
          value: isDocumentsVerified ? (
            <Badge tone="success">Oui</Badge>
          ) : (
            <Badge tone="warning">Non</Badge>
          ),
        },
        { label: "Inscrit le", value: formatDateTime(createdAt) },
      ];

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/vtc/drivers"
        backLabel="Retour aux drivers"
        eyebrow={enriched ? `Driver · ${enriched.driverType}` : "Driver"}
        title={displayName}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <CopyableId id={driverId} prefix="Driver" />
            <CopyableId id={userId} prefix="User" />
            {enriched ? (
              <>
                <span className="text-[color:var(--muted-foreground)]">·</span>
                <a
                  href={`tel:${enriched.phoneNumber}`}
                  className="inline-flex items-center gap-1 text-[color:var(--primary)] hover:underline"
                >
                  <Phone className="size-3" />
                  {enriched.phoneNumber}
                </a>
              </>
            ) : null}
            {online ? (
              <>
                <span className="text-[color:var(--muted-foreground)]">·</span>
                <span className="inline-flex items-center gap-1 text-[color:var(--success)]">
                  <MapPin className="size-3" />
                  En ligne · {online.latitude.toFixed(4)},{" "}
                  {online.longitude.toFixed(4)}
                </span>
              </>
            ) : null}
          </div>
        }
        avatar={headerAvatar}
        status={
          <div className="flex items-center gap-2">
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            {online?.isInRide ? (
              <Badge tone="primary">En course</Badge>
            ) : null}
          </div>
        }
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
            {status === "PENDING" || status === "OFFLINE" ? (
              <DriverInlineActionButton
                driverId={driverId}
                action="approve"
                label="Approuver"
                size="sm"
              />
            ) : null}
            {status === "SUSPENDED" ? (
              <DriverInlineActionButton
                driverId={driverId}
                action="reactivate"
                label="Réactiver"
                size="sm"
                variant="primary"
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSuspendTarget({
                    driverId,
                    label: displayName,
                  })
                }
              >
                <ShieldX className="size-4" />
                Suspendre
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={identityRows} columns={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Véhicules ({vehicles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesError ? (
              <p className="text-sm text-[color:var(--danger)]">
                {vehiclesError}
              </p>
            ) : vehicles.length === 0 ? (
              enriched?.vehicle ? (
                <ul className="flex flex-col gap-1 py-2">
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/vtc/vehicles/${enriched.vehicle!.vehicleId}`)
                      }
                      className="text-sm font-medium text-[color:var(--foreground)] hover:underline"
                    >
                      {enriched.vehicle.make} {enriched.vehicle.model}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                      <span className="font-mono uppercase">
                        {enriched.vehicle.licensePlate}
                      </span>
                      <span>·</span>
                      <span>{enriched.vehicle.vehicleType}</span>
                      <span>·</span>
                      <span>{enriched.vehicle.color}</span>
                    </div>
                  </li>
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CarIcon className="size-8 text-[color:var(--muted-foreground)]" />
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    Aucun véhicule rattaché
                  </p>
                </div>
              )
            ) : (
              <ul className="flex flex-col divide-y divide-[color:var(--border)]">
                {vehicles.map((v) => {
                  const sm = VEHICLE_STATUS_META[v.status];
                  return (
                    <li
                      key={v.id}
                      className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/vtc/vehicles/${v.id}`)}
                          className="text-sm font-medium text-[color:var(--foreground)] hover:underline"
                        >
                          {v.make} {v.model} {v.year}
                        </button>
                        <Badge tone={sm.tone}>{sm.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                        <span className="font-mono uppercase">
                          {v.licensePlate}
                        </span>
                        <span>·</span>
                        <span>{VEHICLE_TYPE_LABELS[v.type]}</span>
                        {v.category ? (
                          <>
                            <span>·</span>
                            <span>{VEHICLE_CATEGORY_LABELS[v.category]}</span>
                          </>
                        ) : null}
                        <span>·</span>
                        <span>{VEHICLE_OWNERSHIP_LABELS[v.ownership]}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documents ({documents.length})</CardTitle>
            {documents.some((d) => d.status === "PENDING") ? (
              <Badge tone="warning">
                {documents.filter((d) => d.status === "PENDING").length} à
                vérifier
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {documentsError ? (
            <p className="text-sm text-[color:var(--danger)]">
              {documentsError}
            </p>
          ) : (
            <DocumentsList
              documents={documents}
              pathHint={`/vtc/drivers/${driverId}`}
              emptyMessage="Le driver n'a pas encore uploadé de documents."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Wallet */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Wallet</CardTitle>
              {wallet ? (
                <Badge tone={wallet.status === "ACTIVE" ? "success" : "neutral"}>
                  {wallet.status}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {wallet ? (
              <dl className="flex flex-col gap-2 text-sm">
                <Row
                  label="Solde principal"
                  value={
                    <strong className="text-[color:var(--foreground)]">
                      {formatXof(wallet.mainBalance)}
                    </strong>
                  }
                />
                <Row
                  label="Bonus"
                  value={formatXof(wallet.bonusBalance)}
                />
                <Row
                  label="Parrainage"
                  value={formatXof(wallet.referralBalance)}
                />
                <div className="border-t border-[color:var(--border)] pt-2">
                  <Row
                    label={
                      <span className="text-[color:var(--foreground)]">
                        Total
                      </span>
                    }
                    value={
                      <strong className="text-[color:var(--foreground)]">
                        {formatXof(wallet.totalBalance)}
                      </strong>
                    }
                  />
                </div>
                <Row
                  label="Wallet ID"
                  value={<CopyableId id={wallet.walletId} prefix="Wallet" />}
                />
                <Row
                  label="Créé le"
                  value={
                    <span className="text-xs">
                      {formatDateTime(wallet.createdAt)}
                    </span>
                  }
                />
              </dl>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Wallet className="size-8 text-[color:var(--muted-foreground)]" />
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Aucun wallet rattaché à ce profil.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent rides */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Dernières courses ({recentRides.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentRides.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <History className="size-8 text-[color:var(--muted-foreground)]" />
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  Aucune course récente pour ce driver.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-[color:var(--border)]">
                {recentRides.map((r) => {
                  const meta = rideStatusMeta(r.status);
                  return (
                    <li
                      key={r.rideId}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-col leading-tight">
                        <span className="font-mono text-xs font-semibold">
                          {r.rideNumber}
                        </span>
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          {fullParty(r.passenger)} · {r.vehicleType}
                        </span>
                        <span className="text-[10px] text-[color:var(--muted-foreground)]">
                          {formatDateTime(r.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="text-sm font-semibold text-[color:var(--foreground)]">
                          {formatXof(r.pricing.finalPrice || r.pricing.estimatedPrice)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {!enriched ? (
        <DevNote>
          Profil enrichi non trouvé dans <code>GET /api/admin/drivers</code> —
          affichage des seuls IDs et métadonnées passées par la liste.
        </DevNote>
      ) : null}

      <SuspendDriverModal
        open={!!suspendTarget}
        target={suspendTarget}
        onClose={() => setSuspendTarget(null)}
      />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
