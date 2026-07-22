"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Calendar,
  Car,
  Download,
  Mail,
  MapPin,
  Phone,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDate, formatXof } from "@/shared/lib/format";
import type { PassengerRow } from "./store";

// ─── CSV columns ──────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  { key: "id",        header: "ID",           value: (r: PassengerRow) => r.passengerId },
  { key: "nom",       header: "Nom complet",  value: (r: PassengerRow) => r.fullName },
  { key: "telephone", header: "Téléphone",    value: (r: PassengerRow) => r.phone },
  { key: "email",     header: "Email",        value: (r: PassengerRow) => r.email ?? "" },
  { key: "ville",     header: "Ville",        value: (r: PassengerRow) => r.city ?? "" },
  { key: "courses",   header: "Nb courses",   value: (r: PassengerRow) => r.totalRides },
  { key: "note",      header: "Note moy.",    value: (r: PassengerRow) => r.rating > 0 ? r.rating.toFixed(2) : "" },
  { key: "wallet",    header: "Wallet (FCFA)", value: (r: PassengerRow) => r.walletBalance },
  { key: "statut",    header: "Statut",       value: (r: PassengerRow) => r.isSuspended ? "Suspendu" : "Actif" },
  { key: "inscrit",   header: "Inscrit le",   value: (r: PassengerRow) => r.createdAt ? formatDate(r.createdAt) : "" },
] as const;

// ─── Filter options ───────────────────────────────────────────────────────────

const CITY_OPTIONS = [
  { value: "ALL", label: "Toutes villes" },
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous statuts" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "SUSPENDED", label: "Suspendus" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface PassengersPageProps {
  initialPassengers: PassengerRow[];
  total: number;
}

// ─── PassengersPage ───────────────────────────────────────────────────────────

export function PassengersPage({ initialPassengers, total }: PassengersPageProps) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPassengers.filter((p) => {
      if (q) {
        const haystack = `${p.fullName} ${p.phone} ${p.email ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (city !== "ALL" && p.city !== city) return false;
      if (status === "ACTIVE" && p.isSuspended) return false;
      if (status === "SUSPENDED" && !p.isSuspended) return false;
      return true;
    });
  }, [initialPassengers, search, city, status]);

  // ── KPI aggregates ─────────────────────────────────────────────────────────
  const suspendedCount = initialPassengers.filter((p) => p.isSuspended).length;
  const activeCount = initialPassengers.length - suspendedCount;
  const avgRating =
    initialPassengers.length > 0
      ? initialPassengers.reduce((sum, p) => sum + p.rating, 0) / initialPassengers.length
      : 0;
  const totalRidesSum = initialPassengers.reduce((sum, p) => sum + p.totalRides, 0);

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: ColumnDef<PassengerRow>[] = [
    {
      key: "passenger",
      header: "Client",
      sortAccessor: (row) => row.fullName.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.fullName} className="size-9 flex-shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-[color:var(--foreground)]">
              {row.fullName}
            </span>
            <span className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
              <Phone className="size-3 flex-shrink-0" />
              {row.phone}
            </span>
            {row.email && (
              <span className="flex items-center gap-1 truncate text-xs text-[color:var(--muted-foreground)]">
                <Mail className="size-3 flex-shrink-0" />
                <span className="truncate">{row.email}</span>
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Ville",
      sortAccessor: (row) => row.city ?? "",
      filter: {
        accessor: (row) => row.city,
        def: {
          kind: "select",
          options: [
            { value: "Cotonou", label: "Cotonou" },
            { value: "Calavi", label: "Calavi" },
            { value: "Porto-Novo", label: "Porto-Novo" },
            { value: "Ouidah", label: "Ouidah" },
          ],
        },
      },
      render: (row) =>
        row.city ? (
          <span className="inline-flex items-center gap-1 text-sm text-[color:var(--foreground)]">
            <MapPin className="size-3 flex-shrink-0 text-[color:var(--muted-foreground)]" />
            {row.city}
          </span>
        ) : (
          <span className="text-sm italic text-[color:var(--muted-foreground)]">—</span>
        ),
    },
    {
      key: "rides",
      header: "Courses",
      align: "right",
      sortAccessor: (row) => row.totalRides,
      filter: {
        accessor: (row) => row.totalRides,
        def: { kind: "number" },
      },
      render: (row) => (
        <div className="flex flex-col items-end leading-tight">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--foreground)]">
            <Car className="size-3.5 text-[color:var(--muted-foreground)]" />
            {row.totalRides.toLocaleString("fr-FR")}
          </span>
          {row.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-[color:var(--muted-foreground)]">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {row.rating.toFixed(1)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "wallet",
      header: "Wallet",
      align: "right",
      sortAccessor: (row) => row.walletBalance,
      filter: {
        accessor: (row) => row.walletBalance,
        def: { kind: "number" },
      },
      render: (row) => (
        <div className="flex flex-col items-end leading-tight">
          <span
            className={`text-sm font-mono font-semibold tabular-nums ${
              row.walletBalance > 0
                ? "text-[color:var(--foreground)]"
                : "text-[color:var(--muted-foreground)]"
            }`}
          >
            {row.walletBalance > 0 ? formatXof(row.walletBalance) : "—"}
          </span>
          {row.walletBalance > 0 && (
            <span className="text-[10px] text-[color:var(--muted-foreground)]">PAYMENT</span>
          )}
        </div>
      ),
    },
    {
      key: "registered",
      header: "Inscrit le",
      sortAccessor: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">
            {row.createdAt ? formatDate(row.createdAt) : "—"}
          </span>
          {row.lastActivity && (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              actif {row.lastActivity}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => (row.isSuspended ? 1 : 0),
      filter: {
        accessor: (row) => row.isSuspended,
        def: { kind: "boolean", trueLabel: "Suspendus", falseLabel: "Actifs" },
      },
      render: (row) =>
        row.isSuspended ? (
          <Badge tone="danger">Suspendu</Badge>
        ) : (
          <Badge tone="success">Actif</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Opérations VTC"
        title="Clients passagers"
        dataSource="live"
        description={`${total.toLocaleString("fr-FR")} comptes · ${activeCount.toLocaleString("fr-FR")} actifs · ${suspendedCount} suspendu${suspendedCount > 1 ? "s" : ""}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(timestampedFilename("passagers"), CSV_COLUMNS, filtered)}
          >
            <Download className="size-4" />
            Exporter CSV
          </Button>
        }
      />

      {/* ── KPI cards ─────────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total passagers"
          value={total.toLocaleString("fr-FR")}
          trend={{ value: "live", direction: "flat" }}
          helper="comptes enregistrés"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Comptes actifs"
          value={activeCount.toLocaleString("fr-FR")}
          trend={{ value: `${Math.round((activeCount / Math.max(total, 1)) * 100)}%`, direction: "flat" }}
          helper="non suspendus"
          icon={Calendar}
          tone="success"
        />
        <StatCard
          label="Comptes suspendus"
          value={String(suspendedCount)}
          trend={{ value: "fraude / no-show", direction: "flat" }}
          helper="à analyser"
          icon={Ban}
          tone={suspendedCount > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Courses totales"
          value={totalRidesSum.toLocaleString("fr-FR")}
          trend={{
            value: avgRating > 0 ? `★ ${avgRating.toFixed(1)} moy.` : "—",
            direction: "flat",
          }}
          helper="toutes périodes"
          icon={TrendingUp}
          tone="neutral"
        />
      </section>

      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Nom, téléphone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={CITY_OPTIONS}
            value={city}
            onChange={setCity}
            className="sm:w-44"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            className="sm:w-44"
          />
        </div>

        {/* Active filter summary */}
        {(search || city !== "ALL" || status !== "ALL") && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
            </span>
            {search && (
              <FilterChip label={`"${search}"`} onRemove={() => setSearch("")} />
            )}
            {city !== "ALL" && (
              <FilterChip
                label={CITY_OPTIONS.find((o) => o.value === city)?.label ?? city}
                onRemove={() => setCity("ALL")}
              />
            )}
            {status !== "ALL" && (
              <FilterChip
                label={STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}
                onRemove={() => setStatus("ALL")}
              />
            )}
            <button
              onClick={() => { setSearch(""); setCity("ALL"); setStatus("ALL"); }}
              className="text-xs text-[color:var(--primary)] hover:underline"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(row) => row.passengerId}
          rowHref={(row) => `/vtc/passengers/${row.passengerId}`}
          defaultSort={{ key: "registered", direction: "desc" }}
          emptyState={<EmptyState hasFilters={!!(search || city !== "ALL" || status !== "ALL")} />}
        />
        <PaginationFooter total={filtered.length} shown={filtered.length} />
      </Card>
    </div>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-0.5 text-xs text-[color:var(--foreground)]">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        aria-label="Retirer le filtre"
      >
        ×
      </button>
    </span>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[color:var(--muted)]">
        <Users className="size-6 text-[color:var(--muted-foreground)]" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">
          {hasFilters ? "Aucun résultat" : "Aucun passager"}
        </p>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          {hasFilters
            ? "Essayez d'ajuster vos filtres de recherche."
            : "Les passagers inscrits apparaîtront ici."}
        </p>
      </div>
    </div>
  );
}
