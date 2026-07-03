"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Star,
  UserCircle,
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
import {
  DriverInlineActionButton,
  SuspendDriverModal,
  type DriverTarget,
} from "./driver-action-modals";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut : tous" },
  { value: "AVAILABLE", label: "Disponible" },
  { value: "ONLINE", label: "En ligne" },
  { value: "BUSY", label: "En course" },
  { value: "OFFLINE", label: "Hors ligne" },
  { value: "SUSPENDED", label: "Suspendu" },
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Catégorie : toutes" },
  { value: "ECO", label: "Éco" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
  { value: "VIP", label: "VIP" },
];

export interface AdminDriversListClientProps {
  drivers: AdminDriver[];
  total: number;
}

export function AdminDriversListClient({
  drivers,
  total,
}: AdminDriversListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("ALL");
  const [catF, setCatF] = useState("ALL");
  const [suspendTarget, setSuspendTarget] = useState<DriverTarget | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (q) {
        const hay = `${fullName(d)} ${d.phoneNumber} ${d.vehicle?.licensePlate ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusF !== "ALL" && d.status !== statusF) return false;
      if (catF !== "ALL" && d.category !== catF) return false;
      return true;
    });
  }, [drivers, search, statusF, catF]);

  const stats = useMemo(() => {
    // isOnline = app ouverte + GPS (source: /online). Si undefined → données non dispo.
    const hasOnlineData = drivers.some((d) => d.isOnline !== undefined);
    const online = hasOnlineData
      ? drivers.filter((d) => d.isOnline === true).length
      : drivers.filter((d) => d.status === "AVAILABLE" || d.status === "ONLINE" || d.status === "BUSY").length;
    const available = drivers.filter((d) => d.status === "AVAILABLE").length;
    const busy = drivers.filter((d) => d.status === "BUSY").length;
    const suspended = drivers.filter((d) => d.status === "SUSPENDED").length;
    const avgRating =
      drivers.length > 0
        ? drivers.reduce((s, d) => s + (d.rating ?? 0), 0) / drivers.length
        : 0;
    return { online, available, busy, suspended, avgRating, hasOnlineData };
  }, [drivers]);

  const columns: ColumnDef<AdminDriver>[] = [
    {
      key: "driver",
      header: "Driver",
      sortAccessor: (r) => `${r.lastName} ${r.firstName}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={fullName(r)} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {fullName(r)}
            </span>
            <span className="text-[10px] font-mono text-[color:var(--muted-foreground)]">
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
        return (
          <div className="flex flex-col gap-1">
            <Badge tone={m.tone}>{m.label}</Badge>
            {r.isOnline !== undefined && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${r.isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-[color:var(--muted-foreground)]"}`}>
                <span className={`size-1.5 rounded-full ${r.isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                {r.isOnline ? "Connecté" : "Hors connexion"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Catégorie",
      sortAccessor: (r) => r.category,
      render: (r) => <Badge tone="primary">{r.category}</Badge>,
    },
    {
      key: "approved",
      header: "Approuvé",
      sortAccessor: (r) => (r.isApproved ? 1 : 0),
      render: (r) =>
        r.isApproved ? (
          <Badge tone="success">Oui</Badge>
        ) : (
          <Badge tone="warning">Non</Badge>
        ),
    },
    {
      key: "vehicle",
      header: "Véhicule",
      render: (r) =>
        r.vehicle ? (
          <div className="flex flex-col leading-tight">
            <span className="text-sm">
              {r.vehicle.make} {r.vehicle.model}
            </span>
            <span className="font-mono text-[10px] uppercase text-[color:var(--muted-foreground)]">
              {r.vehicle.licensePlate}
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-[color:var(--primary)]">
              {r.vehicle.vehicleType}
            </span>
          </div>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            Aucun
          </span>
        ),
    },
    {
      key: "rating",
      header: "Note",
      align: "right",
      sortAccessor: (r) => r.rating,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-sm">
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
        <span className="text-sm">
          {r.totalRides.toLocaleString("fr-FR")}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Inscrit",
      sortAccessor: (r) => r.createdAt,
      render: (r) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatDate(r.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "SUSPENDED" ? (
            <DriverInlineActionButton
              driverId={r.driverId}
              action="reactivate"
              label="Réactiver"
              size="sm"
            />
          ) : (
            <>
              {!r.isApproved ? (
                <DriverInlineActionButton
                  driverId={r.driverId}
                  action="approve"
                  label="Approuver"
                  size="sm"
                />
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSuspendTarget({
                    driverId: r.driverId,
                    label: fullName(r),
                  })
                }
              >
                <ShieldX className="size-4" />
                Suspendre
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  function buildHref(d: AdminDriver) {
    const sp = new URLSearchParams({
      userId: d.userId,
      category: d.category,
      isDocumentsVerified: String(d.isApproved),
      createdAt: d.createdAt,
      status: d.status,
    });
    return `/vtc/drivers/${d.driverId}?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={stats.hasOnlineData ? "Connectés (temps réel)" : "Drivers actifs"}
          value={String(stats.online)}
          trend={{ value: `${stats.available} statut AVAILABLE`, direction: "flat" }}
          helper={stats.hasOnlineData ? "app ouverte + GPS actif" : `${drivers.length} au total`}
          icon={Bike}
          tone="success"
        />
        <StatCard
          label="Note moyenne"
          value={stats.avgRating.toFixed(2)}
          trend={{ value: "★ sur 5", direction: "flat" }}
          helper="basé sur les avis clients"
          icon={Star}
          tone="primary"
        />
        <StatCard
          label="Comptes suspendus"
          value={String(stats.suspended)}
          trend={{ value: "à réviser", direction: "flat" }}
          helper="motifs SAV ou KYC"
          icon={ShieldCheck}
          tone="warning"
        />
        <StatCard
          label="Total drivers"
          value={String(total)}
          trend={{ value: "live", direction: "flat" }}
          helper="enregistrés sur la plateforme"
          icon={UserCircle}
          tone="secondary"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher (nom, téléphone, plaque)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={statusF}
            onChange={setStatusF}
            className="sm:w-44"
          />
          <Combobox
            options={CATEGORY_OPTIONS}
            value={catF}
            onChange={setCatF}
            className="sm:w-44"
          />
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
            onClick={() =>
              downloadCsv(
                timestampedFilename("drivers"),
                [
                  { key: "id", header: "Driver ID", value: (r) => r.driverId },
                  { key: "name", header: "Nom", value: (r) => fullName(r) },
                  { key: "phone", header: "Téléphone", value: (r) => r.phoneNumber },
                  { key: "status", header: "Statut", value: (r) => r.status },
                  { key: "cat", header: "Catégorie", value: (r) => r.category },
                  { key: "rating", header: "Note", value: (r) => r.rating },
                  { key: "rides", header: "Courses", value: (r) => r.totalRides },
                  { key: "plate", header: "Plaque", value: (r) => r.vehicle?.licensePlate ?? "" },
                  { key: "approved", header: "Approuvé", value: (r) => (r.isApproved ? "oui" : "non") },
                  { key: "createdAt", header: "Inscrit", value: (r) => r.createdAt },
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

      {drivers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <CheckCircle2 className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Aucun driver
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.driverId}
            rowHref={buildHref}
            defaultSort={{ key: "rating", direction: "desc" }}
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
