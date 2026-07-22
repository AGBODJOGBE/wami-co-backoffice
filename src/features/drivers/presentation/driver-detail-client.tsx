"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Car as CarIcon,
  CheckCircle2,
  Clock,
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
import { DocumentsList } from "@/features/documents/presentation/documents-list";
import { formatDate, formatDateTime, formatXof } from "@/shared/lib/format";
import { CanView } from "@/shared/ui/can-view";
import {
  DriverInlineActionButton,
  SuspendDriverModal,
  type DriverTarget,
} from "./driver-action-modals";
import { fetchDriverSessionsAction, updateDriverInfoAction } from "../application/actions";
import {
  ADMIN_DRIVER_STATUS_META,
  fullName,
  type AdminDriver,
  type AdminDriverStatus,
  type DriverCommissionDebtDetail,
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
import type { DriverConnectionSession, SessionEndReason } from "../domain/admin-driver";

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
  const [sessions, setSessions] = useState(initialSessions);
  const [total, setTotal] = useState(initialTotal);
  const [totalDuration, setTotalDuration] = useState(initialTotalDuration);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, start] = useTransition();

  function fetch(nextPage: number, f: string, t: string) {
    start(async () => {
      const res = await fetchDriverSessionsAction(driverId, {
        page: nextPage,
        limit: LIMIT,
        from: f || undefined,
        to: t || undefined,
      });
      setSessions(res.sessions);
      setTotal(res.total);
      setTotalDuration(res.totalDurationSeconds);
      setPage(nextPage);
    });
  }

  function applyFilters() {
    fetch(1, from, to);
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    fetch(1, "", "");
  }

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
              Durée totale (filtre) :{" "}
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
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Du
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Au
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>
            <Button size="sm" onClick={applyFilters} isLoading={pending}>
              Filtrer
            </Button>
            {(from || to) && (
              <Button size="sm" variant="ghost" onClick={resetFilters} disabled={pending}>
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Table */}
          {sessions.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucune session sur cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[color:var(--border)] text-left text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    <th className="pb-2 pr-4">Début</th>
                    <th className="pb-2 pr-4">Fin</th>
                    <th className="pb-2 pr-4">Durée</th>
                    <th className="pb-2">Raison</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-[color:var(--border)] transition-opacity ${pending ? "opacity-50" : ""}`}>
                  {sessions.map((s) => {
                    const meta = s.endReason ? SESSION_END_REASON_META[s.endReason] : null;
                    return (
                      <tr key={s.id}>
                        <td className="py-2 pr-4 text-[color:var(--foreground)]">
                          {formatDateTime(s.startedAt)}
                        </td>
                        <td className="py-2 pr-4 text-[color:var(--muted-foreground)]">
                          {s.endedAt ? (
                            formatDateTime(s.endedAt)
                          ) : (
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
                          {meta ? (
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          ) : (
                            <span className="text-[color:var(--muted-foreground)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3">
              <span className="text-[11px] text-[color:var(--muted-foreground)]">
                Page {page} / {totalPages} — {total} session{total > 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetch(page - 1, from, to)}
                  disabled={page <= 1 || pending}
                >
                  ← Précédent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetch(page + 1, from, to)}
                  disabled={page >= totalPages || pending}
                >
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
      <div className="mt-1.5 text-sm font-bold text-[color:var(--foreground)]">
        {value}
      </div>
      {sub && (
        <p className="mt-0.5 text-[10px] text-[color:var(--muted-foreground)]">
          {sub}
        </p>
      )}
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
        {online.isInRide && (
          <Badge tone="primary">En course</Badge>
        )}
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
    return (
      <p className="text-sm text-[color:var(--danger)]">{vehiclesError}</p>
    );
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
                {v.category && (
                  <Badge tone="primary">{VEHICLE_CATEGORY_LABELS[v.category]}</Badge>
                )}
                <Badge tone={v.ownership === "PLATFORM" ? "info" : "neutral"}>
                  {VEHICLE_OWNERSHIP_LABELS[v.ownership]}
                </Badge>
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
          <span>·</span>
          <span>{enrichedVehicle.color}</span>
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
      <p className="text-sm text-[color:var(--muted-foreground)]">
        Aucun véhicule rattaché
      </p>
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
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Aucun wallet rattaché
        </p>
      </div>
    );
  }

  const total = wallet.totalBalance;
  const pctMain = total > 0 ? (wallet.mainBalance / total) * 100 : 0;
  const pctBonus = total > 0 ? (wallet.bonusBalance / total) * 100 : 0;
  const pctRef = total > 0 ? (wallet.referralBalance / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Total */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Solde total
          </span>
          <span className="text-2xl font-bold tabular-nums text-[color:var(--foreground)]">
            {formatXof(wallet.totalBalance)}
          </span>
        </div>
        <Badge tone={wallet.status === "ACTIVE" ? "success" : "neutral"}>
          {wallet.status === "ACTIVE" ? "Actif" : wallet.status}
        </Badge>
      </div>

      {/* Visual bar */}
      {total > 0 && (
        <div className="flex h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-[color:var(--primary)] transition-all"
            style={{ width: `${pctMain}%` }}
          />
          <div
            className="bg-[color:var(--warning)] transition-all"
            style={{ width: `${pctBonus}%` }}
          />
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${pctRef}%` }}
          />
        </div>
      )}

      {/* Sub-balances */}
      <dl className="flex flex-col gap-2 text-sm">
        {[
          {
            label: "Principal",
            value: wallet.mainBalance,
            color: "bg-[color:var(--primary)]",
          },
          {
            label: "Bonus",
            value: wallet.bonusBalance,
            color: "bg-[color:var(--warning)]",
          },
          {
            label: "Parrainage",
            value: wallet.referralBalance,
            color: "bg-emerald-500",
          },
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

// ─── RidesCard ────────────────────────────────────────────────────────────────

function RidesCard({ rides }: { rides: AdminRide[] }) {
  if (rides.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--muted)]">
          <History className="size-5 text-[color:var(--muted-foreground)]" />
        </div>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Aucune course récente
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[color:var(--border)]">
      {rides.map((r) => {
        const meta = rideStatusMeta(r.status);
        const price = r.pricing.finalPrice ?? r.pricing.estimatedPrice;
        const earnings = r.pricing.driverEarnings;
        const pickup = r.pickup?.address ?? null;
        const dropoff = r.dropoff?.address ?? null;

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
                <span className="text-[10px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
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

// ─── EditDriverModal ──────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: "", label: "Non précisé" },
  { value: "MALE", label: "Homme" },
  { value: "FEMALE", label: "Femme" },
];

function EditDriverModal({
  open,
  driverId,
  initial,
  onClose,
}: {
  open: boolean;
  driverId: string;
  initial?: AdminDriver;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const [gender, setGender] = useState<"" | "MALE" | "FEMALE">("");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: UpdateDriverInfoInput = {};
    if (firstName.trim()) input.firstName = firstName.trim();
    if (lastName.trim()) input.lastName = lastName.trim();
    if (phoneNumber.trim()) input.phoneNumber = phoneNumber.trim();
    if (gender) input.gender = gender;

    startSave(async () => {
      const res = await updateDriverInfoAction(driverId, input);
      if (res.ok) {
        setSuccess(true);
        setTimeout(onClose, 800);
      } else {
        setError(res.message);
      }
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
          <button
            type="button"
            onClick={onClose}
            className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Prénom
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={initial?.firstName}
                className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Nom
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={initial?.lastName}
                className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Téléphone
            </label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={initial?.phoneNumber}
              className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Genre
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "" | "MALE" | "FEMALE")}
              className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              Informations mises à jour.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-[color:var(--border)] pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CommissionDebtCard ───────────────────────────────────────────────────────

const DEBT_SOURCE_META: Record<string, { label: string; tone: "primary" | "info" | "warning" }> = {
  RIDE:                  { label: "Course",    tone: "primary" },
  B2C_DELIVERY:          { label: "Livraison", tone: "info"    },
  CONTRACT_INSTALLMENT:  { label: "Contrat",   tone: "warning" },
};

function CommissionDebtCard({ debt }: { debt: DriverCommissionDebtDetail }) {
  const hasDebt = debt.debtAmount < 0;

  return (
    <Card className={hasDebt ? "border-[color:var(--danger)]/40" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingDown className={`size-4 ${hasDebt ? "text-[color:var(--danger)]" : "text-[color:var(--muted-foreground)]"}`} />
            <CardTitle>Commission & dette EARNINGS</CardTitle>
          </div>
          <Badge tone={hasDebt ? "danger" : "success"}>
            {hasDebt ? `Dette : ${formatXof(Math.abs(debt.debtAmount))}` : "À jour"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Solde courant */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[color:var(--border)] p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Solde EARNINGS
              </span>
              <span className={`text-lg font-bold tabular-nums ${debt.currentBalance < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--foreground)]"}`}>
                {formatXof(debt.currentBalance)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Montant dû
              </span>
              <span className={`text-lg font-bold tabular-nums ${hasDebt ? "text-[color:var(--danger)]" : "text-emerald-600 dark:text-emerald-400"}`}>
                {hasDebt ? `−${formatXof(Math.abs(debt.debtAmount))}` : formatXof(0)}
              </span>
            </div>
          </div>

          {/* Transactions sources */}
          {debt.items.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucune transaction à l&apos;origine de la dette.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[color:var(--border)] text-left text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    <th className="pb-2 pr-4">Source</th>
                    <th className="pb-2 pr-4">Référence</th>
                    <th className="pb-2 pr-4 text-right">Montant</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {debt.items.map((item) => {
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
              {debt.total > debt.items.length && (
                <p className="mt-2 text-[11px] text-[color:var(--muted-foreground)]">
                  {debt.items.length} affichés sur {debt.total} transactions.
                </p>
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
}: DriverDetailClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [suspendTarget, setSuspendTarget] = useState<DriverTarget | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const statusMeta = ADMIN_DRIVER_STATUS_META[status];
  const displayName = enriched ? fullName(enriched) : `Driver #${driverId.slice(0, 8)}`;

  const pendingDocs = documents.filter((d) => d.status === "PENDING").length;
  const isSuspended = status === "SUSPENDED";

  const totalRides = enriched
    ? Math.max(enriched.totalRides, recentRides.length)
    : recentRides.length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <DetailHeader
        backHref="/vtc/drivers"
        backLabel="Retour aux drivers"
        eyebrow={enriched ? `Driver · ${enriched.driverType}` : "Driver"}
        title={displayName}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <CopyableId id={driverId} prefix="Driver" />
            <CopyableId id={userId} prefix="User" />
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
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <CanView permission="driver.update">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Modifier
              </Button>
            </CanView>
            {(status === "PENDING" || status === "OFFLINE") && !enriched?.isApproved && (
              <CanView permission="driver.approve">
                <DriverInlineActionButton
                  driverId={driverId}
                  action="approve"
                  label="Approuver"
                  size="sm"
                />
              </CanView>
            )}
            {isSuspended ? (
              <CanView permission="driver.reactivate">
                <DriverInlineActionButton
                  driverId={driverId}
                  action="reactivate"
                  label="Réactiver"
                  size="sm"
                  variant="primary"
                />
              </CanView>
            ) : (
              <CanView permission="driver.suspend">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendTarget({ driverId, label: displayName })}
                >
                  <ShieldX className="size-4" />
                  Suspendre
                </Button>
              </CanView>
            )}
          </>
        }
      />

      {/* ── Suspension alert ─────────────────────────────────────────────────── */}
      {isSuspended && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/8 px-4 py-3">
          <AlertTriangle className="size-5 flex-shrink-0 text-[color:var(--danger)]" />
          <p className="text-sm font-semibold text-[color:var(--danger)]">
            Ce driver est suspendu et ne peut pas accepter de courses.
          </p>
        </div>
      )}

      {/* ── Real-time GPS banner ─────────────────────────────────────────────── */}
      {online && <OnlineBanner online={online} />}

      {/* ── KPI stats ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MiniStat
          label="Note moyenne"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-4 fill-[color:var(--warning)] text-[color:var(--warning)]" />
              {enriched ? enriched.rating.toFixed(2) : "—"}
            </span>
          }
          sub="sur 5.00"
          icon={Star}
        />
        <MiniStat
          label="Courses totales"
          value={totalRides.toLocaleString("fr-FR")}
          sub={recentRides.length > 0 ? `${recentRides.length} récentes affichées` : undefined}
          icon={TrendingUp}
          accent={totalRides > 0}
        />
        <MiniStat
          label="Temps en ligne"
          value={(() => {
            // Backend totalDurationSeconds n'inclut que les sessions fermées.
            // Si une session est encore ouverte (endedAt=null), on ajoute le temps écoulé depuis startedAt.
            const base = sessionsTotalDuration ?? 0;
            const openSession = sessions?.find((s) => s.endedAt === null);
            const liveExtra = openSession
              ? Math.floor((Date.now() - new Date(openSession.startedAt).getTime()) / 1000)
              : 0;
            const total = base + liveExtra;
            return total > 0 ? formatDuration(total) : "—";
          })()}
          sub={
            sessionsTotal != null && sessionsTotal > 0
              ? `${sessionsTotal} session${sessionsTotal > 1 ? "s" : ""}${sessions?.some((s) => s.endedAt === null) ? " · en cours" : ""}`
              : undefined
          }
          icon={Clock}
        />
        <MiniStat
          label="Wallet EARNINGS"
          value={wallet ? formatXof(wallet.totalBalance) : "—"}
          sub={wallet ? `Principal : ${formatXof(wallet.mainBalance)}` : "Non rattaché"}
          icon={Wallet}
        />
        <MiniStat
          label="Documents"
          value={
            isDocumentsVerified ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                Vérifiés
              </span>
            ) : pendingDocs > 0 ? (
              <span className="text-[color:var(--warning)]">
                {pendingDocs} en attente
              </span>
            ) : (
              <span className="text-[color:var(--muted-foreground)]">Non vérifiés</span>
            )
          }
          sub={`${documents.length} document${documents.length > 1 ? "s" : ""} uploadé${documents.length > 1 ? "s" : ""}`}
          icon={ShieldCheck}
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left — Identité + Courses ────────────────────────── */}
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
                {enriched ? (
                  <>
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
                      <Badge tone="info">{enriched.driverType}</Badge>
                    </InfoCell>
                    <InfoCell label="Catégorie profil">
                      <span className="text-sm font-medium">{enriched.category || "—"}</span>
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
                    <InfoCell label="Propriétaire véhicule">
                      {enriched.isVehicleOwner ? (
                        <Badge tone="primary">Oui — Perso</Badge>
                      ) : (
                        <Badge tone="neutral">Non — Plateforme</Badge>
                      )}
                    </InfoCell>
                    <InfoCell label="Approuvé">
                      {enriched.isApproved ? (
                        <Badge tone="success">Oui</Badge>
                      ) : (
                        <Badge tone="warning">Non</Badge>
                      )}
                    </InfoCell>
                    <InfoCell label="Inscrit le">
                      <span className="text-sm">{formatDateTime(enriched.createdAt)}</span>
                    </InfoCell>
                    <InfoCell label="Statut">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </InfoCell>
                  </>
                ) : (
                  <>
                    <InfoCell label="Catégorie">
                      <span className="text-sm">{category}</span>
                    </InfoCell>
                    <InfoCell label="Documents vérifiés">
                      {isDocumentsVerified ? (
                        <Badge tone="success">Oui</Badge>
                      ) : (
                        <Badge tone="warning">Non</Badge>
                      )}
                    </InfoCell>
                    <InfoCell label="Inscrit le">
                      <span className="text-sm">{formatDateTime(createdAt)}</span>
                    </InfoCell>
                  </>
                )}
              </div>

              {!enriched && (
                <DevNote className="mt-4">
                  Profil enrichi non trouvé dans{" "}
                  <code>GET /api/admin/drivers</code> — affichage des seuls IDs
                  et métadonnées passées par la liste.
                </DevNote>
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
                  <div className="flex items-center gap-3 text-xs text-[color:var(--muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Gains driver
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <RidesCard rides={recentRides} />
            </CardContent>
          </Card>
        </div>

        {/* Right — Véhicule + Wallet ─────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Véhicule */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CarIcon className="size-4 text-[color:var(--primary)]" />
                <CardTitle>
                  Véhicule{vehicles.length > 1 ? `s (${vehicles.length})` : ""}
                </CardTitle>
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

          {/* Wallet */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-[color:var(--primary)]" />
                <CardTitle>Wallet</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <WalletCard wallet={wallet} />
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
                  { label: "Driver ID", value: <CopyableId id={driverId} prefix="" /> },
                  { label: "User ID", value: <CopyableId id={userId} prefix="" /> },
                  { label: "Statut", value: <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge> },
                  {
                    label: "Inscrit le",
                    value: formatDateTime(enriched?.createdAt ?? createdAt),
                  },
                  online
                    ? {
                        label: "Dernière position",
                        value: (
                          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                            {online.latitude.toFixed(4)}, {online.longitude.toFixed(4)}
                          </span>
                        ),
                      }
                    : null,
                ]
                  .filter(Boolean)
                  .map((row) => (
                    <div
                      key={row!.label}
                      className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        {row!.label}
                      </dt>
                      <dd className="text-sm text-[color:var(--foreground)]">
                        {row!.value as React.ReactNode}
                      </dd>
                    </div>
                  ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Commission & dette EARNINGS ──────────────────────────────────────── */}
      {commissionDebt && <CommissionDebtCard debt={commissionDebt} />}

      {/* ── Sessions de connexion ────────────────────────────────────────────── */}
      <SessionsCard
        driverId={driverId}
        initialSessions={sessions ?? []}
        initialTotal={sessionsTotal ?? 0}
        initialTotalDuration={sessionsTotalDuration ?? 0}
      />

      {/* ── Documents ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[color:var(--primary)]" />
              <CardTitle>Documents ({documents.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isDocumentsVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Tous vérifiés
                </span>
              )}
              {pendingDocs > 0 && (
                <Badge tone="warning">{pendingDocs} à vérifier</Badge>
              )}
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

// ─── InfoCell ─────────────────────────────────────────────────────────────────

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
