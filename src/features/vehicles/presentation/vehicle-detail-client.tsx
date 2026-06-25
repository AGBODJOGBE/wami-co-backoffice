"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car as CarIcon,
  ExternalLink,
  FileText,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserCog,
  UserMinus,
  Wrench,
  WrenchIcon,
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
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { DevNote } from "@/shared/ui/dev-note";
import { Spinner } from "@/shared/ui/spinner";
import { DocumentsList } from "@/features/documents/presentation/documents-list";
import { fullName as driverFullName } from "@/features/drivers/domain/admin-driver";
import { fullName as adminFullName } from "@/features/auth/domain/entity/admin";
import type { AdminProfile } from "@/features/auth/domain/entity/admin";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import {
  daysUntil,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_STATUS_META,
  VEHICLE_TYPE_LABELS,
  type VehicleSummary,
} from "../domain/vehicle";
import {
  VehicleAssignModal,
  VehicleCategoryModal,
  VehicleEditModal,
  VehicleMaintenanceCompleteModal,
  VehicleRejectModal,
  VehicleSimpleConfirm,
  VehicleVerifyModal,
  type SimpleConfirmKind,
} from "./vehicle-modals";

function extractFileKey(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    return null;
  }
}

function VehicleDocCards({
  registrationCardUrl,
  insuranceUrl,
}: {
  registrationCardUrl: string | null;
  insuranceUrl: string | null;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function openFreshUrl(signedUrl: string, label: string) {
    const fileKey = extractFileKey(signedUrl);
    if (!fileKey) {
      window.open(signedUrl, "_blank");
      return;
    }
    setLoading(label);
    try {
      const res = await fetch(
        `/api/_proxy/documents/signed-url?key=${encodeURIComponent(fileKey)}`,
      );
      const json = await res.json();
      const freshUrl = json.data?.url ?? json.url;
      if (freshUrl) {
        window.open(freshUrl, "_blank");
      } else {
        window.open(signedUrl, "_blank");
      }
    } catch {
      window.open(signedUrl, "_blank");
    } finally {
      setLoading(null);
    }
  }

  const docs = [
    { url: registrationCardUrl, label: "Carte grise" },
    { url: insuranceUrl, label: "Assurance" },
  ].filter((d) => d.url);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {docs.map(({ url, label }) => (
        <button
          key={label}
          type="button"
          onClick={() => openFreshUrl(url!, label)}
          disabled={loading === label}
          className="group flex flex-col gap-2 rounded-lg border border-[color:var(--border)] p-3 text-left transition-colors hover:border-[color:var(--primary)] hover:bg-[color:var(--muted)]/40 disabled:opacity-60"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[color:var(--muted)]">
            <img src={url!} alt={label} className="size-full object-cover" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[color:var(--muted-foreground)]" />
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                {label}
              </span>
            </div>
            {loading === label ? (
              <span className="text-xs text-[color:var(--muted-foreground)]">Chargement…</span>
            ) : (
              <ExternalLink className="size-3.5 text-[color:var(--muted-foreground)] transition-colors group-hover:text-[color:var(--primary)]" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function insuranceLabel(iso: string | null) {
  const left = daysUntil(iso);
  if (left === null) return null;
  if (left < 0)
    return (
      <span className="font-medium text-[color:var(--danger)]">
        Expirée il y a {Math.abs(left)} j ({formatDate(iso)})
      </span>
    );
  if (left < 30)
    return (
      <span className="font-medium text-[color:var(--warning)]">
        {left} j restants ({formatDate(iso)})
      </span>
    );
  return (
    <span className="font-medium text-[color:var(--success)]">
      {left} j restants ({formatDate(iso)})
    </span>
  );
}

export interface VehicleDetailClientProps {
  vehicle: VehicleSummary;
  documents?: import("@/features/documents/domain/document").DocumentMetadata[];
  documentsError?: string;
  assignedDriver?: import("@/features/drivers/domain/admin-driver").AdminDriver;
  /** Map adminUserId → full AdminProfile. Lets us render rich info
   * (name + role + phone) for the connected admin, with a graceful
   * fallback for others until /api/admin/admins ships. */
  adminProfiles?: Record<string, AdminProfile>;
  /** userId of the connected admin — used to suffix "(vous)". */
  connectedAdminId?: string;
}

export function VehicleDetailClient({
  vehicle,
  documents = [],
  documentsError,
  assignedDriver,
  adminProfiles = {},
  connectedAdminId,
}: VehicleDetailClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [confirm, setConfirm] = useState<SimpleConfirmKind | null>(null);

  const status = VEHICLE_STATUS_META[vehicle.status];

  // Propriétaire row — meaningful instead of the cryptic "Driver" enum value.
  const ownerValue = (() => {
    if (vehicle.ownership === "PLATFORM") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="info">Plateforme 4U</Badge>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            (véhicule appartenant à la société)
          </span>
        </span>
      );
    }
    // DRIVER-owned
    if (assignedDriver) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="neutral">Driver</Badge>
          <a
            href={`/vtc/drivers/${assignedDriver.driverId}`}
            className="font-medium text-[color:var(--foreground)] hover:underline"
          >
            {driverFullName(assignedDriver)}
          </a>
        </span>
      );
    }
    if (vehicle.assignedToDriverId) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="neutral">Driver</Badge>
          <a
            href={`/vtc/drivers/${vehicle.assignedToDriverId}`}
            className="font-mono text-xs text-[color:var(--primary)] hover:underline"
          >
            #{vehicle.assignedToDriverId.slice(0, 8)}
          </a>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge tone="neutral">Driver</Badge>
        <span className="text-xs text-[color:var(--muted-foreground)]">
          (propriétaire non identifié — aucun driver rattaché)
        </span>
      </span>
    );
  })();

  const identityRows: InfoRow[] = [
    { label: "Type", value: VEHICLE_TYPE_LABELS[vehicle.type] },
    {
      label: "Plaque",
      value: <span className="font-mono uppercase">{vehicle.licensePlate}</span>,
    },
    { label: "Année", value: vehicle.year },
    { label: "Couleur", value: vehicle.color },
    { label: "Sièges", value: vehicle.seats },
    {
      label: "Catégorie active",
      value: vehicle.category ? VEHICLE_CATEGORY_LABELS[vehicle.category] : null,
    },
    {
      label: "Plafond vérifié",
      value: vehicle.verifiedCategory
        ? VEHICLE_CATEGORY_LABELS[vehicle.verifiedCategory]
        : null,
    },
    { label: "Propriétaire", value: ownerValue },
    {
      label: "Kilométrage",
      value: vehicle.mileage
        ? `${vehicle.mileage.toLocaleString("fr-FR")} km`
        : null,
    },
  ];

  const verifiedByValue: React.ReactNode = (() => {
    if (!vehicle.verifiedBy) return null;
    const profile = adminProfiles[vehicle.verifiedBy];
    if (profile) {
      const isMe = profile.userId === connectedAdminId;
      return (
        <AdminLozenge
          profile={profile}
          suffix={isMe ? "(vous)" : undefined}
        />
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="neutral">Admin externe</Badge>
          <CopyableId id={vehicle.verifiedBy} prefix="ID" />
        </span>
        <span className="text-[10px] text-[color:var(--muted-foreground)]">
          Détails indisponibles tant que <code>GET /api/admin/admins</code>{" "}
          n&apos;est pas exposé par le backend.
        </span>
      </div>
    );
  })();

  const lifecycleRows: InfoRow[] = [
    { label: "Vérifié", value: vehicle.isVerified ? "Oui" : "Non" },
    { label: "Vérifié le", value: formatDateTime(vehicle.verifiedAt) },
    { label: "Vérifié par", value: verifiedByValue },
    {
      label: "Prochaine maintenance",
      value: formatDateTime(vehicle.nextMaintenanceDate),
    },
    { label: "Créé le", value: formatDateTime(vehicle.createdAt) },
    { label: "Mis à jour le", value: formatDateTime(vehicle.updatedAt) },
  ];

  const insurance = insuranceLabel(vehicle.insuranceExpiryDate);

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        backHref="/vtc/vehicles"
        backLabel="Retour aux véhicules"
        eyebrow={`Véhicule · ${VEHICLE_TYPE_LABELS[vehicle.type]}`}
        title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono uppercase">{vehicle.licensePlate}</span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span>{vehicle.color}</span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span>
              {vehicle.seats} place{vehicle.seats > 1 ? "s" : ""}
            </span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <CopyableId id={vehicle.id} prefix="Véhicule" />
            {vehicle.assignedToDriverId ? (
              <CopyableId
                id={vehicle.assignedToDriverId}
                prefix="Driver"
              />
            ) : null}
          </div>
        }
        avatar={
          <div className="flex size-14 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
            <CarIcon className="size-7" />
          </div>
        }
        status={<Badge tone={status.tone}>{status.label}</Badge>}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              Modifier
            </Button>
            <DropdownMenu groups={buildMenuGroups()} />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Identité du véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={identityRows} columns={2} />
          </CardContent>
        </Card>

        <DriverAssignmentCard
          vehicle={vehicle}
          driver={assignedDriver}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cycle de vie</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoGrid rows={lifecycleRows} columns={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Documents (
                {documents.length > 0
                  ? documents.length
                  : [vehicle.registrationCardUrl, vehicle.insuranceUrl].filter(Boolean).length}
                )
              </CardTitle>
              {insurance ? (
                <span className="text-xs">Assurance : {insurance}</span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {documentsError ? (
              <p className="text-sm text-[color:var(--danger)]">
                {documentsError}
              </p>
            ) : documents.length > 0 ? (
              <DocumentsList
                documents={documents}
                pathHint={`/vtc/vehicles/${vehicle.id}`}
                emptyMessage="Aucun document uploadé pour ce véhicule."
                compact
              />
            ) : vehicle.registrationCardUrl || vehicle.insuranceUrl ? (
              <VehicleDocCards
                registrationCardUrl={vehicle.registrationCardUrl}
                insuranceUrl={vehicle.insuranceUrl}
              />

            ) : (
              <p className="py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                Aucun document uploadé pour ce véhicule.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <VehicleEditModal
        open={editOpen}
        vehicle={vehicle}
        onClose={() => setEditOpen(false)}
      />
      <VehicleVerifyModal
        open={verifyOpen}
        vehicle={vehicle}
        onClose={() => setVerifyOpen(false)}
      />
      <VehicleRejectModal
        open={rejectOpen}
        vehicle={vehicle}
        onClose={() => setRejectOpen(false)}
      />
      <VehicleAssignModal
        open={assignOpen}
        vehicle={vehicle}
        onClose={() => setAssignOpen(false)}
      />
      <VehicleCategoryModal
        open={categoryOpen}
        vehicle={vehicle}
        onClose={() => setCategoryOpen(false)}
      />
      <VehicleMaintenanceCompleteModal
        open={completeOpen}
        vehicle={vehicle}
        onClose={() => setCompleteOpen(false)}
      />
      <VehicleSimpleConfirm
        kind={confirm}
        vehicle={confirm ? vehicle : null}
        onClose={() => setConfirm(null)}
      />
    </div>
  );

  function buildMenuGroups() {
    const lifecycle: Array<{
      label: string;
      icon?: typeof Pencil;
      onSelect: () => void;
      danger?: boolean;
    }> = [];

    if (vehicle.status === "PENDING") {
      lifecycle.push(
        {
          label: "Vérifier",
          icon: ShieldCheck,
          onSelect: () => setVerifyOpen(true),
        },
        {
          label: "Rejeter",
          icon: ShieldX,
          onSelect: () => setRejectOpen(true),
        },
      );
    }
    lifecycle.push({
      label: "Changer la catégorie",
      icon: Pencil,
      onSelect: () => setCategoryOpen(true),
    });
    if (vehicle.ownership === "PLATFORM") {
      if (vehicle.status === "AVAILABLE") {
        lifecycle.push({
          label: "Assigner à un driver",
          icon: UserCog,
          onSelect: () => setAssignOpen(true),
        });
      }
      if (vehicle.status === "ASSIGNED") {
        lifecycle.push({
          label: "Désassigner",
          icon: UserMinus,
          onSelect: () => setConfirm("unassign"),
        });
      }
    }
    if (vehicle.status === "AVAILABLE") {
      lifecycle.push({
        label: "Mettre en maintenance",
        icon: Wrench,
        onSelect: () => setConfirm("startMaintenance"),
      });
    }
    if (vehicle.status === "MAINTENANCE") {
      lifecycle.push({
        label: "Terminer la maintenance",
        icon: WrenchIcon,
        onSelect: () => setCompleteOpen(true),
      });
    }
    return [
      { label: "Cycle de vie", items: lifecycle },
      {
        items: [
          {
            label: "Retirer définitivement",
            icon: AlertTriangle,
            onSelect: () => setConfirm("retire"),
            danger: true,
          },
          {
            label: "Supprimer",
            icon: Trash2,
            onSelect: () => setConfirm("delete"),
            danger: true,
          },
        ],
      },
    ];
  }
}

/**
 * Rich admin chip — avatar + name + role + phone. Used for "Vérifié par"
 * when we have the connected admin's profile in scope.
 */
function AdminLozenge({
  profile,
  suffix,
}: {
  profile: AdminProfile;
  suffix?: string;
}) {
  const name = adminFullName(profile);
  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={name} className="size-9 text-xs" />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-[color:var(--foreground)]">
          {name}
          {suffix ? (
            <span className="ml-1 text-xs text-[color:var(--muted-foreground)]">
              {suffix}
            </span>
          ) : null}
        </span>
        <span className="text-[11px] text-[color:var(--muted-foreground)]">
          {profile.role.displayName}
          {profile.department ? ` · ${profile.department}` : ""}
        </span>
        {profile.phone ? (
          <a
            href={`tel:${profile.phone}`}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-[color:var(--primary)] hover:underline"
          >
            <Phone className="size-3" />
            {profile.phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Driver assignment card. Uses the enriched profile from
 * GET /api/admin/drivers (matched by driverId) when available — falls
 * back to a discrete UUID chip when the lookup misses (driver removed).
 */
function DriverAssignmentCard({
  vehicle,
  driver,
}: {
  vehicle: VehicleSummary;
  driver?: import("@/features/drivers/domain/admin-driver").AdminDriver;
}) {
  if (!vehicle.assignedToDriverId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Driver assigné</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucun driver n&apos;est actuellement assigné à ce véhicule.
            </p>
            {vehicle.ownership === "PLATFORM" &&
            vehicle.status === "AVAILABLE" ? (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Utilise « Assigner à un driver » dans le menu ⋯ pour le rattacher.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = driver
    ? driverFullName(driver)
    : `Driver #${vehicle.assignedToDriverId.slice(0, 8)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver assigné</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} className="size-12 text-base" />
            <div className="flex flex-col leading-tight">
              <a
                href={`/vtc/drivers/${vehicle.assignedToDriverId}`}
                className="text-sm font-semibold text-[color:var(--foreground)] hover:underline"
              >
                {displayName}
              </a>
              {driver ? (
                <a
                  href={`tel:${driver.phoneNumber}`}
                  className="font-mono text-xs text-[color:var(--primary)] hover:underline"
                >
                  {driver.phoneNumber}
                </a>
              ) : null}
            </div>
          </div>

          {driver ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-[color:var(--muted)]/40 p-3 text-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  Note
                </span>
                <span className="text-sm font-semibold">
                  ★ {driver.rating.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-col border-x border-[color:var(--border)]">
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  Courses
                </span>
                <span className="text-sm font-semibold">
                  {driver.totalRides}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  Catégorie
                </span>
                <span className="text-sm font-semibold">
                  {driver.category}
                </span>
              </div>
            </div>
          ) : null}

          <dl className="grid grid-cols-1 gap-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--muted-foreground)]">
                Assigné le
              </dt>
              <dd>{formatDateTime(vehicle.assignedAt)}</dd>
            </div>
            {driver ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[color:var(--muted-foreground)]">
                  Inscrit le
                </dt>
                <dd>{formatDate(driver.createdAt)}</dd>
              </div>
            ) : null}
          </dl>

          {!driver ? (
            <DevNote>
              Profil enrichi non trouvé dans{" "}
              <code>GET /api/admin/drivers</code> — fallback sur l&apos;UUID.
            </DevNote>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
