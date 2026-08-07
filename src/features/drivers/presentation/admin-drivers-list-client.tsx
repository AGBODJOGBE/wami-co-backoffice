"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Star,
  UserCheck,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import {
  DataTable,
  PaginationFooter,
  type ColumnDef,
} from "@/shared/ui/data-table";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDate } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import {
  ADMIN_DRIVER_STATUS_META,
  fullName,
  type AdminDriver,
  type AdminDriverStatus,
} from "../domain/admin-driver";
import { CanView } from "@/shared/ui/can-view";
import {
  DriverInlineActionButton,
  SuspendDriverModal,
  type DriverTarget,
} from "./driver-action-modals";

const STATUS_OPTIONS = [
  { value: "ALL",       label: "Statut : tous"   },
  { value: "AVAILABLE", label: "Disponible"       },
  { value: "ONLINE",    label: "En ligne"         },
  { value: "BUSY",      label: "En course"        },
  { value: "OFFLINE",   label: "Hors ligne"       },
  { value: "SUSPENDED", label: "Suspendu"         },
];

const CATEGORY_OPTIONS = [
  { value: "ALL",      label: "Catégorie : toutes" },
  { value: "ECO",      label: "Éco"               },
  { value: "STANDARD", label: "Standard"           },
  { value: "PREMIUM",  label: "Premium"            },
  { value: "VIP",      label: "VIP"               },
];

type SessionEntry = { totalSeconds: number; openSince: string | null };

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

export interface AdminDriversListClientProps {
  drivers: AdminDriver[];
  total: number;
  sessionMap?: Map<string, SessionEntry>;
}

export function AdminDriversListClient({
  drivers,
  total,
  sessionMap,
}: AdminDriversListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search,  setSearch]  = useState("");
  const [statusF, setStatusF] = useState("ALL");
  const [catF,    setCatF]    = useState("ALL");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); }, []);
  const [suspendTarget, setSuspendTarget] = useState<DriverTarget | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (q) {
        const hay = `${fullName(d)} ${d.phoneNumber} ${d.vehicle?.licensePlate ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusF !== "ALL" && d.status !== statusF) return false;
      if (catF !== "ALL" && (d.vehicle?.vehicleCategory ?? d.category) !== catF) return false;
      return true;
    });
  }, [drivers, search, statusF, catF]);

  const stats = useMemo(() => {
    const hasOnlineData = drivers.some((d) => d.isOnline !== undefined);
    const online = hasOnlineData
      ? drivers.filter((d) => d.isOnline === true).length
      : drivers.filter((d) => ["AVAILABLE", "ONLINE", "BUSY"].includes(d.status)).length;
    const busy      = drivers.filter((d) => d.status === "BUSY").length;
    const suspended = drivers.filter((d) => d.status === "SUSPENDED").length;
    const avgRating = drivers.length > 0
      ? drivers.reduce((s, d) => s + (d.rating ?? 0), 0) / drivers.length
      : 0;
    return { online, busy, suspended, avgRating, hasOnlineData };
  }, [drivers]);

  const columns: ColumnDef<AdminDriver>[] = [
    {
      key: "pilote",
      header: "Pilote",
      sortAccessor: (r) => `${r.lastName} ${r.firstName}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar name={fullName(r)} />
            {r.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full border-2 border-[color:var(--background)] bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                {fullName(r)}
              </span>
              {r.isApproved && (
                <UserCheck className="size-3 text-emerald-500" aria-label="Approuvé" />
              )}
            </div>
            <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
              {r.phoneNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (r) => r.status,
      render: (r) => {
        const m = ADMIN_DRIVER_STATUS_META[r.status as AdminDriverStatus] ?? {
          label: r.status,
          tone: "neutral" as const,
        };
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    {
      key: "vehicle",
      header: "Véhicule",
      render: (r) => {
        if (!r.vehicle) return (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">Aucun</span>
        );
        const cat = r.vehicle.vehicleCategory ?? r.category;
        return (
          <div className="flex flex-col gap-0.5 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                {r.vehicle.make} {r.vehicle.model}
              </span>
              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                r.isVehicleOwner
                  ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              }`}>
                {r.isVehicleOwner ? "Perso" : "Plateforme"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
                {r.vehicle.licensePlate}
              </span>
              {cat && (
                <Badge tone="primary" className="text-[9px]">{cat}</Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "rating",
      header: "Note",
      align: "right",
      sortAccessor: (r) => r.rating,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-sm tabular-nums">
          <Star className="size-3 fill-[color:var(--warning)] text-[color:var(--warning)]" />
          {r.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "rides",
      header: "Courses",
      align: "right",
      sortAccessor: (r) => r.totalRides,
      render: (r) => (
        <span className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
          {r.totalRides.toLocaleString("fr-FR")}
        </span>
      ),
    },
    {
      key: "onlineTime",
      header: "Connexion",
      sortAccessor: (r) => {
        const s = sessionMap?.get(r.driverId);
        if (!s) return 0;
        const elapsed = s.openSince && now
          ? Math.floor((now - new Date(s.openSince).getTime()) / 1000)
          : 0;
        return s.totalSeconds + elapsed;
      },
      render: (r) => {
        const s = sessionMap?.get(r.driverId);
        if (!s) return <span className="text-xs text-[color:var(--muted-foreground)]">—</span>;
        const elapsed = s.openSince && now
          ? Math.floor((now - new Date(s.openSince).getTime()) / 1000)
          : 0;
        const totalSec = s.totalSeconds + elapsed;
        return (
          <div className="flex flex-col leading-tight gap-0.5">
            <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
              {totalSec > 0 ? formatDuration(totalSec) : "—"}
              {s.openSince && (
                <Zap className="size-3 text-emerald-500" />
              )}
            </span>
            {s.openSince && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                En ligne
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "SUSPENDED" ? (
            <CanView permission="driver.reactivate">
              <DriverInlineActionButton driverId={r.driverId} action="reactivate" label="Réactiver" size="sm" />
            </CanView>
          ) : (
            <>
              {!r.isApproved && (
                <CanView permission="driver.approve">
                  <DriverInlineActionButton driverId={r.driverId} action="approve" label="Approuver" size="sm" />
                </CanView>
              )}
              <CanView permission="driver.suspend">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendTarget({ driverId: r.driverId, label: fullName(r) })}
                >
                  <ShieldX className="size-4" />
                  Suspendre
                </Button>
              </CanView>
            </>
          )}
        </div>
      ),
    },
  ];

  function buildHref(d: AdminDriver) {
    const sp = new URLSearchParams({
      userId:              d.userId,
      category:            d.category,
      isDocumentsVerified: String(d.isApproved),
      createdAt:           d.createdAt,
      status:              d.status,
    });
    return `/vtc/drivers/${d.driverId}?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={stats.hasOnlineData ? "Pilotes connectés" : "Pilotes actifs"}
          value={String(stats.online)}
          trend={{ value: "app ouverte + GPS", direction: "flat" }}
          helper={stats.hasOnlineData ? "temps réel" : `${drivers.length} au total`}
          icon={Users}
          tone="success"
        />
        <StatCard
          label="En course"
          value={String(stats.busy)}
          trend={{ value: `sur ${total} pilotes`, direction: "flat" }}
          helper="courses en cours"
          icon={UserCheck}
          tone="primary"
        />
        <StatCard
          label="Note moyenne"
          value={stats.avgRating.toFixed(2)}
          trend={{ value: "★ sur 5", direction: "flat" }}
          helper="avis clients"
          icon={Star}
          tone="warning"
        />
        <StatCard
          label="Suspendus"
          value={String(stats.suspended)}
          trend={{ value: "à traiter", direction: stats.suspended > 0 ? "down" : "flat" }}
          helper="motifs SAV ou KYC"
          icon={ShieldCheck}
          tone={stats.suspended > 0 ? "danger" : "secondary"}
        />
      </section>

      {/* ── Barre de filtres ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3">
        <SearchField
          placeholder="Nom, téléphone, plaque…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-60"
        />
        <Combobox options={STATUS_OPTIONS} value={statusF} onChange={setStatusF} className="sm:w-44" />
        <Combobox options={CATEGORY_OPTIONS} value={catF} onChange={setCatF} className="sm:w-44" />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Rafraîchir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                timestampedFilename("pilotes"),
                [
                  { key: "id",       header: "ID Pilote",  value: (r) => r.driverId                                  },
                  { key: "nom",      header: "Nom",        value: (r) => fullName(r)                                  },
                  { key: "phone",    header: "Téléphone",  value: (r) => r.phoneNumber                                },
                  { key: "statut",   header: "Statut",     value: (r) => r.status                                     },
                  { key: "categorie",header: "Catégorie",  value: (r) => r.vehicle?.vehicleCategory ?? r.category ?? "" },
                  { key: "note",     header: "Note",       value: (r) => r.rating                                     },
                  { key: "courses",  header: "Courses",    value: (r) => r.totalRides                                 },
                  { key: "plaque",   header: "Plaque",     value: (r) => r.vehicle?.licensePlate ?? ""                },
                  { key: "approuve", header: "Approuvé",   value: (r) => (r.isApproved ? "oui" : "non")               },
                  { key: "inscription", header: "Inscrit", value: (r) => r.createdAt                                  },
                ],
                filtered,
              )
            }
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {drivers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <UserCircle className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Aucun pilote trouvé
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.driverId}
            rowHref={buildHref}
            defaultSort={{ key: "rides", direction: "desc" }}
          />
          <PaginationFooter total={total} shown={filtered.length} />
        </Card>
      )}

      <SuspendDriverModal
        open={!!suspendTarget}
        target={suspendTarget}
        onClose={() => setSuspendTarget(null)}
      />
    </div>
  );
}
