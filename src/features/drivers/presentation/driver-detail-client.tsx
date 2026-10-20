"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Car as CarIcon,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  History,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Star,
  TrendingUp,
  TrendingDown,
  UserCircle,
  Wallet,
  Zap,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DetailHeader } from "@/shared/ui/detail-header";
import { CopyableId } from "@/shared/ui/copy-button";
import { DevNote } from "@/shared/ui/dev-note";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { DocumentsList } from "@/features/documents/presentation/documents-list";
import { formatDate, formatDateTime, formatXof } from "@/shared/lib/format";
import { CanView } from "@/shared/ui/can-view";
import {
  DriverInlineActionButton,
  SuspendDriverModal,
  type DriverTarget,
} from "./driver-action-modals";
import {
  fetchDriverCommissionDebtPageAction,
  fetchDriverDailyConnectionTimeAction,
  fetchDriverSessionsAction,
  updateDriverCategoryAction,
  updateDriverInfoAction,
  updateDriverTypeAction,
  type DriverCategory,
} from "../application/actions";
import {
  ADMIN_DRIVER_STATUS_META,
  DRIVER_TYPE_LABELS,
  fullName,
  type AdminDriver,
  type AdminDriverStatus,
  type DriverCommissionDebtDetail,
  type DriverType,
  type OnlineDriver,
  type UpdateDriverInfoInput,
} from "../domain/admin-driver";
import {
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_OWNERSHIP_LABELS,
  VEHICLE_STATUS_META,
  VEHICLE_TYPE_LABELS,
  type VehicleSummary,
} from "@/features/vehicles/domain/vehicle";
import type { DocumentMetadata } from "@/features/documents/domain/document";
import type { AdminWallet } from "@/features/wallet/domain/wallet";
import {
  fullParty,
  rideStatusMeta,
  type AdminRide,
} from "@/features/rides/domain/admin-ride";
import type {
  DailyConnectionEntry,
  DriverConnectionSession,
  DriverConnectionTimeByDayResponse,
  SessionEndReason,
} from "../domain/admin-driver";
import {
  CHANNEL_META,
  DRIVER_BONUS_NOTIFICATION_META,
  STATUS_META,
  isDriverBonusNotification,
  type DriverBonusNotificationType,
  type NotificationItem,
} from "@/features/notifications/domain/notification";
import {
  VEHICLE_CATEGORY_META,
  type DriverBonusAward,
  type DriverBonusActivityDailyLedger,
  type DriverBonusQualityMonthlyLedger,
} from "@/features/driver-bonus/domain/driver-bonus";

// ─── Props ────────────────────────────────────────────────────────────────────

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
  enriched?: AdminDriver;
  online?: OnlineDriver;
  wallet?: AdminWallet;
  recentRides?: AdminRide[];
  sessions?: DriverConnectionSession[];
  sessionsTotalDuration?: number;
  sessionsTotal?: number;
  commissionDebt?: DriverCommissionDebtDetail | null;
  driverNotifications?: NotificationItem[];
  bonusAwards?: DriverBonusAward[];
  bonusActivity?: DriverBonusActivityDailyLedger[];
  bonusQuality?: DriverBonusQualityMonthlyLedger[];
}

// ─── Sessions helpers ─────────────────────────────────────────────────────────

const SESSION_END_REASON_META: Record<
  SessionEndReason,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  LOGOUT:     { label: "Déconnexion", tone: "success" },
  SUPERSEDED: { label: "Remplacée",   tone: "warning" },
  TIMEOUT:    { label: "Timeout",     tone: "danger"  },
};

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

// ─── Driver type inline editor ────────────────────────────────────────────────

const DRIVER_TYPES: DriverType[] = ["VTC", "DELIVERY", "BOTH"];

function DriverTypeEditor({ driverId, current }: { driverId: string; current: DriverType }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<DriverType>(current);
  const [pending, start] = useTransition();

  function save() {
    if (selected === current) { setEditing(false); return; }
    start(async () => {
      const r = await updateDriverTypeAction(driverId, selected);
      if (r.ok) {
        toast({ kind: "success", title: "Type de service mis à jour", description: r.message });
        setEditing(false);
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge tone="info">{DRIVER_TYPE_LABELS[current] ?? current}</Badge>
        <CanView permission="driver.update_type">
          <button
            type="button"
            onClick={() => { setSelected(current); setEditing(true); }}
            className="rounded p-0.5 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            title="Modifier le type de service"
          >
            <Pencil className="size-3" />
          </button>
        </CanView>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as DriverType)}
        disabled={pending}
        className="h-7 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-1.5 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
      >
        {DRIVER_TYPES.map((t) => (
          <option key={t} value={t}>{DRIVER_TYPE_LABELS[t]}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded bg-[color:var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50"
      >
        {pending ? "…" : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={pending}
        className="rounded px-1.5 py-0.5 text-[10px] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Driver pricing/bonus category inline editor ──────────────────────────────
// Catégorie tarifaire (STANDARD | PREMIUM | VIP) = `User.driverCategory` côté
// backend, déjà exposée en lecture ici sous `enriched.category`
// (ListDriversUseCase.ts:35 : `category = user.driverCategory`) mais jusqu'ici
// affichée en texte statique. PATCH /api/users/:userId/driver-category la
// modifie — scopée par User id, pas par driver profile id.

const DRIVER_PRICING_CATEGORIES: DriverCategory[] = ["STANDARD", "PREMIUM", "VIP"];

function DriverCategoryEditor({
  userId,
  driverId,
  current,
}: {
  userId: string;
  driverId: string;
  current: DriverCategory | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<DriverCategory>(current ?? "STANDARD");
  const [pending, start] = useTransition();

  function save() {
    if (selected === current) { setEditing(false); return; }
    start(async () => {
      const r = await updateDriverCategoryAction(userId, selected, driverId);
      if (r.ok) {
        toast({ kind: "success", title: "Catégorie tarifaire mise à jour", description: r.message });
        setEditing(false);
        router.refresh();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        {current ? <Badge tone="neutral">{current}</Badge> : <span className="text-[color:var(--muted-foreground)]">—</span>}
        <CanView permission="driver.update_type">
          <button
            type="button"
            onClick={() => { setSelected(current ?? "STANDARD"); setEditing(true); }}
            className="rounded p-0.5 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            title="Modifier la catégorie tarifaire"
          >
            <Pencil className="size-3" />
          </button>
        </CanView>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as DriverCategory)}
        disabled={pending}
        className="h-7 rounded border border-[color:var(--border)] bg-[color:var(--background)] px-1.5 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
      >
        {DRIVER_PRICING_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded bg-[color:var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50"
      >
        {pending ? "…" : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={pending}
        className="rounded px-1.5 py-0.5 text-[10px] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-[color:var(--muted-foreground)]">
        {children}
      </span>
      <div className="h-px flex-1 bg-[color:var(--border)]" />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const bar = {
    default:  "bg-[color:var(--border)]",
    primary:  "bg-[color:var(--primary)]",
    success:  "bg-emerald-500",
    warning:  "bg-[color:var(--warning)]",
    danger:   "bg-[color:var(--danger)]",
  }[color];

  const iconColor = {
    default:  "text-[color:var(--muted-foreground)]",
    primary:  "text-[color:var(--primary)]",
    success:  "text-emerald-500",
    warning:  "text-[color:var(--warning)]",
    danger:   "text-[color:var(--danger)]",
  }[color];

  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--background)]">
      <div className={`h-0.5 w-full ${bar}`} />
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            {label}
          </p>
          {Icon && <Icon className={`size-4 shrink-0 ${iconColor}`} />}
        </div>
        <div className="mt-2 text-sm font-bold text-[color:var(--foreground)]">{value}</div>
        {sub && <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">{sub}</p>}
      </div>
    </div>
  );
}

function InfoCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {label}
      </span>
      <span className="text-[color:var(--foreground)]">{children}</span>
    </div>
  );
}

// ─── OnlineBanner ─────────────────────────────────────────────────────────────

function OnlineBanner({ online }: { online: OnlineDriver }) {
  const headingLabel = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
  ][Math.round(online.heading / 22.5) % 16];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          En ligne maintenant
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" />
          {online.latitude.toFixed(5)}, {online.longitude.toFixed(5)}
        </span>
        {online.speed > 0 && (
          <span className="flex items-center gap-1">
            <Gauge className="size-3" />
            {Math.round(online.speed)} km/h
          </span>
        )}
        {online.heading > 0 && (
          <span className="flex items-center gap-1">
            <Navigation className="size-3" />
            {headingLabel}
          </span>
        )}
        {online.isInRide && <Badge tone="primary">En course</Badge>}
      </div>
    </div>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────

function VehicleCard({
  vehicles,
  vehiclesError,
  enrichedVehicle,
  onNavigate,
}: {
  vehicles: VehicleSummary[];
  vehiclesError?: string;
  enrichedVehicle?: AdminDriver["vehicle"];
  onNavigate: (id: string) => void;
}) {
  if (vehiclesError) {
    return <p className="text-sm text-[color:var(--danger)]">{vehiclesError}</p>;
  }

  if (vehicles.length > 0) {
    return (
      <div className="flex flex-col divide-y divide-[color:var(--border)]">
        {vehicles.map((v) => {
          const sm = VEHICLE_STATUS_META[v.status];
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onNavigate(v.id)}
              className="group flex flex-col gap-1.5 py-3 text-left transition-colors first:pt-0 last:pb-0 hover:opacity-80"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10">
                    <CarIcon className="size-4 text-[color:var(--primary)]" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-[color:var(--foreground)] group-hover:underline">
                      {v.make} {v.model} {v.year}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                      {v.licensePlate}
                    </span>
                  </div>
                </div>
                <Badge tone={sm.tone}>{sm.label}</Badge>
              </div>
              <div className="ml-11 flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{VEHICLE_TYPE_LABELS[v.type]}</Badge>
                {v.category && <Badge tone="primary">{VEHICLE_CATEGORY_LABELS[v.category]}</Badge>}
                <Badge tone={v.ownership === "PLATFORM" ? "info" : v.ownership === "THIRD_PARTY" ? "warning" : "neutral"}>
                  {VEHICLE_OWNERSHIP_LABELS[v.ownership]}
                </Badge>
                {v.isActive && <Badge tone="success">Véhicule actif</Badge>}
              </div>
              <div className="ml-11 flex items-center gap-1 text-[10px] text-[color:var(--primary)]">
                <ArrowRight className="size-3" />
                Voir le véhicule
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (enrichedVehicle) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(enrichedVehicle.vehicleId)}
        className="group flex flex-col gap-1.5 text-left transition-colors hover:opacity-80"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10">
            <CarIcon className="size-4 text-[color:var(--primary)]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-[color:var(--foreground)] group-hover:underline">
              {enrichedVehicle.make} {enrichedVehicle.model}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
              {enrichedVehicle.licensePlate}
            </span>
          </div>
        </div>
        <div className="ml-11 flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--muted-foreground)]">
          <span>{enrichedVehicle.vehicleType}</span>
          {enrichedVehicle.color && <><span>·</span><span>{enrichedVehicle.color}</span></>}
          {enrichedVehicle.vehicleCategory && (
            <>
              <span>·</span>
              <span className="font-medium text-[color:var(--primary)]">
                {VEHICLE_CATEGORY_LABELS[enrichedVehicle.vehicleCategory as keyof typeof VEHICLE_CATEGORY_LABELS] ?? enrichedVehicle.vehicleCategory}
              </span>
            </>
          )}
        </div>
        <div className="ml-11 flex items-center gap-1 text-[10px] text-[color:var(--primary)]">
          <ArrowRight className="size-3" />
          Voir le véhicule
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
        <CarIcon className="size-5 text-[color:var(--muted-foreground)]" />
      </div>
      <p className="text-sm text-[color:var(--muted-foreground)]">Aucun véhicule rattaché</p>
    </div>
  );
}

// ─── WalletCard ───────────────────────────────────────────────────────────────

function WalletCard({ wallet }: { wallet?: AdminWallet }) {
  if (!wallet) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
          <Wallet className="size-5 text-[color:var(--muted-foreground)]" />
        </div>
        <p className="text-sm text-[color:var(--muted-foreground)]">Aucun wallet rattaché</p>
      </div>
    );
  }

  const total = wallet.totalBalance;
  const pctMain  = total > 0 ? (wallet.mainBalance     / total) * 100 : 0;
  const pctBonus = total > 0 ? (wallet.bonusBalance    / total) * 100 : 0;
  const pctRef   = total > 0 ? (wallet.referralBalance / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Solde total
          </span>
          <span className="text-2xl font-bold tabular-nums text-[color:var(--foreground)]">
            {formatXof(wallet.totalBalance)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={wallet.status === "ACTIVE" ? "success" : "neutral"}>
            {wallet.status === "ACTIVE" ? "Actif" : wallet.status}
          </Badge>
          {wallet.withdrawalsBlocked && <Badge tone="danger">Retraits bloqués</Badge>}
        </div>
      </div>

      {total > 0 && (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
          <div className="bg-[color:var(--primary)] transition-all" style={{ width: `${pctMain}%` }} />
          <div className="bg-[color:var(--warning)] transition-all"  style={{ width: `${pctBonus}%` }} />
          <div className="bg-emerald-500 transition-all"             style={{ width: `${pctRef}%` }} />
        </div>
      )}

      <dl className="flex flex-col gap-2">
        {[
          { label: "Principal",  value: wallet.mainBalance,     color: "bg-[color:var(--primary)]" },
          { label: "Bonus",      value: wallet.bonusBalance,    color: "bg-[color:var(--warning)]" },
          { label: "Parrainage", value: wallet.referralBalance, color: "bg-emerald-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
              <span className={`size-2 rounded-full ${color}`} />
              {label}
            </dt>
            <dd className="font-mono text-xs font-semibold tabular-nums text-[color:var(--foreground)]">
              {formatXof(value)}
            </dd>
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

// ─── RidesCard ────────────────────────────────────────────────────────────────

function RidesCard({ rides }: { rides: AdminRide[] }) {
  if (rides.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
          <History className="size-5 text-[color:var(--muted-foreground)]" />
        </div>
        <p className="text-sm text-[color:var(--muted-foreground)]">Aucune course récente</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[color:var(--border)]">
      {rides.map((r) => {
        const meta     = rideStatusMeta(r.status);
        const price    = r.pricing.finalPrice ?? r.pricing.estimatedPrice;
        const earnings = r.pricing.driverEarnings;
        const pickup   = r.pickup?.address ?? null;
        const dropoff  = r.dropoff?.address ?? null;

        return (
          <div
            key={r.rideId}
            className="grid grid-cols-[1fr_auto] gap-x-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[color:var(--foreground)]">
                  {r.rideNumber}
                </span>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              {pickup && (
                <div className="flex items-start gap-1 overflow-hidden text-[11px] text-[color:var(--muted-foreground)]">
                  <MapPin className="mt-px size-3 flex-shrink-0 text-emerald-500" />
                  <span className="truncate">{pickup}</span>
                </div>
              )}
              {dropoff && (
                <div className="flex items-start gap-1 overflow-hidden text-[11px] text-[color:var(--muted-foreground)]">
                  <MapPin className="mt-px size-3 flex-shrink-0 text-[color:var(--danger)]" />
                  <span className="truncate">{dropoff}</span>
                </div>
              )}
              <span className="text-[10px] text-[color:var(--muted-foreground)]">
                {fullParty(r.passenger ?? undefined)} · {formatDate(r.createdAt)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">
                {formatXof(price)}
              </span>
              {earnings != null && (
                <span className="text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatXof(earnings)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SessionsCard ─────────────────────────────────────────────────────────────

const LIMIT = 20;

function SessionsCard({
  driverId,
  initialSessions,
  initialTotal,
  initialTotalDuration,
}: {
  driverId: string;
  initialSessions: DriverConnectionSession[];
  initialTotal: number;
  initialTotalDuration: number;
}) {
  const [sessions, setSessions]           = useState(initialSessions);
  const [total, setTotal]                 = useState(initialTotal);
  const [totalDuration, setTotalDuration] = useState(initialTotalDuration);
  const [page, setPage]                   = useState(1);
  const [from, setFrom]                   = useState("");
  const [to, setTo]                       = useState("");
  const [pending, start]                  = useTransition();

  function fetch(nextPage: number, f: string, t: string) {
    start(async () => {
      const res = await fetchDriverSessionsAction(driverId, {
        page: nextPage, limit: LIMIT,
        from: f || undefined, to: t || undefined,
      });
      setSessions(res.sessions);
      setTotal(res.total);
      setTotalDuration(res.totalDurationSeconds);
      setPage(nextPage);
    });
  }

  function applyFilters() { fetch(1, from, to); }
  function resetFilters()  { setFrom(""); setTo(""); fetch(1, "", ""); }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-[color:var(--primary)]" />
            <CardTitle>Sessions de connexion{total > 0 ? ` (${total})` : ""}</CardTitle>
          </div>
          {totalDuration > 0 && (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              Durée totale :{" "}
              <span className="font-semibold text-[color:var(--foreground)]">
                {formatDuration(totalDuration)}
              </span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Filtres période */}
          <div className="flex flex-wrap items-end gap-2">
            {[
              { label: "Du", value: from, set: setFrom },
              { label: "Au", value: to,   set: setTo   },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  {label}
                </label>
                <input
                  type="date"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="h-8 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                />
              </div>
            ))}
            <Button size="sm" onClick={applyFilters} isLoading={pending}>Filtrer</Button>
            {(from || to) && (
              <Button size="sm" variant="ghost" onClick={resetFilters} disabled={pending}>
                Réinitialiser
              </Button>
            )}
          </div>

          {sessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-[color:var(--muted-foreground)]">
              Aucune session sur cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[color:var(--border)] text-left">
                    {["Début", "Fin", "Durée", "Raison"].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] last:pr-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y divide-[color:var(--border)] transition-opacity ${pending ? "opacity-50" : ""}`}>
                  {sessions.map((s) => {
                    const meta = s.endReason ? SESSION_END_REASON_META[s.endReason] : null;
                    return (
                      <tr key={s.id}>
                        <td className="py-2 pr-4 text-[color:var(--foreground)]">{formatDateTime(s.startedAt)}</td>
                        <td className="py-2 pr-4 text-[color:var(--muted-foreground)]">
                          {s.endedAt ? formatDateTime(s.endedAt) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                              En cours
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-mono text-[color:var(--foreground)]">
                          {formatDuration(s.durationSeconds)}
                        </td>
                        <td className="py-2">
                          {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <span className="text-[color:var(--muted-foreground)]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3">
              <span className="text-[11px] text-[color:var(--muted-foreground)]">
                Page {page} / {totalPages} — {total} session{total > 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => fetch(page - 1, from, to)} disabled={page <= 1 || pending}>
                  ← Précédent
                </Button>
                <Button size="sm" variant="outline" onClick={() => fetch(page + 1, from, to)} disabled={page >= totalPages || pending}>
                  Suivant →
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── DailyConnectionTimeCard ──────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function DayBar({ entry, maxSeconds }: { entry: DailyConnectionEntry; maxSeconds: number }) {
  const pct = maxSeconds > 0 ? (entry.totalSeconds / maxSeconds) * 100 : 0;
  const h   = Math.floor(entry.totalSeconds / 3600);
  const m   = Math.floor((entry.totalSeconds % 3600) / 60);
  const label = entry.totalSeconds === 0 ? "—" : m > 0 ? `${h}h ${m}min` : `${h}h`;

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 font-mono text-[11px] text-[color:var(--muted-foreground)]">
        {entry.date}
      </span>
      <div className="flex-1 overflow-hidden rounded-full bg-[color:var(--muted)] h-1.5">
        <div
          className={`h-full rounded-full transition-all ${entry.totalSeconds > 0 ? "bg-[color:var(--primary)]" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-16 shrink-0 text-right font-mono text-xs font-semibold tabular-nums ${
        entry.totalSeconds === 0
          ? "text-[color:var(--muted-foreground)]"
          : "text-[color:var(--foreground)]"
      }`}>
        {label}
      </span>
    </div>
  );
}

function DailyConnectionTimeCard({ driverId }: { driverId: string }) {
  const [from, setFrom]         = useState(isoNDaysAgo(6));
  const [to,   setTo]           = useState(isoToday());
  const [draft, setDraft]       = useState<{ from: string; to: string }>({ from: isoNDaysAgo(6), to: isoToday() });
  const [report, setReport]     = useState<DriverConnectionTimeByDayResponse | null>(null);
  const [error,  setError]      = useState<string | null>(null);
  const [pending, start]        = useTransition();

  function load(f: string, t: string) {
    setError(null);
    start(async () => {
      const res = await fetchDriverDailyConnectionTimeAction(driverId, { from: f, to: t });
      if (!res) { setError("Impossible de charger le rapport."); return; }
      setReport(res);
      setFrom(f);
      setTo(t);
    });
  }

  useEffect(() => { load(from, to); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const driverReport = report?.drivers[0] ?? null;
  const days         = driverReport?.days ?? [];
  const maxSeconds   = days.length > 0 ? Math.max(...days.map((d) => d.totalSeconds)) : 0;
  const activeDays   = days.filter((d) => d.totalSeconds > 0).length;
  const grandTotal   = driverReport?.grandTotalSeconds ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[color:var(--primary)]" />
            <CardTitle>Connexion par jour</CardTitle>
          </div>
          {grandTotal > 0 && (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              Total période :{" "}
              <span className="font-semibold text-[color:var(--foreground)]">
                {formatDuration(grandTotal)}
              </span>
              {activeDays > 0 && (
                <span className="ml-2 text-[color:var(--muted-foreground)]">
                  · {activeDays} jour{activeDays > 1 ? "s" : ""} actif{activeDays > 1 ? "s" : ""}
                </span>
              )}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Contrôles période */}
          <div className="flex flex-wrap items-end gap-2">
            {[
              { label: "Du", key: "from" as const, value: draft.from },
              { label: "Au", key: "to"   as const, value: draft.to   },
            ].map(({ label, key, value }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  {label}
                </label>
                <input
                  type="date"
                  value={value}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  className="h-8 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                />
              </div>
            ))}
            <Button size="sm" onClick={() => load(draft.from, draft.to)} isLoading={pending}>
              Appliquer
            </Button>
            {/* Raccourcis */}
            {[
              { label: "7 j",  days: 6  },
              { label: "30 j", days: 29 },
            ].map(({ label, days: n }) => (
              <Button
                key={label}
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  const f = isoNDaysAgo(n);
                  const t = isoToday();
                  setDraft({ from: f, to: t });
                  load(f, t);
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          {error && (
            <p className="text-sm text-[color:var(--danger)]">{error}</p>
          )}

          {pending ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : days.length === 0 ? (
            <p className="py-4 text-center text-sm text-[color:var(--muted-foreground)]">
              Aucune session sur cette période ({from} → {to}).
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {days.map((entry) => (
                <DayBar key={entry.date} entry={entry} maxSeconds={maxSeconds} />
              ))}

              {/* Récap */}
              <div className="mt-2 flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-xs">
                <span className="text-[color:var(--muted-foreground)]">
                  {days.length} jour{days.length > 1 ? "s" : ""} · {activeDays} actif{activeDays > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-[color:var(--foreground)]">
                  Total : {formatDuration(grandTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── EditDriverModal ──────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: "",       label: "Non précisé" },
  { value: "MALE",   label: "Homme"       },
  { value: "FEMALE", label: "Femme"       },
];

function EditDriverModal({
  open, driverId, initial, onClose,
}: {
  open: boolean;
  driverId: string;
  initial?: AdminDriver;
  onClose: () => void;
}) {
  const [firstName,   setFirstName]   = useState(initial?.firstName   ?? "");
  const [lastName,    setLastName]    = useState(initial?.lastName    ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const [gender,      setGender]      = useState<"" | "MALE" | "FEMALE">("");
  const [saving, startSave]           = useTransition();
  const [error,   setError]           = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: UpdateDriverInfoInput = {};
    if (firstName.trim())   input.firstName   = firstName.trim();
    if (lastName.trim())    input.lastName    = lastName.trim();
    if (phoneNumber.trim()) input.phoneNumber = phoneNumber.trim();
    if (gender)             input.gender      = gender;

    startSave(async () => {
      const res = await updateDriverInfoAction(driverId, input);
      if (res.ok) { setSuccess(true); setTimeout(onClose, 800); }
      else        { setError(res.message); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
            <Pencil className="size-4 text-[color:var(--primary)]" />
            Modifier les informations
          </h2>
          <button type="button" onClick={onClose} className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Prénom",   value: firstName,   set: setFirstName,   placeholder: initial?.firstName   },
              { label: "Nom",      value: lastName,    set: setLastName,    placeholder: initial?.lastName    },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Téléphone</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={initial?.phoneNumber}
              className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Genre</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "" | "MALE" | "FEMALE")}
              className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
            >
              {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {error   && <p className="rounded-lg bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]">{error}</p>}
          {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Informations mises à jour.</p>}

          <div className="flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button type="submit" size="sm" isLoading={saving}>Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CommissionDebtCard ───────────────────────────────────────────────────────

const DEBT_SOURCE_META: Record<string, { label: string; tone: "primary" | "info" | "warning" }> = {
  RIDE:                 { label: "Course",    tone: "primary" },
  B2C_DELIVERY:         { label: "Livraison", tone: "info"    },
  CONTRACT_INSTALLMENT: { label: "Contrat",   tone: "warning" },
};

const DEBT_PAGE_LIMIT = 5;

function CommissionDebtCard({
  driverId,
  debt: initialDebt,
}: {
  driverId: string;
  debt: DriverCommissionDebtDetail;
}) {
  const [items,    setItems]   = useState(initialDebt.items);
  const [total,    setTotal]   = useState(initialDebt.total);
  const [page,     setPage]    = useState(1);
  const [pending,  start]      = useTransition();

  const hasDebt    = initialDebt.debtAmount < 0;
  const totalPages = Math.max(1, Math.ceil(total / DEBT_PAGE_LIMIT));

  function goTo(nextPage: number) {
    start(async () => {
      const res = await fetchDriverCommissionDebtPageAction(driverId, {
        page: nextPage,
        limit: DEBT_PAGE_LIMIT,
      });
      if (res) {
        setItems(res.items);
        setTotal(res.total);
        setPage(nextPage);
      }
    });
  }

  return (
    <Card className={hasDebt ? "border-[color:var(--danger)]/40" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingDown className={`size-4 ${hasDebt ? "text-[color:var(--danger)]" : "text-[color:var(--muted-foreground)]"}`} />
            <CardTitle>Commission & dette EARNINGS</CardTitle>
          </div>
          <Badge tone={hasDebt ? "danger" : "success"}>
            {hasDebt ? `Dette : ${formatXof(Math.abs(initialDebt.debtAmount))}` : "À jour"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">

          {/* Solde / Montant dû */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[color:var(--border)] p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Solde EARNINGS
              </span>
              <span className={`text-lg font-bold tabular-nums ${initialDebt.currentBalance < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--foreground)]"}`}>
                {formatXof(initialDebt.currentBalance)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Montant dû
              </span>
              <span className={`text-lg font-bold tabular-nums ${hasDebt ? "text-[color:var(--danger)]" : "text-emerald-600 dark:text-emerald-400"}`}>
                {hasDebt ? `−${formatXof(Math.abs(initialDebt.debtAmount))}` : formatXof(0)}
              </span>
            </div>
          </div>

          {/* Table */}
          {items.length === 0 && total === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucune transaction à l&apos;origine de la dette.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[color:var(--border)] text-left">
                      {["Source", "Référence", "Montant", "Date"].map((h, i) => (
                        <th
                          key={h}
                          className={`pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] ${i === 2 ? "text-right" : ""} last:pr-0`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-[color:var(--border)] transition-opacity ${pending ? "opacity-40" : ""}`}>
                    {items.map((item) => {
                      const meta = DEBT_SOURCE_META[item.source] ?? { label: item.source, tone: "neutral" as const };
                      return (
                        <tr key={item.transactionId}>
                          <td className="py-2 pr-4">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex flex-col">
                              <span className="font-mono font-semibold text-[color:var(--foreground)]">
                                {item.entityNumber}
                              </span>
                              <span className="text-[10px] text-[color:var(--muted-foreground)]">
                                {item.description}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono font-bold text-[color:var(--danger)]">
                            −{formatXof(Math.abs(item.commissionAmount))}
                          </td>
                          <td className="py-2 text-[color:var(--muted-foreground)]">
                            {formatDate(item.date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3">
                  <span className="text-[11px] text-[color:var(--muted-foreground)]">
                    Page {page} / {totalPages} — {total} transaction{total > 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => goTo(page - 1)}
                      disabled={page <= 1 || pending}
                    >
                      ← Précédent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => goTo(page + 1)}
                      disabled={page >= totalPages || pending}
                    >
                      Suivant →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── DriverDetailClient ───────────────────────────────────────────────────────

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
  sessions,
  sessionsTotalDuration,
  sessionsTotal,
  commissionDebt,
  driverNotifications = [],
  bonusAwards = [],
  bonusActivity = [],
  bonusQuality = [],
}: DriverDetailClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [suspendTarget, setSuspendTarget] = useState<DriverTarget | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const statusMeta  = ADMIN_DRIVER_STATUS_META[status];
  const displayName = enriched ? fullName(enriched) : `Driver #${driverId.slice(0, 8)}`;
  const pendingDocs = documents.filter((d) => d.status === "PENDING").length;
  const isSuspended = status === "SUSPENDED";
  const totalRides  = enriched
    ? Math.max(enriched.totalRides, recentRides.length)
    : recentRides.length;

  const hasBonus = bonusAwards.length > 0 || bonusActivity.length > 0 || bonusQuality.length > 0;
  const bonusCount = driverNotifications.filter((n) => isDriverBonusNotification(n.type)).length;

  // Temps en ligne (sessions fermées + session ouverte en cours)
  const onlineDuration = (() => {
    const base = sessionsTotalDuration ?? 0;
    const openSession = sessions?.find((s) => s.endedAt === null);
    const liveExtra = openSession
      ? Math.floor((Date.now() - new Date(openSession.startedAt).getTime()) / 1000)
      : 0;
    return base + liveExtra;
  })();

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <DetailHeader
        backHref="/vtc/drivers"
        backLabel="Retour aux pilotes"
        eyebrow={enriched ? `Pilote · ${enriched.driverType}` : "Pilote"}
        title={displayName}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <CopyableId id={driverId} prefix="Driver" />
            <CopyableId id={userId}   prefix="User" />
            {enriched && (
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
            )}
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span className="text-[color:var(--muted-foreground)]">
              Inscrit {formatDate(enriched?.createdAt ?? createdAt)}
            </span>
          </div>
        }
        avatar={
          enriched ? (
            <Avatar name={displayName} className="size-14 text-base" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
              <UserCircle className="size-7" />
            </div>
          )
        }
        status={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            {online && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                En ligne
              </span>
            )}
            {online?.isInRide && <Badge tone="primary">En course</Badge>}
            {enriched?.isApproved && <Badge tone="success">Approuvé</Badge>}
          </div>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing}>
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <CanView permission="driver.update_info">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Modifier
              </Button>
            </CanView>
            {(status === "PENDING" || status === "OFFLINE") && !enriched?.isApproved && (
              <CanView permission="driver.approve">
                <DriverInlineActionButton driverId={driverId} action="approve" label="Approuver" size="sm" />
              </CanView>
            )}
            {isSuspended ? (
              <CanView permission="driver.reactivate">
                <DriverInlineActionButton driverId={driverId} action="reactivate" label="Réactiver" size="sm" variant="primary" />
              </CanView>
            ) : (
              <CanView permission="driver.suspend">
                <Button variant="outline" size="sm" onClick={() => setSuspendTarget({ driverId, label: displayName })}>
                  <ShieldX className="size-4" />
                  Suspendre
                </Button>
              </CanView>
            )}
          </>
        }
      />

      {/* ── Alertes ──────────────────────────────────────────────────────────── */}
      {isSuspended && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/8 px-4 py-3">
          <AlertTriangle className="size-5 flex-shrink-0 text-[color:var(--danger)]" />
          <p className="text-sm font-semibold text-[color:var(--danger)]">
            Ce driver est suspendu et ne peut pas accepter de courses.
          </p>
        </div>
      )}
      {online && <OnlineBanner online={online} />}

      {/* ── KPIs ──────────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Note moyenne"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-4 fill-[color:var(--warning)] text-[color:var(--warning)]" />
              {enriched ? enriched.rating.toFixed(2) : "—"}
            </span>
          }
          sub="/ 5.00"
          icon={Star}
          color="warning"
        />
        <StatCard
          label="Courses totales"
          value={totalRides.toLocaleString("fr-FR")}
          sub={recentRides.length > 0 ? `${recentRides.length} récentes affichées` : "Aucune course"}
          icon={TrendingUp}
          color={totalRides > 0 ? "primary" : "default"}
        />
        <StatCard
          label="Wallet EARNINGS"
          value={wallet ? formatXof(wallet.totalBalance) : "—"}
          sub={wallet ? `Principal : ${formatXof(wallet.mainBalance)}` : "Non rattaché"}
          icon={Wallet}
          color={wallet && wallet.totalBalance > 0 ? "success" : "default"}
        />
        <StatCard
          label="Temps en ligne"
          value={onlineDuration > 0 ? formatDuration(onlineDuration) : "—"}
          sub={
            sessionsTotal != null && sessionsTotal > 0
              ? `${sessionsTotal} session${sessionsTotal > 1 ? "s" : ""}${sessions?.some((s) => s.endedAt === null) ? " · en cours" : ""}`
              : "Aucune session"
          }
          icon={Clock}
          color={sessions?.some((s) => s.endedAt === null) ? "success" : "default"}
        />
      </div>

      {/* ── Section : Profil ──────────────────────────────────────────────────── */}
      <SectionLabel>Profil</SectionLabel>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Col gauche : Identité + Courses ─────────────────────────────────── */}
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
              {enriched ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <InfoCell label="Téléphone">
                    <a
                      href={`tel:${enriched.phoneNumber}`}
                      className="inline-flex items-center gap-1 font-mono text-sm text-[color:var(--primary)] hover:underline"
                    >
                      <Phone className="size-3" />
                      {enriched.phoneNumber}
                    </a>
                  </InfoCell>
                  <InfoCell label="Type">
                    <DriverTypeEditor driverId={driverId} current={enriched.driverType as DriverType} />
                  </InfoCell>
                  <InfoCell label="Catégorie tarifaire">
                    <DriverCategoryEditor
                      userId={enriched.userId}
                      driverId={driverId}
                      current={((enriched.category || category || null) as DriverCategory | null)}
                    />
                  </InfoCell>
                  <InfoCell label="Note">
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Star className="size-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                      {enriched.rating.toFixed(2)} / 5
                    </span>
                  </InfoCell>
                  <InfoCell label="Courses">
                    <span className="text-sm font-bold">{totalRides.toLocaleString("fr-FR")}</span>
                  </InfoCell>
                  <InfoCell label="Véhicule">
                    {enriched.isVehicleOwner ? (
                      <Badge tone="primary">Propriétaire</Badge>
                    ) : (
                      <Badge tone="neutral">Plateforme</Badge>
                    )}
                  </InfoCell>
                  <InfoCell label="Approuvé">
                    {enriched.isApproved ? <Badge tone="success">Oui</Badge> : <Badge tone="warning">Non</Badge>}
                  </InfoCell>
                  <InfoCell label="Documents">
                    {isDocumentsVerified ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> Vérifiés
                      </span>
                    ) : pendingDocs > 0 ? (
                      <span className="text-sm font-medium text-[color:var(--warning)]">{pendingDocs} en attente</span>
                    ) : (
                      <span className="text-sm text-[color:var(--muted-foreground)]">Non vérifiés</span>
                    )}
                  </InfoCell>
                  <InfoCell label="Inscrit le">
                    <span className="text-sm">{formatDateTime(enriched.createdAt)}</span>
                  </InfoCell>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                    <InfoCell label="Catégorie"><span className="text-sm">{category}</span></InfoCell>
                    <InfoCell label="Documents">
                      {isDocumentsVerified ? <Badge tone="success">Vérifiés</Badge> : <Badge tone="warning">Non vérifiés</Badge>}
                    </InfoCell>
                    <InfoCell label="Inscrit le"><span className="text-sm">{formatDateTime(createdAt)}</span></InfoCell>
                  </div>
                  <DevNote className="mt-4">
                    Profil enrichi non trouvé dans <code>GET /api/admin/drivers</code> — affichage des seuls IDs et métadonnées passées par la liste.
                  </DevNote>
                </>
              )}
            </CardContent>
          </Card>

          {/* Courses récentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-[color:var(--primary)]" />
                  <CardTitle>Courses récentes ({recentRides.length})</CardTitle>
                </div>
                {recentRides.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-[color:var(--muted-foreground)]">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Gains chauffeur en vert
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <RidesCard rides={recentRides} />
            </CardContent>
          </Card>
        </div>

        {/* Col droite : Véhicule + Wallet ──────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CarIcon className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Véhicule{vehicles.length > 1 ? `s (${vehicles.length})` : ""}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <VehicleCard
                vehicles={vehicles}
                vehiclesError={vehiclesError}
                enrichedVehicle={enriched?.vehicle ?? undefined}
                onNavigate={(id) => router.push(`/vtc/vehicles/${id}`)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Wallet EARNINGS</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <WalletCard wallet={wallet} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section : Finance ─────────────────────────────────────────────────── */}
      {(commissionDebt || hasBonus) && (
        <>
          <SectionLabel>Finance & Bonus</SectionLabel>
          {commissionDebt && (
            <CommissionDebtCard driverId={driverId} debt={commissionDebt} />
          )}

          {hasBonus && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="size-4 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                  <CardTitle>Bonus 4U V3</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6">

                  {/* Paliers Bienvenue */}
                  {bonusAwards.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        Paliers Bienvenue
                      </p>
                      <div className="flex flex-col divide-y divide-[color:var(--border)]">
                        {bonusAwards.map((a) => {
                          const catMeta = VEHICLE_CATEGORY_META[a.vehicleCategory];
                          return (
                            <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-2.5">
                                <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--warning)]/15">
                                  <Star className="size-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                                </span>
                                <div className="flex flex-col leading-tight">
                                  <span className="text-xs font-semibold text-[color:var(--foreground)]">
                                    {a.ridesThreshold} courses atteintes
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Badge tone={catMeta?.tone ?? "neutral"} className="text-[10px]">
                                      {catMeta?.label ?? a.vehicleCategory}
                                    </Badge>
                                    <span className="text-[10px] text-[color:var(--muted-foreground)]">{formatDate(a.awardedAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                +{formatXof(a.bonusAmount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bonus Qualité mensuel */}
                  {bonusQuality.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        Bonus Qualité — mensuel
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[color:var(--border)] text-left">
                              {["Mois", "Catégorie", "Courses", "Note moy.", "Bonus"].map((h, i) => (
                                <th key={h} className={`pb-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] ${i >= 2 ? "text-center" : ""} last:pr-0 last:text-right`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--border)]">
                            {bonusQuality.map((q) => {
                              const catMeta = VEHICLE_CATEGORY_META[q.vehicleCategory];
                              return (
                                <tr key={q.id}>
                                  <td className="py-2 pr-3 font-mono text-[color:var(--foreground)]">{q.yearMonth}</td>
                                  <td className="py-2 pr-3">
                                    <Badge tone={catMeta?.tone ?? "neutral"} className="text-[10px]">
                                      {catMeta?.label ?? q.vehicleCategory}
                                    </Badge>
                                  </td>
                                  <td className="py-2 pr-3 text-center text-[color:var(--foreground)]">{q.ridesCount}</td>
                                  <td className="py-2 pr-3 text-center">
                                    <span className="inline-flex items-center gap-1">
                                      <Star className="size-3 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                                      <span className="font-semibold">{q.averageRating.toFixed(2)}</span>
                                    </span>
                                  </td>
                                  <td className="py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    +{formatXof(q.bonusAmount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bonus Activité quotidien */}
                  {bonusActivity.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        Bonus Activité — jours récents
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[color:var(--border)] text-left">
                              {["Date", "Catégorie", "Courses", "Palier %", "Bonus"].map((h, i) => (
                                <th key={h} className={`pb-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] ${i >= 2 ? "text-center" : ""} last:pr-0 last:text-right`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--border)]">
                            {bonusActivity.map((a) => {
                              const catMeta = VEHICLE_CATEGORY_META[a.vehicleCategory];
                              return (
                                <tr key={a.id}>
                                  <td className="py-2 pr-3 font-mono text-[color:var(--foreground)]">{formatDate(a.activityDate)}</td>
                                  <td className="py-2 pr-3">
                                    <Badge tone={catMeta?.tone ?? "neutral"} className="text-[10px]">
                                      {catMeta?.label ?? a.vehicleCategory}
                                    </Badge>
                                  </td>
                                  <td className="py-2 pr-3 text-center text-[color:var(--foreground)]">{a.ridesCount}</td>
                                  <td className="py-2 pr-3 text-center text-[color:var(--muted-foreground)]">{a.tierPctApplied}%</td>
                                  <td className="py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    +{formatXof(a.bonusAmount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Section : Activité ────────────────────────────────────────────────── */}
      <SectionLabel>Activité</SectionLabel>

      <div className="grid gap-6 xl:grid-cols-2">
        <DailyConnectionTimeCard driverId={driverId} />
        <SessionsCard
          driverId={driverId}
          initialSessions={sessions ?? []}
          initialTotal={sessionsTotal ?? 0}
          initialTotalDuration={sessionsTotalDuration ?? 0}
        />
      </div>

      {/* ── Section : Documents ───────────────────────────────────────────────── */}
      <SectionLabel>Documents</SectionLabel>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[color:var(--primary)]" />
              <CardTitle>Documents ({documents.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isDocumentsVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Tous vérifiés
                </span>
              ) : pendingDocs > 0 ? (
                <Badge tone="warning">{pendingDocs} à vérifier</Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documentsError ? (
            <p className="text-sm text-[color:var(--danger)]">{documentsError}</p>
          ) : (
            <DocumentsList
              documents={documents}
              pathHint={`/vtc/drivers/${driverId}`}
              emptyMessage="Le driver n'a pas encore uploadé de documents."
            />
          )}
        </CardContent>
      </Card>

      {/* ── Section : Notifications ───────────────────────────────────────────── */}
      {driverNotifications.length > 0 && (
        <>
          <SectionLabel>Notifications récentes</SectionLabel>

          <Card className="overflow-hidden p-0">
            <CardHeader className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-[color:var(--primary)]" />
                  <CardTitle>
                    {driverNotifications.length} notification{driverNotifications.length > 1 ? "s" : ""}
                  </CardTitle>
                </div>
                {bonusCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--warning)]">
                    <Star className="size-3 fill-[color:var(--warning)]" />
                    {bonusCount} bonus 4U V3
                  </span>
                )}
              </div>
            </CardHeader>

            <div className="divide-y divide-[color:var(--border)]">
              {driverNotifications.slice(0, 20).map((n) => {
                const chMeta    = CHANNEL_META[n.channel];
                const stMeta    = STATUS_META[n.status];
                const isBonus   = isDriverBonusNotification(n.type);
                const bonusMeta = isBonus
                  ? DRIVER_BONUS_NOTIFICATION_META[n.type as DriverBonusNotificationType]
                  : null;

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[color:var(--muted)]/20 ${
                      isBonus ? "bg-[color:var(--warning)]/5" : ""
                    }`}
                  >
                    {isBonus ? (
                      <span className="mt-0.5 flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--warning)]/20">
                        <Star className="size-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" />
                      </span>
                    ) : (
                      <span className="mt-2 size-1.5 flex-shrink-0 rounded-full bg-[color:var(--muted-foreground)]" />
                    )}

                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isBonus && <Badge tone="warning" className="text-[10px]">Bonus 4U V3</Badge>}
                        <Badge tone={chMeta?.tone ?? "neutral"} className="text-[10px]">
                          {chMeta?.label ?? n.channel}
                        </Badge>
                        <Badge tone={stMeta?.tone ?? "neutral"} className="text-[10px]">
                          {stMeta?.label ?? n.status}
                        </Badge>
                        <span className={`text-[10px] ${isBonus ? "font-semibold text-[color:var(--warning)]" : "font-mono text-[color:var(--muted-foreground)]"}`}>
                          {bonusMeta ? bonusMeta.label : n.type.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                      <p className={`truncate text-xs ${isBonus ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-[color:var(--foreground)]"}`}>
                        {n.message}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] text-[color:var(--muted-foreground)]">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <SuspendDriverModal
        open={!!suspendTarget}
        target={suspendTarget}
        onClose={() => setSuspendTarget(null)}
      />
      <EditDriverModal
        open={editOpen}
        driverId={driverId}
        initial={enriched}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
