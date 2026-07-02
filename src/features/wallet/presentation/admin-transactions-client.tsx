"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Download,
  RefreshCw,
  Search,
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
import { Tabs } from "@/shared/ui/tabs";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { type CsvColumn, downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import {
  type AdminTransaction,
  TRANSACTION_TYPE_META,
  WALLET_TYPE_META,
} from "../domain/wallet";

// ─── Options filtres ──────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "ALL", label: "Type : tous" },
  { value: "RECHARGE", label: "Dépôts" },
  { value: "RIDE_EARNINGS", label: "Gains courses" },
  { value: "RIDE_PAYMENT", label: "Commissions plateforme" },
  { value: "ADMIN_CREDIT", label: "Crédits admin" },
  { value: "CREDIT", label: "Crédits" },
  { value: "DEBIT", label: "Débits" },
];

const WALLET_OPTIONS = [
  { value: "ALL", label: "Wallet : tous" },
  { value: "PAYMENT", label: "Passagers" },
  { value: "EARNINGS", label: "Chauffeurs" },
  { value: "PLATFORM", label: "Plateforme" },
];

const DIRECTION_OPTIONS = [
  { value: "ALL", label: "Sens : tous" },
  { value: "CREDIT", label: "Entrées" },
  { value: "DEBIT", label: "Sorties" },
];

const CSV_COLUMNS: readonly CsvColumn<AdminTransaction>[] = [
  { key: "date",        header: "Date",             value: (t) => formatDateTime(t.createdAt) },
  { key: "owner",       header: "Propriétaire",     value: (t) => t.ownerName },
  { key: "phone",       header: "Téléphone",        value: (t) => t.ownerPhone },
  { key: "wallet",      header: "Wallet",           value: (t) => WALLET_TYPE_META[t.walletType]?.label ?? t.walletType },
  { key: "type",        header: "Type",             value: (t) => TRANSACTION_TYPE_META[t.type]?.label ?? t.type },
  { key: "direction",   header: "Sens",             value: (t) => t.direction === "CREDIT" ? "Entrée" : "Sortie" },
  { key: "subBalance",  header: "Sous-solde",       value: (t) => t.balanceType },
  { key: "amount",      header: "Montant (FCFA)",   value: (t) => t.amount },
  { key: "before",      header: "Avant (FCFA)",     value: (t) => t.balanceBefore },
  { key: "after",       header: "Après (FCFA)",     value: (t) => t.balanceAfter },
  { key: "description", header: "Description",      value: (t) => t.description },
  { key: "status",      header: "Status",           value: (t) => t.status },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AdminTransactionsClientProps {
  transactions: AdminTransaction[];
  total: number;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminTransactionsClient({
  transactions,
  total,
  error,
}: AdminTransactionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [walletFilter, setWalletFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCredits = transactions
      .filter((t) => t.direction === "CREDIT")
      .reduce((s, t) => s + t.amount, 0);
    const totalDebits = transactions
      .filter((t) => t.direction === "DEBIT")
      .reduce((s, t) => s + t.amount, 0);
    const recharges = transactions
      .filter((t) => t.type === "RECHARGE")
      .reduce((s, t) => s + t.amount, 0);
    const commissions = transactions
      .filter((t) => t.type === "RIDE_PAYMENT")
      .reduce((s, t) => s + t.amount, 0);
    return { totalCredits, totalDebits, recharges, commissions };
  }, [transactions]);

  // ─── Filtres ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
      if (walletFilter !== "ALL" && t.walletType !== walletFilter) return false;
      if (directionFilter !== "ALL" && t.direction !== directionFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.ownerName.toLowerCase().includes(q) ||
          t.ownerPhone.includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.transactionId.includes(q)
        );
      }
      return true;
    });
  }, [transactions, search, typeFilter, walletFilter, directionFilter]);

  // ─── Colonnes tableau ─────────────────────────────────────────────────────
  const columns: ColumnDef<AdminTransaction>[] = [
    {
      key: "createdAt",
      header: "Date",
      sortAccessor: (row) => row.createdAt,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "ownerName",
      header: "Propriétaire",
      sortAccessor: (row) => row.ownerName,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{row.ownerName}</span>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {row.ownerPhone}
          </span>
        </div>
      ),
    },
    {
      key: "walletType",
      header: "Wallet",
      render: (row) => (
        <Badge tone="neutral">
          {WALLET_TYPE_META[row.walletType]?.label ?? row.walletType}
        </Badge>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => {
        const meta = TRANSACTION_TYPE_META[row.type];
        return (
          <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? row.type}</Badge>
        );
      },
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="block max-w-[200px] truncate text-xs text-[color:var(--muted-foreground)]">
          {row.description}
        </span>
      ),
    },
    {
      key: "balanceType",
      header: "Sous-solde",
      render: (row) => <span className="text-xs">{row.balanceType}</span>,
    },
    {
      key: "amount",
      header: "Montant",
      sortAccessor: (row) => row.amount,
      render: (row) => (
        <span
          className={`text-sm font-semibold ${
            row.direction === "CREDIT"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {row.direction === "CREDIT" ? "+" : "-"}
          {formatXof(row.amount)}
        </span>
      ),
    },
    {
      key: "direction",
      header: "Sens",
      render: (row) =>
        row.direction === "CREDIT" ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <ArrowUpRight className="size-3" />
            Entrée
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            <ArrowDownLeft className="size-3" />
            Sortie
          </span>
        ),
    },
    {
      key: "balanceBefore",
      header: "Avant",
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatXof(row.balanceBefore)}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Après",
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatXof(row.balanceAfter)}
        </span>
      ),
    },
  ];

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  function handleExport() {
    downloadCsv(timestampedFilename("transactions"), CSV_COLUMNS, filtered);
  }

  // ─── Tab helper ───────────────────────────────────────────────────────────

  function renderTable(rows: AdminTransaction[]) {
    return (
      <Card className="overflow-hidden p-0">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.transactionId}
          defaultSort={{ key: "createdAt", direction: "desc" }}
        />
        <PaginationFooter total={rows.length} shown={rows.length} />
      </Card>
    );
  }

  const adminOps = filtered.filter(
    (t) =>
      t.type === "ADMIN_CREDIT" || t.type === "DEBIT" || t.type === "CREDIT",
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Historique des transactions"
        dataSource="live"
        description={`${total} transactions au total — dépôts, commissions, gains, opérations admin.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
            >
              <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {error ? (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </Card>
      ) : null}

      {/* KPI Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total entrées"
          value={formatXof(stats.totalCredits)}
          icon={ArrowUpRight}
          tone="success"
        />
        <StatCard
          label="Total sorties"
          value={formatXof(stats.totalDebits)}
          icon={ArrowDownLeft}
          tone="danger"
        />
        <StatCard
          label="Dépôts MoMo"
          value={formatXof(stats.recharges)}
          icon={CreditCard}
          tone="primary"
        />
        <StatCard
          label="Commissions"
          value={formatXof(stats.commissions)}
          icon={Building2}
          tone="warning"
        />
      </section>

      {/* Filtres */}
      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            leftIcon={<Search className="size-4" />}
            placeholder="Rechercher un nom, téléphone, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={setTypeFilter}
            className="sm:w-48"
          />
          <Combobox
            options={WALLET_OPTIONS}
            value={walletFilter}
            onChange={setWalletFilter}
            className="sm:w-44"
          />
          <Combobox
            options={DIRECTION_OPTIONS}
            value={directionFilter}
            onChange={setDirectionFilter}
            className="sm:w-44"
          />
          {(search ||
            typeFilter !== "ALL" ||
            walletFilter !== "ALL" ||
            directionFilter !== "ALL") ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setTypeFilter("ALL");
                setWalletFilter("ALL");
                setDirectionFilter("ALL");
              }}
            >
              Effacer les filtres
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs
        defaultValue="all"
        tabs={[
          {
            value: "all",
            label: "Tout",
            badge: { count: filtered.length, tone: "neutral" },
            content: renderTable(filtered),
          },
          {
            value: "recharges",
            label: "Dépôts",
            badge: {
              count: filtered.filter((t) => t.type === "RECHARGE").length,
              tone: "success",
            },
            content: renderTable(
              filtered.filter((t) => t.type === "RECHARGE"),
            ),
          },
          {
            value: "commissions",
            label: "Commissions",
            badge: {
              count: filtered.filter((t) => t.type === "RIDE_PAYMENT").length,
              tone: "warning",
            },
            content: renderTable(
              filtered.filter((t) => t.type === "RIDE_PAYMENT"),
            ),
          },
          {
            value: "gains",
            label: "Gains courses",
            badge: {
              count: filtered.filter((t) => t.type === "RIDE_EARNINGS").length,
              tone: "success",
            },
            content: renderTable(
              filtered.filter((t) => t.type === "RIDE_EARNINGS"),
            ),
          },
          {
            value: "admin",
            label: "Opérations admin",
            badge: { count: adminOps.length, tone: "info" },
            content: renderTable(adminOps),
          },
        ]}
      />
    </div>
  );
}
