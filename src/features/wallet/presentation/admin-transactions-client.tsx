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
  X,
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

/** Groupes de types, chacun généré depuis TRANSACTION_TYPE_META */
const TYPE_OPTIONS = [
  { value: "ALL", label: "Type : tous" },
  // Dépôts
  { value: "RECHARGE",                     label: "Dépôt Mobile Money"          },
  { value: "PREPAID_RECHARGE",             label: "Dépôt partenaire"            },
  // Courses VTC
  { value: "RIDE_PAYMENT",                 label: "Paiement course (passager)"  },
  { value: "RIDE_EARNINGS",                label: "Gains course (driver)"       },
  { value: "COMMISSION",                   label: "Commission ForYou"           },
  { value: "COMMISSION_REVENUE",           label: "Revenu commission VTC"       },
  // Livraison B2B
  { value: "DELIVERY_PAYMENT",             label: "Paiement livraison B2B"      },
  { value: "DELIVERY_COMMISSION",          label: "Commission livraison B2B"    },
  { value: "B2B_DELIVERY_REVENUE",         label: "Revenu livraison B2B"        },
  // Livraison B2C
  { value: "B2C_PAYMENT",                  label: "Paiement livraison B2C"      },
  { value: "B2C_EARNINGS",                 label: "Gains livraison B2C"         },
  { value: "B2C_COMMISSION",               label: "Commission B2C"              },
  { value: "B2C_COMMISSION_REVENUE",       label: "Revenu commission B2C"       },
  // Contrats
  { value: "CONTRACT_INSTALLMENT",         label: "Échéance contrat (débit)"    },
  { value: "CONTRACT_INSTALLMENT_REVENUE", label: "Revenu échéance contrat"     },
  // Véhicule
  { value: "VEHICLE_RENTAL",               label: "Location véhicule"           },
  { value: "VEHICLE_RENTAL_REVENUE",       label: "Revenu location véhicule"    },
  // Retraits
  { value: "WITHDRAWAL",                   label: "Retrait"                     },
  // Bonus
  { value: "BONUS_CREDIT",                 label: "Bonus crédité"               },
  { value: "REFERRAL_REWARD",              label: "Récompense parrainage"       },
  { value: "BONUS_EXPIRY",                 label: "Expiration bonus"            },
  // Corrections
  { value: "REFUND",                       label: "Remboursement"               },
  { value: "ADJUSTMENT",                   label: "Ajustement"                  },
  { value: "ADMIN_CREDIT",                 label: "Crédit admin"                },
  { value: "ADMIN_DEBIT",                  label: "Débit admin"                 },
  { value: "CREDIT",                       label: "Crédit générique"            },
  { value: "DEBIT",                        label: "Débit générique"             },
  // Consolidation
  { value: "BALANCE_CONSOLIDATION",        label: "Consolidation (source)"      },
  { value: "CONSOLIDATION_CREDIT",         label: "Consolidation (destination)" },
  { value: "CONSOLIDATION_FEE_REVENUE",    label: "Frais consolidation"         },
  // P2P
  { value: "P2P_TRANSFER_SENT",            label: "Transfert P2P (envoi)"       },
  { value: "P2P_TRANSFER_RECEIVED",        label: "Transfert P2P (reçu)"        },
  { value: "P2P_FEE_REVENUE",              label: "Frais transfert P2P"         },
  // Annulations
  { value: "CANCELLATION_FEE",             label: "Frais d'annulation"          },
  { value: "CANCELLATION_INDEMNITY",       label: "Indemnité annulation"        },
  // Recouvrement
  { value: "DEBT_COLLECTION",              label: "Recouvrement dette"          },
];

const WALLET_OPTIONS = [
  { value: "ALL",      label: "Wallet : tous"  },
  { value: "PAYMENT",  label: "Passagers"       },
  { value: "EARNINGS", label: "Chauffeurs"      },
  { value: "PLATFORM", label: "Plateforme"      },
  { value: "PARTNER",  label: "Partenaires"     },
];

const DIRECTION_OPTIONS = [
  { value: "ALL",    label: "Sens : tous" },
  { value: "CREDIT", label: "Entrées"     },
  { value: "DEBIT",  label: "Sorties"     },
];

const STATUS_OPTIONS = [
  { value: "ALL",       label: "Statut : tous" },
  { value: "COMPLETED", label: "Complété"      },
  { value: "PENDING",   label: "En attente"    },
  { value: "FAILED",    label: "Échoué"        },
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
  { key: "status",      header: "Statut",           value: (t) => t.status },
  { key: "processedAt", header: "Traité le",        value: (t) => t.processedAt ? formatDateTime(t.processedAt) : "" },
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
  const [search,          setSearch]          = useState("");
  const [typeFilter,      setTypeFilter]      = useState("ALL");
  const [walletFilter,    setWalletFilter]    = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [statusFilter,    setStatusFilter]    = useState("ALL");
  const [fromDate,        setFromDate]        = useState("");
  const [toDate,          setToDate]          = useState("");

  // ─── Filtres client-side ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs   = toDate   ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return transactions.filter((t) => {
      if (typeFilter      !== "ALL" && t.type        !== typeFilter)      return false;
      if (walletFilter    !== "ALL" && t.walletType  !== walletFilter)    return false;
      if (directionFilter !== "ALL" && t.direction   !== directionFilter) return false;
      if (statusFilter    !== "ALL" && t.status      !== statusFilter)    return false;
      if (fromTs !== null && new Date(t.createdAt).getTime() < fromTs)   return false;
      if (toTs   !== null && new Date(t.createdAt).getTime() > toTs)     return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${t.ownerName} ${t.ownerPhone} ${t.description} ${t.transactionId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, typeFilter, walletFilter, directionFilter, statusFilter, fromDate, toDate]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  // Computed from `filtered` so the KPI cards always match what is shown in the table.
  const stats = useMemo(() => {
    const totalCredits = filtered.filter((t) => t.direction === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalDebits  = filtered.filter((t) => t.direction === "DEBIT" ).reduce((s, t) => s + t.amount, 0);
    const recharges    = filtered
      .filter((t) => t.type === "RECHARGE" || t.type === "PREPAID_RECHARGE")
      .reduce((s, t) => s + t.amount, 0);
    // Revenus crédités au wallet PLATFORM (côté plateforme)
    const platformRevenue = filtered
      .filter((t) =>
        t.type === "COMMISSION_REVENUE" ||
        t.type === "B2C_COMMISSION_REVENUE" ||
        t.type === "B2B_DELIVERY_REVENUE" ||
        t.type === "CONTRACT_INSTALLMENT_REVENUE" ||
        t.type === "VEHICLE_RENTAL_REVENUE" ||
        t.type === "P2P_FEE_REVENUE" ||
        t.type === "CONSOLIDATION_FEE_REVENUE",
      )
      .reduce((s, t) => s + t.amount, 0);
    // Commissions prélevées chez les drivers (même montant, côté EARNINGS)
    const commissionsDeducted = filtered
      .filter((t) => t.type === "COMMISSION" || t.type === "B2C_COMMISSION")
      .reduce((s, t) => s + t.amount, 0);
    return { totalCredits, totalDebits, recharges, platformRevenue, commissionsDeducted };
  }, [filtered]);

  const hasFilters = search || typeFilter !== "ALL" || walletFilter !== "ALL" ||
    directionFilter !== "ALL" || statusFilter !== "ALL" || fromDate || toDate;

  function clearFilters() {
    setSearch(""); setTypeFilter("ALL"); setWalletFilter("ALL");
    setDirectionFilter("ALL"); setStatusFilter("ALL"); setFromDate(""); setToDate("");
  }

  // ─── Colonnes ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<AdminTransaction>[] = [
    {
      key: "createdAt",
      header: "Date",
      sortAccessor: (row) => row.createdAt,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "ownerName",
      header: "Propriétaire",
      sortAccessor: (row) => row.ownerName,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{row.ownerName || "—"}</span>
          <span className="text-xs text-[color:var(--muted-foreground)]">{row.ownerPhone}</span>
        </div>
      ),
    },
    {
      key: "walletType",
      header: "Wallet",
      render: (row) => (
        <Badge tone={WALLET_TYPE_META[row.walletType]?.tone ?? "neutral"}>
          {WALLET_TYPE_META[row.walletType]?.label ?? row.walletType}
        </Badge>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => {
        const meta = TRANSACTION_TYPE_META[row.type];
        return <Badge tone={meta?.tone ?? "neutral"}>{meta?.label ?? row.type}</Badge>;
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
      render: (row) => (
        <Badge tone="neutral">{row.balanceType}</Badge>
      ),
    },
    {
      key: "amount",
      header: "Montant",
      align: "right",
      sortAccessor: (row) => row.amount,
      render: (row) => (
        <span className={`font-mono text-sm font-semibold ${
          row.direction === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}>
          {row.direction === "CREDIT" ? "+" : "-"}{formatXof(row.amount)}
        </span>
      ),
    },
    {
      key: "direction",
      header: "Sens",
      render: (row) =>
        row.direction === "CREDIT" ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <ArrowUpRight className="size-3.5" /> Entrée
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            <ArrowDownLeft className="size-3.5" /> Sortie
          </span>
        ),
    },
    {
      key: "status",
      header: "Statut",
      render: (row) => (
        <Badge
          tone={
            row.status === "COMPLETED" ? "success"
            : row.status === "PENDING"   ? "warning"
            : row.status === "FAILED"    ? "danger"
            : "neutral"
          }
        >
          {row.status === "COMPLETED" ? "Complété"
           : row.status === "PENDING" ? "En attente"
           : row.status === "FAILED"  ? "Échoué"
           : row.status}
        </Badge>
      ),
    },
    {
      key: "balanceBefore",
      header: "Avant → Après",
      render: (row) => (
        <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
          {formatXof(row.balanceBefore)} → {formatXof(row.balanceAfter)}
        </span>
      ),
    },
  ];

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

  const tabGroups = {
    recharges:   filtered.filter((t) => t.type === "RECHARGE" || t.type === "PREPAID_RECHARGE"),
    courses:     filtered.filter((t) => ["RIDE_PAYMENT", "RIDE_EARNINGS", "COMMISSION", "COMMISSION_REVENUE"].includes(t.type)),
    contrats:    filtered.filter((t) => t.type === "CONTRACT_INSTALLMENT" || t.type === "CONTRACT_INSTALLMENT_REVENUE"),
    b2c:         filtered.filter((t) => ["B2C_PAYMENT", "B2C_EARNINGS", "B2C_COMMISSION", "B2C_COMMISSION_REVENUE"].includes(t.type)),
    adminOps:    filtered.filter((t) => ["ADMIN_CREDIT", "ADMIN_DEBIT", "CREDIT", "DEBIT", "REFUND", "ADJUSTMENT"].includes(t.type)),
    retraits:    filtered.filter((t) => t.type === "WITHDRAWAL"),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Historique des transactions"
        dataSource="live"
        description={`${total.toLocaleString()} transactions au total — dépôts, commissions, gains, opérations admin.`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => startTransition(() => router.refresh())} disabled={isPending}>
              <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(timestampedFilename("transactions"), CSV_COLUMNS, filtered)} disabled={filtered.length === 0}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </Card>
      )}

      {/* KPI Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total entrées"           value={formatXof(stats.totalCredits)}       icon={ArrowUpRight}  tone="success" />
        <StatCard label="Total sorties"           value={formatXof(stats.totalDebits)}        icon={ArrowDownLeft} tone="danger"  />
        <StatCard label="Dépôts MoMo / prépayé"  value={formatXof(stats.recharges)}          icon={CreditCard}    tone="primary" />
        <StatCard
          label="Revenus plateforme"
          value={formatXof(stats.platformRevenue || stats.commissionsDeducted)}
          icon={Building2}
          tone="warning"
        />
      </section>

      {/* Filtres */}
      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            leftIcon={<Search className="size-4" />}
            placeholder="Rechercher nom, téléphone, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox options={TYPE_OPTIONS}      value={typeFilter}      onChange={setTypeFilter}      className="sm:w-56" />
          <Combobox options={WALLET_OPTIONS}    value={walletFilter}    onChange={setWalletFilter}    className="sm:w-44" />
          <Combobox options={DIRECTION_OPTIONS} value={directionFilter} onChange={setDirectionFilter} className="sm:w-36" />
          <Combobox options={STATUS_OPTIONS}    value={statusFilter}    onChange={setStatusFilter}    className="sm:w-40" />
        </div>
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[color:var(--muted-foreground)]">Du</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[color:var(--muted-foreground)]">Au</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-3.5" />
              Effacer les filtres
            </Button>
          )}
        </div>

        <div className="text-xs text-[color:var(--muted-foreground)]">
          {filtered.length.toLocaleString()} transaction{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
          {hasFilters ? ` (sur ${transactions.length.toLocaleString()} chargées)` : ""}
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
            badge: { count: tabGroups.recharges.length, tone: "success" },
            content: renderTable(tabGroups.recharges),
          },
          {
            value: "courses",
            label: "Courses VTC",
            badge: { count: tabGroups.courses.length, tone: "primary" },
            content: renderTable(tabGroups.courses),
          },
          {
            value: "contrats",
            label: "Contrats",
            badge: { count: tabGroups.contrats.length, tone: "warning" },
            content: renderTable(tabGroups.contrats),
          },
          {
            value: "b2c",
            label: "Livraison B2C",
            badge: { count: tabGroups.b2c.length, tone: "info" },
            content: renderTable(tabGroups.b2c),
          },
          {
            value: "retraits",
            label: "Retraits",
            badge: { count: tabGroups.retraits.length, tone: "danger" },
            content: renderTable(tabGroups.retraits),
          },
          {
            value: "admin",
            label: "Admin",
            badge: { count: tabGroups.adminOps.length, tone: "info" },
            content: renderTable(tabGroups.adminOps),
          },
        ]}
      />
    </div>
  );
}
