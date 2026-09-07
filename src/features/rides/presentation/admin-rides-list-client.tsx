"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Car,
  Clock,
  Download,
  Ghost,
  RefreshCw,
  Search,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import {
  DataTable,
  PaginationFooter,
  type ColumnDef,
} from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs } from "@/shared/ui/tabs";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import {
  fullParty,
  ghostRideLabel,
  isGhostRide,
  rideStatusMeta,
  type AdminRide,
} from "../domain/admin-ride";
import { InterventionDesignModal } from "./intervention-design-modal";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut : tous" },
  { value: "REQUESTED", label: "Demandée" },
  { value: "MATCHED", label: "Matchée" },
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "ARRIVED", label: "Arrivé pickup" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "PAUSED", label: "En pause" },
  { value: "COMPLETED", label: "Terminée" },
  { value: "RATED", label: "Notée" },
  { value: "CANCELLED_PASSENGER", label: "Annulée (passager)" },
  { value: "CANCELLED_DRIVER", label: "Annulée (driver)" },
  { value: "CANCELLED_SYSTEM", label: "Annulée (système)" },
  { value: "DISPUTED", label: "Litigieuse" },
];

const VEHICLE_OPTIONS = [
  { value: "ALL", label: "Véhicule : tous" },
  { value: "MOTO", label: "Moto" },
  { value: "STANDARD", label: "Standard" },
  { value: "CONFORT", label: "Confort" },
  { value: "VIP", label: "VIP" },
  { value: "VAN", label: "Van" },
  { value: "TRICYCLE", label: "Tricycle" },
];

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "Paiement : tous" },
  { value: "CASH", label: "Cash" },
  { value: "WALLET", label: "Wallet" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
];

const CLIENT_OPTIONS = [
  { value: "ALL",   label: "Client : tous" },
  { value: "REAL",  label: "Client réel" },
  { value: "GHOST", label: "Client fantôme" },
];

const IN_PROGRESS_STATUSES = [
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "PAUSED",
];
const PENDING_STATUSES = ["REQUESTED", "MATCHED"];
const COMPLETED_STATUSES = ["COMPLETED", "RATED"];
const CANCELLED_STATUSES = [
  "CANCELLED_PASSENGER",
  "CANCELLED_DRIVER",
  "CANCELLED_SYSTEM",
  "DISPUTED",
];

/** A ride is "force-actionable" when it isn't in a terminal state. */
const TERMINAL_STATUSES = new Set<string>([
  "COMPLETED",
  "RATED",
  "CANCELLED_PASSENGER",
  "CANCELLED_DRIVER",
  "CANCELLED_SYSTEM",
]);

export interface AdminRidesListClientProps {
  rides: AdminRide[];
  total: number;
  error?: string;
}

const PAGE_SIZE = 50;

export function AdminRidesListClient({
  rides,
  total,
  error,
}: AdminRidesListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("ALL");
  const [vehicleF, setVehicleF] = useState("ALL");
  const [paymentF, setPaymentF] = useState("ALL");
  const [clientF, setClientF] = useState("ALL");
  const [page, setPage] = useState(1);
  const [interventionOpen, setInterventionOpen] = useState(false);
  /** When a row "Modifier statut" is clicked, we pre-fill the modal with
   *  that specific ride so the admin doesn't have to paste a UUID. */
  const [interventionTarget, setInterventionTarget] =
    useState<AdminRide | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rides.filter((r) => {
      if (q) {
        const hay = `${r.rideNumber} ${fullParty(r.passenger)} ${fullParty(r.driver)} ${r.passenger?.phoneNumber ?? ""} ${r.driver?.phoneNumber ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusF !== "ALL" && r.status !== statusF) return false;
      if (vehicleF !== "ALL" && r.vehicleType !== vehicleF) return false;
      if (paymentF !== "ALL" && r.paymentMethod !== paymentF) return false;
      if (clientF === "GHOST" && !isGhostRide(r)) return false;
      if (clientF === "REAL"  &&  isGhostRide(r)) return false;
      return true;
    });
  }, [rides, search, statusF, vehicleF, paymentF, clientF]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, statusF, vehicleF, paymentF, clientF]);

  const stats = useMemo(() => {
    const inProgress = rides.filter((r) =>
      IN_PROGRESS_STATUSES.includes(r.status),
    ).length;
    const pending = rides.filter((r) =>
      PENDING_STATUSES.includes(r.status),
    ).length;
    const completed = rides.filter((r) =>
      COMPLETED_STATUSES.includes(r.status),
    ).length;
    const cancelled = rides.filter((r) =>
      CANCELLED_STATUSES.includes(r.status),
    ).length;
    const totalRevenue = rides
      .filter((r) => COMPLETED_STATUSES.includes(r.status))
      .reduce((s, r) => s + (r.pricing?.finalPrice || r.pricing?.estimatedPrice || 0), 0);
    const cancelRate =
      rides.length > 0 ? (cancelled / rides.length) * 100 : 0;
    const avgFinal =
      completed > 0
        ? rides
            .filter((r) => COMPLETED_STATUSES.includes(r.status))
            .reduce(
              (s, r) => s + (r.pricing?.finalPrice || r.pricing?.estimatedPrice || 0),
              0,
            ) / completed
        : 0;
    const ghost = rides.filter((r) => isGhostRide(r)).length;
    return {
      inProgress,
      pending,
      completed,
      cancelled,
      totalRevenue,
      cancelRate,
      avgFinal,
      ghost,
    };
  }, [rides]);

  const columns: ColumnDef<AdminRide>[] = [
    {
      key: "ride",
      header: "Course",
      sortAccessor: (r) => r.rideNumber,
      render: (r) => (
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs font-semibold">
            {r.rideNumber}
          </span>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {r.vehicleType} · {r.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: "passenger",
      header: "Passager",
      sortAccessor: (r) => fullParty(r.passenger),
      render: (r) => {
        const ghost = isGhostRide(r);
        return (
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              {ghost ? (
                <span
                  title="Course sans passager app réel (walk-in ou compte fantôme)"
                  className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                >
                  <Ghost className="size-3" />
                  {ghostRideLabel(r)}
                </span>
              ) : (
                <span className="text-sm font-medium">{fullParty(r.passenger)}</span>
              )}
            </div>
            {!ghost && r.passenger?.phoneNumber ? (
              <a
                href={`tel:${r.passenger.phoneNumber}`}
                className="font-mono text-[10px] text-[color:var(--primary)] hover:underline"
                data-no-row-click
              >
                {r.passenger.phoneNumber}
              </a>
            ) : null}
            {ghost && r.passenger?.phoneNumber && (
              <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                {r.passenger.phoneNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "driver",
      header: "Driver",
      sortAccessor: (r) => fullParty(r.driver),
      render: (r) =>
        r.driver ? (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{fullParty(r.driver)}</span>
            {r.driver.phoneNumber ? (
              <a
                href={`tel:${r.driver.phoneNumber}`}
                className="font-mono text-[10px] text-[color:var(--primary)] hover:underline"
                data-no-row-click
              >
                {r.driver.phoneNumber}
              </a>
            ) : null}
          </div>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">
            non assigné
          </span>
        ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (r) => r.status,
      render: (r) => {
        const m = rideStatusMeta(r.status);
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    {
      key: "price",
      header: "Prix",
      align: "right",
      sortAccessor: (r) => r.pricing?.finalPrice ?? r.pricing?.estimatedPrice ?? 0,
      render: (r) => {
        const final = r.pricing?.finalPrice;
        const estimated = r.pricing?.estimatedPrice;
        const display = final ?? estimated;
        const surge = r.pricing?.surgeMultiplier ?? 1;
        return (
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold">
              {display != null && !isNaN(display) ? formatXof(display) : "—"}
            </span>
            {final != null && estimated != null && final !== estimated ? (
              <span className="text-[10px] text-[color:var(--muted-foreground)]">
                est. {formatXof(estimated)}
              </span>
            ) : null}
            {surge > 1 ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Surge ×{surge}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Créée",
      sortAccessor: (r) => r.createdAt,
      render: (r) => (
        <span className="text-[10px] text-[color:var(--muted-foreground)]">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) =>
        TERMINAL_STATUSES.has(r.status) ? null : (
          <Button
            variant="outline"
            size="sm"
            data-no-row-click
            onClick={(e) => {
              e.stopPropagation();
              setInterventionTarget(r);
            }}
            title="Forcer un statut sur cette course"
          >
            <Wrench className="size-3.5" />
            Modifier statut
          </Button>
        ),
    },
  ];

  function renderTable(rows: AdminRide[]) {
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
      <Card className="overflow-hidden p-0">
        <DataTable
          rows={pageRows}
          columns={columns}
          rowKey={(r) => r.rideId}
          rowHref={(r) => `/vtc/rides/${r.rideId}`}
          defaultSort={{ key: "createdAt", direction: "desc" }}
        />
        <PaginationFooter
          total={rows.length}
          shown={pageRows.length}
          page={safePage}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Courses"
        dataSource="live"
        dataSourceHint="Branché sur GET /api/admin/rides — toutes les courses avec passager + driver enrichi."
        description="Suivi en temps quasi-réel — annulations, remboursements et ajustements de tarif."
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
              onClick={() =>
                downloadCsv(
                  timestampedFilename("courses"),
                  [
                    { key: "ref", header: "Référence", value: (r) => r.rideNumber },
                    { key: "status", header: "Statut", value: (r) => r.status },
                    { key: "vt", header: "Véhicule", value: (r) => r.vehicleType },
                    { key: "pay", header: "Paiement", value: (r) => r.paymentMethod },
                    { key: "passenger", header: "Passager", value: (r) => fullParty(r.passenger) },
                    { key: "passengerPhone", header: "Tél passager", value: (r) => r.passenger?.phoneNumber ?? "" },
                    { key: "driver", header: "Driver", value: (r) => fullParty(r.driver) },
                    { key: "driverPhone", header: "Tél driver", value: (r) => r.driver?.phoneNumber ?? "" },
                    { key: "estimated", header: "Estimé", value: (r) => r.pricing?.estimatedPrice ?? "" },
                    { key: "final", header: "Final", value: (r) => r.pricing?.finalPrice ?? "" },
                    { key: "createdAt", header: "Créée", value: (r) => r.createdAt },
                    { key: "completedAt", header: "Terminée", value: (r) => r.completedAt ?? "" },
                  ],
                  filtered,
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setInterventionOpen(true)}>
              <Wrench className="size-4" />
              Forcer un statut
            </Button>
          </>
        }
      />

      {error ? (
        <Card className="p-6">
          <p className="text-sm text-[color:var(--danger)]">
            Impossible de charger les courses : {error}
          </p>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total courses"
          value={rides.length.toLocaleString("fr-FR")}
          trend={{
            value: `${stats.inProgress} en cours`,
            direction: "flat",
          }}
          helper={`${stats.pending} en attente · ${total} en base`}
          icon={Car}
          tone="primary"
        />
        <StatCard
          label="Terminées"
          value={String(stats.completed)}
          trend={{ value: "signature OK", direction: "up" }}
          helper={`${formatXof(stats.totalRevenue)} encaissés`}
          icon={Clock}
          tone="success"
        />
        <StatCard
          label="Prix moyen"
          value={formatXof(Math.round(stats.avgFinal))}
          trend={{ value: "courses terminées", direction: "flat" }}
          helper="commission incluse"
          icon={TrendingUp}
          tone="secondary"
        />
        <StatCard
          label="Annulées / litiges"
          value={`${stats.cancelRate.toFixed(1)} %`}
          trend={{
            value: `${stats.cancelled} courses`,
            direction: "flat",
          }}
          helper="à investiguer"
          icon={Activity}
          tone="warning"
        />
        {stats.ghost > 0 && (
          <StatCard
            label="Clients fantômes"
            value={String(stats.ghost)}
            trend={{ value: "sans passager réel", direction: "flat" }}
            helper="à examiner"
            icon={Ghost}
            tone="danger"
          />
        )}
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher (référence, passager, driver, téléphone)…"
            leftIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={statusF}
            onChange={setStatusF}
            className="sm:w-48"
          />
          <Combobox
            options={VEHICLE_OPTIONS}
            value={vehicleF}
            onChange={setVehicleF}
            className="sm:w-44"
          />
          <Combobox
            options={PAYMENT_OPTIONS}
            value={paymentF}
            onChange={setPaymentF}
            className="sm:w-44"
          />
          <Combobox
            options={CLIENT_OPTIONS}
            value={clientF}
            onChange={setClientF}
            className="sm:w-44"
          />
        </div>
      </div>

      <Tabs
        defaultValue="all"
        tabs={[
          {
            value: "all",
            label: "Toutes",
            badge: { count: filtered.length, tone: "neutral" },
            content: renderTable(filtered),
          },
          {
            value: "active",
            label: "En cours",
            badge: { count: stats.inProgress, tone: "primary" },
            content: renderTable(
              filtered.filter((r) => IN_PROGRESS_STATUSES.includes(r.status)),
            ),
          },
          {
            value: "pending",
            label: "En attente",
            badge: { count: stats.pending, tone: "warning" },
            content: renderTable(
              filtered.filter((r) => PENDING_STATUSES.includes(r.status)),
            ),
          },
          {
            value: "completed",
            label: "Terminées",
            badge: { count: stats.completed, tone: "success" },
            content: renderTable(
              filtered.filter((r) => COMPLETED_STATUSES.includes(r.status)),
            ),
          },
          {
            value: "cancelled",
            label: "Annulées / litiges",
            badge: { count: stats.cancelled, tone: "danger" },
            content: renderTable(
              filtered.filter((r) => CANCELLED_STATUSES.includes(r.status)),
            ),
          },
          {
            value: "ghost",
            label: "Fantômes",
            badge: {
              count: filtered.filter((r) => isGhostRide(r)).length,
              tone: "danger" as const,
            },
            content: renderTable(filtered.filter((r) => isGhostRide(r))),
          },
        ]}
      />

      <InterventionDesignModal
        open={interventionOpen}
        onClose={() => setInterventionOpen(false)}
      />

      <InterventionDesignModal
        open={!!interventionTarget}
        onClose={() => setInterventionTarget(null)}
        defaultRideId={interventionTarget?.rideId}
        defaultRideNumber={interventionTarget?.rideNumber}
        currentStatus={interventionTarget?.status}
      />
    </div>
  );
}
