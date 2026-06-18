"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Calendar,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatXof } from "@/shared/lib/format";
import type { PassengerRow } from "./store";

const CITY_OPTIONS = [
  { value: "ALL", label: "Toutes villes" },
  { value: "Cotonou", label: "Cotonou" },
  { value: "Calavi", label: "Calavi" },
  { value: "Porto-Novo", label: "Porto-Novo" },
  { value: "Ouidah", label: "Ouidah" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous statuts" },
  { value: "ACTIVE", label: "Actifs uniquement" },
  { value: "SUSPENDED", label: "Suspendus uniquement" },
];

const PERIOD_OPTIONS = [
  { value: "ALL", label: "Toute période" },
  { value: "30D", label: "30 derniers jours" },
  { value: "90D", label: "90 derniers jours" },
  { value: "1Y", label: "12 derniers mois" },
];

interface PassengersPageProps {
  initialPassengers: PassengerRow[];
  total: number;
}

export function PassengersPage({ initialPassengers, total }: PassengersPageProps) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [period, setPeriod] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPassengers.filter((p) => {
      if (q) {
        const haystack = `${p.fullName} ${p.phone} ${p.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (city !== "ALL" && p.city !== city) return false;
      if (status === "ACTIVE" && p.isSuspended) return false;
      if (status === "SUSPENDED" && !p.isSuspended) return false;
      return true;
    });
  }, [initialPassengers, search, city, status]);

  const totalWallet = initialPassengers.reduce((sum, p) => sum + p.walletBalance, 0);
  const suspendedCount = initialPassengers.filter((p) => p.isSuspended).length;

  const columns: ColumnDef<PassengerRow>[] = [
    {
      key: "passenger",
      header: "Client",
      sortAccessor: (row) => row.fullName.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.fullName} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-[color:var(--foreground)]">
              {row.fullName}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {row.phone}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Ville",
      sortAccessor: (row) => row.city,
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
      render: (row) => (
        <span className="text-sm text-[color:var(--muted-foreground)]">
          {row.city || <span className="italic">—</span>}
        </span>
      ),
    },
    {
      key: "wallet",
      header: "Wallet",
      align: "right",
      sortAccessor: (row) => row.walletBalance,
      filter: {
        accessor: (row) => row.walletBalance,
        def: { kind: "number", unit: "FCFA" },
      },
      render: (row) => (
        <span className="font-mono text-sm text-[color:var(--foreground)]">
          {formatXof(row.walletBalance)}
        </span>
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
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {row.totalRides}
          </span>
          <span className="inline-flex items-center gap-0.5 text-xs text-[color:var(--muted-foreground)]">
            <Star className="size-3 fill-[color:var(--secondary)] text-[color:var(--secondary)]" />
            {row.rating.toFixed(1)}
          </span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Note",
      align: "right",
      sortAccessor: (row) => row.rating,
      filter: {
        accessor: (row) => row.rating,
        def: { kind: "number", unit: "★" },
      },
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-[color:var(--foreground)]">
          <Star className="size-3.5 fill-[color:var(--secondary)] text-[color:var(--secondary)]" />
          {row.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "lastActivity",
      header: "Dernière activité",
      sortAccessor: (row) => row.lastActivity,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {row.lastActivity}
        </span>
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
    {
      key: "actions",
      header: "",
      align: "right",
      render: (_row) => (
        <DropdownMenu
          groups={[
            {
              label: "Cas d'usage",
              items: [
                {
                  label: "Voir le profil",
                  onSelect: () => {
                    // Navigation handled by rowHref on the DataTable row
                  },
                },
              ],
            },
          ]}
        />
      ),
    },
  ];

  // Suppress unused warning while keeping the period filter UI for future use
  void period;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations VTC"
        title="Clients passagers"
        dataSource="live"
        description="Recherche, fiche client, wallet, suspensions, reset password."
        actions={
          <>
            <Button variant="outline" size="sm">
              Exporter CSV
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total passagers"
          value={total.toLocaleString("fr-FR")}
          trend={{ value: "live", direction: "flat" }}
          helper="comptes en base"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Actifs"
          value={String(initialPassengers.length - suspendedCount)}
          trend={{ value: `${initialPassengers.length} chargés`, direction: "flat" }}
          helper="non suspendus"
          icon={Calendar}
          tone="success"
        />
        <StatCard
          label="Wallet total"
          value={formatXof(totalWallet)}
          trend={{ value: "agrégé", direction: "flat" }}
          helper="solde main + bonus"
          icon={Wallet}
          tone="secondary"
        />
        <StatCard
          label="Comptes suspendus"
          value={String(suspendedCount)}
          trend={{ value: "à analyser", direction: "flat" }}
          helper="motifs : fraude, no-show"
          icon={Ban}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher un nom, téléphone, email…"
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
            className="sm:w-48"
          />
          <Combobox
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            className="sm:w-48"
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(row) => row.passengerId}
          rowHref={(row) => `/vtc/passengers/${row.passengerId}`}
          defaultSort={{ key: "passenger", direction: "asc" }}
        />
        <PaginationFooter total={total} shown={filtered.length} />
      </Card>
    </div>
  );
}
