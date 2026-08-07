"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Car as CarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gauge,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Star,
  TrendingDown,
  Trash2,
  UserCog,
  UserMinus,
  Wrench,
  WrenchIcon,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { usePermissions } from "@/features/auth/presentation/use-permissions";
import { CanView } from "@/shared/ui/can-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DetailHeader, type InfoRow } from "@/shared/ui/detail-header";
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
  type MaintenanceRecord,
  type CurrentMaintenance,
} from "../domain/vehicle";
import {
  VehicleAssignModal,
  VehicleCategoryModal,
  VehicleEditModal,
  VehicleMaintenanceCompleteModal,
  VehicleMaintenanceStartModal,
  VehicleRejectModal,
  VehicleSimpleConfirm,
  VehicleVerifyModal,
  type SimpleConfirmKind,
} from "./vehicle-modals";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtFcfa(n: number) {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function extractFileKey(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    return null;
  }
}

// ─── InsuranceStatus ─────────────────────────────────────────────────────────

function InsuranceBanner({ iso }: { iso: string | null }) {
  const left = daysUntil(iso);
  if (left === null) return null;

  if (left < 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-4 py-3">
        <AlertTriangle className="size-5 flex-shrink-0 text-[color:var(--danger)]" />
        <div>
          <p className="text-sm font-semibold text-[color:var(--danger)]">
            Assurance expirée depuis {Math.abs(left)} jour{Math.abs(left) > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-[color:var(--danger)]/80">
            Date d&apos;expiration : {formatDate(iso)} — Ce véhicule ne peut pas opérer.
          </p>
        </div>
      </div>
    );
  }

  if (left < 30) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-4 py-3">
        <CalendarClock className="size-5 flex-shrink-0 text-[color:var(--warning)]" />
        <div>
          <p className="text-sm font-semibold text-[color:var(--warning)]">
            Assurance expire dans {left} jour{left > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-[color:var(--warning)]/80">
            Renouveler avant le {formatDate(iso)} pour éviter toute interruption.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── MaintenanceBanner ────────────────────────────────────────────────────────

function MaintenanceBanner({ m }: { m: CurrentMaintenance }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--primary)]/30 bg-[color:var(--muted)]/30 px-4 py-3">
      <Wrench className="size-5 flex-shrink-0 text-[color:var(--primary)]" />
      <div>
        <p className="text-sm font-semibold text-[color:var(--foreground)]">
          En maintenance depuis le {formatDate(m.startedAt)}
        </p>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Motif : {m.reason}
          {m.estimatedCost ? ` · Coût estimé : ${fmtFcfa(m.estimatedCost)}` : ""}
        </p>
      </div>
    </div>
  );
}

// ─── KPI mini card ────────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          {label}
        </p>
        {Icon && <Icon className="size-4 text-[color:var(--muted-foreground)]" />}
      </div>
      <div className="mt-1.5 text-sm font-bold text-[color:var(--foreground)]">{value}</div>
      {sub && <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">{sub}</p>}
    </div>
  );
}

// ─── VehicleDocCards ──────────────────────────────────────────────────────────
// Les registrationCardUrl / insuranceUrl sont des presigned URLs R2 qui expirent.
// On ne les affiche jamais directement — on rafraîchit via le proxy au clic.

function VehicleDocCards({
  registrationCardUrl,
  insuranceUrl,
}: {
  registrationCardUrl: string | null;
  insuranceUrl: string | null;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function openDoc(rawUrl: string, label: string) {
    setLoading(label);
    try {
      // Tenter d'obtenir une URL fraîche : extraire la clé R2 du pathname
      const fileKey = extractFileKey(rawUrl);
      if (fileKey) {
        const res = await fetch(
          `/api/_proxy/documents/signed-url?key=${encodeURIComponent(fileKey)}`,
        );
        if (res.ok) {
          const json = await res.json();
          const freshUrl =
            json?.data?.url ?? json?.data?.signedUrl ?? json?.url ?? json?.signedUrl;
          if (freshUrl) {
            window.open(freshUrl, "_blank");
            return;
          }
        }
      }
      // Fallback : ouvrir l'URL stockée telle quelle
      window.open(rawUrl, "_blank");
    } catch {
      window.open(rawUrl, "_blank");
    } finally {
      setLoading(null);
    }
  }

  const docs = [
    { url: registrationCardUrl, label: "Carte grise",  icon: FileText },
    { url: insuranceUrl,        label: "Assurance",    icon: ShieldCheck },
  ].filter((d): d is { url: string; label: string; icon: typeof FileText } => !!d.url);

  if (docs.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {docs.map(({ url, label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => openDoc(url, label)}
          disabled={loading === label}
          className="group flex items-center gap-3 rounded-xl border border-[color:var(--border)] px-4 py-3 text-left transition-all hover:border-[color:var(--primary)]/50 hover:bg-[color:var(--muted)]/30 disabled:opacity-60"
        >
          <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10">
            <Icon className="size-5 text-[color:var(--primary)]" />
          </div>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">{label}</span>
            <span className="text-[11px] text-[color:var(--muted-foreground)]">
              Cliquer pour ouvrir
            </span>
          </div>
          {loading === label ? (
            <Spinner size="sm" />
          ) : (
            <ExternalLink className="size-4 flex-shrink-0 text-[color:var(--muted-foreground)] transition-colors group-hover:text-[color:var(--primary)]" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── CategoryBar ──────────────────────────────────────────────────────────────

function CategoryBar({
  active,
  ceiling,
}: {
  active: string | null;
  ceiling: string | null;
}) {
  const order = ["ECO", "STANDARD", "PREMIUM", "VIP"];
  const activeIdx = active ? order.indexOf(active) : -1;
  const ceilingIdx = ceiling ? order.indexOf(ceiling) : -1;

  return (
    <div className="flex items-center gap-1">
      {order.map((cat, i) => {
        const isActive = i === activeIdx;
        const isCeiling = i === ceilingIdx;
        const isAllowed = i <= ceilingIdx;

        return (
          <div key={cat} className="flex flex-col items-center gap-1">
            <div
              className={`h-2 w-10 rounded-full transition-colors ${
                isActive
                  ? "bg-[color:var(--primary)]"
                  : isAllowed
                    ? "bg-[color:var(--primary)]/25"
                    : "bg-[color:var(--muted)]"
              }`}
            />
            <span
              className={`text-[9px] font-semibold uppercase tracking-wide ${
                isActive
                  ? "text-[color:var(--primary)]"
                  : isCeiling
                    ? "text-[color:var(--muted-foreground)]"
                    : "text-[color:var(--muted-foreground)]/50"
              }`}
            >
              {VEHICLE_CATEGORY_LABELS[cat as keyof typeof VEHICLE_CATEGORY_LABELS] ?? cat}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── AdminLozenge ─────────────────────────────────────────────────────────────

function AdminLozenge({ profile, suffix }: { profile: AdminProfile; suffix?: string }) {
  const name = adminFullName(profile);
  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={name} className="size-9 text-xs" />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-[color:var(--foreground)]">
          {name}
          {suffix && <span className="ml-1 text-xs text-[color:var(--muted-foreground)]">{suffix}</span>}
        </span>
        <span className="text-[11px] text-[color:var(--muted-foreground)]">
          {profile.role.displayName}
          {profile.department ? ` · ${profile.department}` : ""}
        </span>
        {profile.phone && (
          <a
            href={`tel:${profile.phone}`}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-[color:var(--primary)] hover:underline"
          >
            <Phone className="size-3" />
            {profile.phone}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── DriverAssignmentCard ─────────────────────────────────────────────────────

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
          <div className="flex items-center gap-2">
            <UserCog className="size-4 text-[color:var(--muted-foreground)]" />
            <CardTitle>Pilote assigné</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
              <UserMinus className="size-5 text-[color:var(--muted-foreground)]" />
            </div>
            <p className="text-sm font-medium text-[color:var(--foreground)]">Aucun pilote assigné</p>
            {vehicle.ownership === "PLATFORM" && vehicle.status === "AVAILABLE" && (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Utilise « Assigner à un pilote » dans le menu ⋯
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = driver
    ? driverFullName(driver)
    : `Pilote #${vehicle.assignedToDriverId.slice(0, 8)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCog className="size-4 text-[color:var(--primary)]" />
          <CardTitle>Pilote assigné</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Pilote identity */}
          <div className="flex items-center gap-3">
            <Avatar name={displayName} className="size-12 text-base" />
            <div className="flex flex-col leading-tight">
              <a
                href={`/vtc/drivers/${vehicle.assignedToDriverId}`}
                className="text-sm font-semibold text-[color:var(--foreground)] hover:underline"
              >
                {displayName}
              </a>
              {driver && (
                <a
                  href={`tel:${driver.phoneNumber}`}
                  className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--primary)] hover:underline"
                >
                  <Phone className="size-3" />
                  {driver.phoneNumber}
                </a>
              )}
              {driver && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge tone={driver.isApproved ? "success" : "warning"}>
                    {driver.isApproved ? "Approuvé" : "En attente"}
                  </Badge>
                  {driver.category && (
                    <Badge tone="neutral">{driver.category}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {driver && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[color:var(--muted)]/40 p-3">
              <div className="flex flex-col items-center border-r border-[color:var(--border)]">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Note</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-base font-bold text-[color:var(--foreground)]">
                  <Star className="size-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                  {driver.rating.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Courses</span>
                <span className="mt-0.5 text-base font-bold text-[color:var(--foreground)]">
                  {driver.totalRides.toLocaleString("fr-FR")}
                </span>
              </div>
            </div>
          )}

          {/* Dates */}
          <dl className="flex flex-col gap-2 text-sm">
            {vehicle.assignedAt && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[color:var(--muted-foreground)]">Assigné le</dt>
                <dd className="font-medium">{formatDateTime(vehicle.assignedAt)}</dd>
              </div>
            )}
            {driver && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[color:var(--muted-foreground)]">Pilote inscrit le</dt>
                <dd className="font-medium">{formatDate(driver.createdAt)}</dd>
              </div>
            )}
          </dl>

          <a
            href={`/vtc/drivers/${vehicle.assignedToDriverId}`}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-[color:var(--border)] py-2 text-xs font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]/30"
          >
            Voir le profil pilote
            <ArrowRight className="size-3.5" />
          </a>

          {!driver && (
            <DevNote>
              Profil enrichi non trouvé dans <code>GET /api/admin/drivers</code> — fallback sur l&apos;UUID.
            </DevNote>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── MaintenanceHistoryCard ───────────────────────────────────────────────────

function MaintenanceHistoryCard({ history }: { history: MaintenanceRecord[] }) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-[color:var(--primary)]" />
          <CardTitle>Historique maintenance ({history.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y divide-[color:var(--border)]">
          {sorted.map((m, i) => (
            <div key={i} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-[color:var(--foreground)]">{m.reason}</span>
                {m.actualCost && (
                  <span className="shrink-0 text-xs font-semibold text-[color:var(--foreground)]">
                    {fmtFcfa(m.actualCost)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 text-[11px] text-[color:var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  Début : {formatDate(m.startedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Fin : {formatDate(m.completedAt)}
                </span>
                {m.estimatedCost && (
                  <span>Estimé : {fmtFcfa(m.estimatedCost)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── FinancialCard ────────────────────────────────────────────────────────────

function FinancialCard({ vehicle }: { vehicle: VehicleSummary }) {
  const depreciation =
    vehicle.purchasePrice && vehicle.currentValue && vehicle.purchasePrice > 0
      ? ((vehicle.purchasePrice - vehicle.currentValue) / vehicle.purchasePrice) * 100
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="size-4 text-[color:var(--primary)]" />
          <CardTitle>Valorisation</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Prix d&apos;achat
            </span>
            <span className="text-base font-bold text-[color:var(--foreground)]">
              {vehicle.purchasePrice ? fmtFcfa(vehicle.purchasePrice) : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Valeur actuelle
            </span>
            <span className="text-base font-bold text-[color:var(--foreground)]">
              {vehicle.currentValue ? fmtFcfa(vehicle.currentValue) : "—"}
            </span>
          </div>
          {depreciation !== null && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Dépréciation
              </span>
              <span className="text-base font-bold text-[color:var(--danger)]">
                -{depreciation.toFixed(1)} %
              </span>
            </div>
          )}
        </div>
        {vehicle.hasActiveContract && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/5 px-3 py-2">
            <Badge tone="primary">Contrat actif</Badge>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {vehicle.contractCount
                ? `${vehicle.contractCount} contrat${vehicle.contractCount > 1 ? "s" : ""} location-vente`
                : "Location-vente en cours"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── VehicleDetailClient ──────────────────────────────────────────────────────

export interface VehicleDetailClientProps {
  vehicle: VehicleSummary;
  documents?: import("@/features/documents/domain/document").DocumentMetadata[];
  documentsError?: string;
  assignedDriver?: import("@/features/drivers/domain/admin-driver").AdminDriver;
  drivers?: import("@/features/drivers/domain/admin-driver").AdminDriver[];
  adminProfiles?: Record<string, AdminProfile>;
  connectedAdminId?: string;
}

export function VehicleDetailClient({
  vehicle,
  documents = [],
  documentsError,
  assignedDriver,
  drivers = [],
  adminProfiles = {},
  connectedAdminId,
}: VehicleDetailClientProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const [refreshing, startRefresh] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [maintenanceStartOpen, setMaintenanceStartOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [confirm, setConfirm] = useState<SimpleConfirmKind | null>(null);

  const status = VEHICLE_STATUS_META[vehicle.status];
  const daysLeft = daysUntil(vehicle.insuranceExpiryDate);

  // ── Insurance status label
  const insuranceStatusNode: React.ReactNode = (() => {
    if (daysLeft === null) return <span className="text-[color:var(--muted-foreground)]">—</span>;
    if (daysLeft < 0)
      return (
        <span className="font-semibold text-[color:var(--danger)]">
          Expirée — {formatDate(vehicle.insuranceExpiryDate)}
        </span>
      );
    if (daysLeft < 30)
      return (
        <span className="font-semibold text-[color:var(--warning)]">
          {daysLeft} j restants ({formatDate(vehicle.insuranceExpiryDate)})
        </span>
      );
    return (
      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
        {daysLeft} j restants ({formatDate(vehicle.insuranceExpiryDate)})
      </span>
    );
  })();

  // ── Ownership display
  const ownerNode: React.ReactNode = (() => {
    if (vehicle.ownership === "PLATFORM") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="info">Plateforme 4U</Badge>
          <span className="text-xs text-[color:var(--muted-foreground)]">(véhicule de la société)</span>
        </span>
      );
    }
    if (assignedDriver) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="neutral">Pilote</Badge>
          <a href={`/vtc/drivers/${assignedDriver.driverId}`} className="font-medium text-[color:var(--foreground)] hover:underline">
            {driverFullName(assignedDriver)}
          </a>
        </span>
      );
    }
    if (vehicle.assignedToDriverId) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone="neutral">Pilote</Badge>
          <a href={`/vtc/drivers/${vehicle.assignedToDriverId}`} className="font-mono text-xs text-[color:var(--primary)] hover:underline">
            #{vehicle.assignedToDriverId.slice(0, 8)}
          </a>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge tone="neutral">Driver</Badge>
        <span className="text-xs text-[color:var(--muted-foreground)]">(propriétaire non identifié)</span>
      </span>
    );
  })();

  // ── Verified-by display
  const verifiedByNode: React.ReactNode = (() => {
    if (!vehicle.verifiedBy) return null;
    const profile = adminProfiles[vehicle.verifiedBy];
    if (profile) {
      return (
        <AdminLozenge
          profile={profile}
          suffix={profile.userId === connectedAdminId ? "(vous)" : undefined}
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
          Détails indisponibles tant que <code>GET /api/admin/admins</code> n&apos;est pas exposé.
        </span>
      </div>
    );
  })();

  const showHistory = (vehicle.maintenanceHistory?.length ?? 0) > 0;
  const showFinancial =
    vehicle.ownership === "PLATFORM" &&
    (vehicle.purchasePrice != null || vehicle.currentValue != null);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <DetailHeader
        backHref="/vtc/vehicles"
        backLabel="Retour aux véhicules"
        eyebrow={`${VEHICLE_TYPE_LABELS[vehicle.type]} · ${vehicle.ownership === "PLATFORM" ? "Plateforme" : "Pilote"}`}
        title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono uppercase tracking-widest">{vehicle.licensePlate}</span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span>{vehicle.color}</span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span>{vehicle.seats} place{vehicle.seats > 1 ? "s" : ""}</span>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <CopyableId id={vehicle.id} prefix="Véhicule" />
          </div>
        }
        avatar={
          <div className="flex size-14 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
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
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <CanView permission="vehicle.manage">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Modifier
              </Button>
            </CanView>
            <DropdownMenu groups={buildMenuGroups()} />
          </>
        }
      />

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      {daysLeft !== null && daysLeft < 30 && (
        <InsuranceBanner iso={vehicle.insuranceExpiryDate} />
      )}
      {vehicle.currentMaintenance && (
        <MaintenanceBanner m={vehicle.currentMaintenance} />
      )}

      {/* ── KPI stats ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Statut opérationnel"
          value={<Badge tone={status.tone}>{status.label}</Badge>}
          icon={CarIcon}
        />
        <MiniStat
          label="Catégorie active"
          value={vehicle.category ? VEHICLE_CATEGORY_LABELS[vehicle.category] : "Non définie"}
          sub={vehicle.verifiedCategory ? `Plafond : ${VEHICLE_CATEGORY_LABELS[vehicle.verifiedCategory]}` : undefined}
          icon={ShieldCheck}
        />
        <MiniStat
          label="Kilométrage"
          value={vehicle.mileage ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : "Non renseigné"}
          sub={vehicle.nextMaintenanceDate ? `Proch. maintenance : ${formatDate(vehicle.nextMaintenanceDate)}` : undefined}
          icon={Gauge}
        />
        <MiniStat
          label="Assurance"
          value={
            daysLeft === null ? "—" :
            daysLeft < 0 ? <span className="text-[color:var(--danger)]">Expirée</span> :
            daysLeft < 30 ? <span className="text-[color:var(--warning)]">{daysLeft} j restants</span> :
            <span className="text-emerald-600 dark:text-emerald-400">{daysLeft} j restants</span>
          }
          sub={vehicle.insuranceExpiryDate ? `Expire le ${formatDate(vehicle.insuranceExpiryDate)}` : undefined}
          icon={ShieldCheck}
        />
      </div>

      {/* ── Category progression bar ─────────────────────────────────────────── */}
      {(vehicle.category || vehicle.verifiedCategory) && (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Progression de catégorie
            </p>
            {vehicle.category && vehicle.verifiedCategory && vehicle.category !== vehicle.verifiedCategory && (
              <span className="text-[11px] text-[color:var(--muted-foreground)]">
                Active : <strong>{VEHICLE_CATEGORY_LABELS[vehicle.category]}</strong> · Plafond : <strong>{VEHICLE_CATEGORY_LABELS[vehicle.verifiedCategory]}</strong>
              </span>
            )}
          </div>
          <CategoryBar active={vehicle.category} ceiling={vehicle.verifiedCategory} />
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Identity */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CarIcon className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Identité du véhicule</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {[
                  { label: "Marque", value: vehicle.make },
                  { label: "Modèle", value: vehicle.model },
                  { label: "Année", value: vehicle.year },
                  {
                    label: "Type physique",
                    value: <Badge tone="neutral">{VEHICLE_TYPE_LABELS[vehicle.type]}</Badge>,
                  },
                  { label: "Couleur", value: vehicle.color },
                  { label: "Sièges", value: `${vehicle.seats} place${vehicle.seats > 1 ? "s" : ""}` },
                  {
                    label: "Plaque",
                    value: <span className="font-mono font-bold uppercase tracking-widest">{vehicle.licensePlate}</span>,
                  },
                  { label: "Propriétaire", value: ownerNode },
                  {
                    label: "Vérifié",
                    value: vehicle.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        Oui
                      </span>
                    ) : (
                      <span className="text-[color:var(--warning)]">Non</span>
                    ),
                  },
                  { label: "Vérifié le", value: formatDateTime(vehicle.verifiedAt) },
                  { label: "Vérifié par", value: verifiedByNode },
                  { label: "Inscrit le", value: formatDateTime(vehicle.createdAt) },
                ]
                  .filter((r) => r.value != null && r.value !== "")
                  .map((row) => (
                    <div key={row.label} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        {row.label}
                      </span>
                      <span className="text-sm text-[color:var(--foreground)]">{row.value as React.ReactNode}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial (platform only) */}
          {showFinancial && <FinancialCard vehicle={vehicle} />}

          {/* Maintenance history */}
          {showHistory && (
            <MaintenanceHistoryCard history={vehicle.maintenanceHistory!} />
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[color:var(--primary)]" />
                  <CardTitle>
                    Documents (
                    {documents.length > 0
                      ? documents.length
                      : [vehicle.registrationCardUrl, vehicle.insuranceUrl].filter(Boolean).length}
                    )
                  </CardTitle>
                </div>
                {daysLeft !== null && daysLeft >= 0 && (
                  <span className="text-xs text-[color:var(--muted-foreground)]">
                    Assurance : {insuranceStatusNode}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {documentsError ? (
                <p className="text-sm text-[color:var(--danger)]">{documentsError}</p>
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
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <FileText className="size-8 text-[color:var(--muted-foreground)]" />
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    Aucun document uploadé pour ce véhicule.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <DriverAssignmentCard vehicle={vehicle} driver={assignedDriver} />

          {/* Lifecycle */}
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
                  { label: "Vérifié", value: vehicle.isVerified ? "Oui" : "Non" },
                  { label: "Vérifié le", value: formatDateTime(vehicle.verifiedAt) },
                  { label: "Vérifié par", value: verifiedByNode },
                  {
                    label: "Proch. maintenance",
                    value: vehicle.nextMaintenanceDate
                      ? formatDateTime(vehicle.nextMaintenanceDate)
                      : null,
                  },
                  { label: "Kilométrage", value: vehicle.mileage ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : null },
                  { label: "Créé le", value: formatDateTime(vehicle.createdAt) },
                  { label: "Mis à jour le", value: formatDateTime(vehicle.updatedAt) },
                ]
                  .filter((r) => r.value != null)
                  .map((row) => (
                    <div key={row.label} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        {row.label}
                      </dt>
                      <dd className="text-sm text-[color:var(--foreground)]">{row.value as React.ReactNode}</dd>
                    </div>
                  ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <VehicleEditModal open={editOpen} vehicle={vehicle} onClose={() => setEditOpen(false)} />
      <VehicleVerifyModal open={verifyOpen} vehicle={vehicle} onClose={() => setVerifyOpen(false)} />
      <VehicleRejectModal open={rejectOpen} vehicle={vehicle} onClose={() => setRejectOpen(false)} />
      <VehicleAssignModal open={assignOpen} vehicle={vehicle} drivers={drivers} onClose={() => setAssignOpen(false)} />
      <VehicleCategoryModal open={categoryOpen} vehicle={vehicle} onClose={() => setCategoryOpen(false)} />
      <VehicleMaintenanceStartModal open={maintenanceStartOpen} vehicle={vehicle} onClose={() => setMaintenanceStartOpen(false)} />
      <VehicleMaintenanceCompleteModal open={completeOpen} vehicle={vehicle} onClose={() => setCompleteOpen(false)} />
      <VehicleSimpleConfirm kind={confirm} vehicle={confirm ? vehicle : null} onClose={() => setConfirm(null)} />
    </div>
  );

  function buildMenuGroups() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lifecycle: Array<{ label: string; icon?: any; onSelect: () => void; danger?: boolean }> = [];

    if (vehicle.status === "PENDING" && can("vehicle.verify")) {
      lifecycle.push(
        { label: "Vérifier", icon: ShieldCheck, onSelect: () => setVerifyOpen(true) },
        { label: "Rejeter", icon: ShieldX, onSelect: () => setRejectOpen(true) },
      );
    }
    if (can("vehicle.manage")) {
      lifecycle.push({ label: "Changer la catégorie", icon: Pencil, onSelect: () => setCategoryOpen(true) });
    }
    if (vehicle.ownership === "PLATFORM" && can("vehicle.manage")) {
      if (vehicle.status === "AVAILABLE") {
        lifecycle.push({ label: "Assigner à un pilote", icon: UserCog, onSelect: () => setAssignOpen(true) });
      }
      if (vehicle.status === "ASSIGNED") {
        lifecycle.push({ label: "Désassigner", icon: UserMinus, onSelect: () => setConfirm("unassign") });
      }
      if (vehicle.status === "AVAILABLE" && !vehicle.assignedToDriverId) {
        lifecycle.push({ label: "Mettre en maintenance", icon: Wrench, onSelect: () => setMaintenanceStartOpen(true) });
      }
      if (vehicle.status === "MAINTENANCE") {
        lifecycle.push({ label: "Terminer la maintenance", icon: WrenchIcon, onSelect: () => setCompleteOpen(true) });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups: Array<{ label?: string; items: typeof lifecycle }> = [{ label: "Cycle de vie", items: lifecycle }];
    if (can("vehicle.manage")) {
      groups.push({
        items: [
          { label: "Retirer définitivement", icon: AlertTriangle, onSelect: () => setConfirm("retire"), danger: true },
          { label: "Supprimer", icon: Trash2, onSelect: () => setConfirm("delete"), danger: true },
        ],
      });
    }
    return groups;
  }
}
