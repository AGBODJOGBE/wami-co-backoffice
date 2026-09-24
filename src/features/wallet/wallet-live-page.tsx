"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Car,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  RefreshCw,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { type CsvColumn, downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDate, formatDateTime, formatXof } from "@/shared/lib/format";
import {
  approveWithdrawalAction,
  creditWalletAction,
  debitWalletAction,
  rejectWithdrawalAction,
  type WalletBalanceType,
  type WalletCreditType,
  type WalletDebitType,
} from "./application/actions";
import { CanView } from "@/shared/ui/can-view";
import {
  OUTFLOW_CATEGORY_LABELS,
  TRANSACTION_TYPE_META,
  WALLET_TYPE_META,
  WITHDRAWAL_METHOD_LABELS,
  WITHDRAWAL_SOURCE_BALANCE_LABELS,
  WITHDRAWAL_STATUS_LABELS,
  type AdminTransaction,
  type AdminWallet,
  type PlatformRevenue,
  type TransactionType,
  type Withdrawal,
  type WalletType,
} from "./domain/wallet";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WalletLivePageProps {
  wallets: AdminWallet[];
  transactions: AdminTransaction[];
  withdrawals?: Withdrawal[];
  withdrawalsTotal?: number;
  platformRevenue?: PlatformRevenue;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txMeta(type: string) {
  return TRANSACTION_TYPE_META[type as TransactionType] ?? { label: type, tone: "neutral" as const, group: "Autre" };
}

function walletMeta(type: string) {
  return WALLET_TYPE_META[type as WalletType] ?? { label: type, tone: "neutral" as const };
}

// ─── Vue d'ensemble ───────────────────────────────────────────────────────────

function OverviewTab({
  wallets,
  transactions,
}: {
  wallets: AdminWallet[];
  transactions: AdminTransaction[];
}) {
  const byType = useMemo(() => {
    const map: Record<string, { count: number; totalBalance: number }> = {};
    for (const w of wallets) {
      const key = w.walletType;
      if (!map[key]) map[key] = { count: 0, totalBalance: 0 };
      map[key].count++;
      map[key].totalBalance += w.totalBalance;
    }
    return map;
  }, [wallets]);

  const txSummary = useMemo(() => {
    const totalCredit = transactions.filter((t) => t.direction === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const totalDebit  = transactions.filter((t) => t.direction === "DEBIT" ).reduce((s, t) => s + t.amount, 0);
    // Classement sur les DEBIT uniquement pour éviter le double-comptage :
    // chaque opération génère souvent 2 transactions (DEBIT user + CREDIT plateforme),
    // additionner les deux gonfle artificiellement les montants par catégorie.
    const byGroup: Record<string, number> = {};
    for (const t of transactions) {
      if (t.direction !== "DEBIT") continue;
      const g = txMeta(t.type).group;
      byGroup[g] = (byGroup[g] ?? 0) + t.amount;
    }
    const topGroups = Object.entries(byGroup).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { totalCredit, totalDebit, topGroups };
  }, [transactions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Wallets par type */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="px-5 py-4">
          <CardTitle>Répartition des wallets</CardTitle>
          <CardDescription>Soldes agrégés par type de wallet sur la plateforme.</CardDescription>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <th className="px-5 py-2.5 font-medium">Type</th>
              <th className="px-5 py-2.5 text-right font-medium">Wallets</th>
              <th className="px-5 py-2.5 text-right font-medium">Solde total</th>
              <th className="px-5 py-2.5 text-right font-medium">Solde moyen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {Object.entries(byType).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                  Aucun wallet disponible.
                </td>
              </tr>
            ) : (
              Object.entries(byType).map(([type, data]) => {
                const meta = walletMeta(type);
                const avg = data.count > 0 ? Math.round(data.totalBalance / data.count) : 0;
                return (
                  <tr key={type} className="hover:bg-[color:var(--muted)]/30">
                    <td className="px-5 py-3">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{data.count}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-[color:var(--foreground)]">
                      {formatXof(data.totalBalance)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[color:var(--muted-foreground)]">
                      {formatXof(avg)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Volume transactions récentes */}
      {transactions.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <CardHeader className="px-5 py-4">
              <CardTitle>Volume (transactions récentes)</CardTitle>
              <CardDescription>
                {transactions.length} transactions les plus récentes — échantillon, pas l'historique complet
              </CardDescription>
            </CardHeader>
            <div className="divide-y divide-[color:var(--border)]">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-[color:var(--muted-foreground)]">Total entrées (CREDIT)</span>
                <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatXof(txSummary.totalCredit)}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-[color:var(--muted-foreground)]">Total sorties (DEBIT)</span>
                <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                  -{formatXof(txSummary.totalDebit)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <CardHeader className="px-5 py-4">
              <CardTitle>Top catégories (sorties)</CardTitle>
              <CardDescription>Par volume DEBIT — hors doublons CREDIT/DEBIT</CardDescription>
            </CardHeader>
            <ul className="divide-y divide-[color:var(--border)]">
              {txSummary.topGroups.map(([group, vol]) => (
                <li key={group} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-[color:var(--foreground)]">{group}</span>
                  <span className="font-mono text-sm text-[color:var(--muted-foreground)]">{formatXof(vol)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Wallets list ─────────────────────────────────────────────────────────────

const WALLET_CSV_COLUMNS: readonly CsvColumn<AdminWallet>[] = [
  { key: "type",      header: "Type",               value: (w) => walletMeta(w.walletType).label },
  { key: "owner",     header: "Propriétaire",        value: (w) => w.ownerName || "" },
  { key: "phone",     header: "Téléphone",           value: (w) => w.ownerPhone || "" },
  { key: "main",      header: "Principal (FCFA)",    value: (w) => w.mainBalance },
  { key: "bonus",     header: "Bonus (FCFA)",        value: (w) => w.bonusBalance },
  { key: "referral",  header: "Parrainage (FCFA)",   value: (w) => w.referralBalance },
  { key: "total",     header: "Total (FCFA)",        value: (w) => w.totalBalance },
  { key: "status",    header: "Statut",              value: (w) => w.status === "ACTIVE" ? "Actif" : w.status },
];

function WalletsTab({ wallets }: { wallets: AdminWallet[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wallets;
    return wallets.filter((w) =>
      `${w.walletId} ${w.walletType} ${w.ownerName} ${w.ownerPhone} ${w.profileId}`
        .toLowerCase()
        .includes(q),
    );
  }, [wallets, search]);

  const columns: ColumnDef<AdminWallet>[] = [
    {
      key: "type",
      header: "Type",
      sortAccessor: (row) => row.walletType,
      filter: {
        accessor: (row) => row.walletType,
        def: {
          kind: "select",
          options: [
            { value: "PAYMENT",  label: "Paiement (passager)" },
            { value: "EARNINGS", label: "Gains (driver)"      },
            { value: "PLATFORM", label: "Plateforme"          },
            { value: "PARTNER",  label: "Partenaire"          },
          ],
        },
      },
      render: (row) => {
        const meta = walletMeta(row.walletType);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: "owner",
      header: "Propriétaire",
      sortAccessor: (row) => row.ownerName || row.profileId,
      render: (row) => {
        const name = row.ownerName || "—";
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={name} className="size-8 text-xs" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-[color:var(--foreground)]">{name}</span>
              {row.ownerPhone ? (
                <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{row.ownerPhone}</span>
              ) : (
                <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]" title={row.profileId}>
                  {row.profileId.slice(0, 14)}…
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "mainBalance",
      header: "Principal",
      align: "right",
      sortAccessor: (row) => row.mainBalance,
      render: (row) => (
        <span className="font-mono text-sm">{formatXof(row.mainBalance)}</span>
      ),
    },
    {
      key: "bonusBalance",
      header: "Bonus",
      align: "right",
      sortAccessor: (row) => row.bonusBalance,
      render: (row) => (
        <span className="font-mono text-sm text-[color:var(--muted-foreground)]">
          {formatXof(row.bonusBalance)}
        </span>
      ),
    },
    {
      key: "referralBalance",
      header: "Parrainage",
      align: "right",
      sortAccessor: (row) => row.referralBalance,
      render: (row) => (
        <span className="font-mono text-sm text-[color:var(--muted-foreground)]">
          {formatXof(row.referralBalance)}
        </span>
      ),
    },
    {
      key: "totalBalance",
      header: "Total",
      align: "right",
      sortAccessor: (row) => row.totalBalance,
      render: (row) => (
        <span className="font-mono text-sm font-semibold">{formatXof(row.totalBalance)}</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      filter: {
        accessor: (row) => row.status,
        def: { kind: "select", options: [{ value: "ACTIVE", label: "Actif" }, { value: "FROZEN", label: "Gelé" }] },
      },
      render: (row) => (
        <Badge tone={row.status === "ACTIVE" ? "success" : "warning"}>
          {row.status === "ACTIVE" ? "Actif" : row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
        <SearchField
          placeholder="Rechercher par type, propriétaire, ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-72"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(timestampedFilename("wallets"), WALLET_CSV_COLUMNS, filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="size-4" />
          Exporter CSV
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.walletId}
          defaultSort={{ key: "totalBalance", direction: "desc" }}
        />
        <PaginationFooter total={wallets.length} shown={filtered.length} />
      </Card>
    </div>
  );
}

// ─── Transactions récentes ────────────────────────────────────────────────────

const TX_CSV_COLUMNS: readonly CsvColumn<AdminTransaction>[] = [
  { key: "date",      header: "Date",             value: (t) => formatDateTime(t.createdAt) },
  { key: "owner",     header: "Propriétaire",     value: (t) => t.ownerName },
  { key: "phone",     header: "Téléphone",        value: (t) => t.ownerPhone },
  { key: "wallet",    header: "Wallet",           value: (t) => walletMeta(t.walletType).label },
  { key: "type",      header: "Type",             value: (t) => txMeta(t.type).label },
  { key: "direction", header: "Sens",             value: (t) => t.direction === "CREDIT" ? "Entrée" : "Sortie" },
  { key: "amount",    header: "Montant (FCFA)",   value: (t) => t.amount },
  { key: "before",    header: "Avant (FCFA)",     value: (t) => t.balanceBefore },
  { key: "after",     header: "Après (FCFA)",     value: (t) => t.balanceAfter },
  { key: "desc",      header: "Description",      value: (t) => t.description },
];

function TransactionsTab({ transactions }: { transactions: AdminTransaction[] }) {
  const [search, setSearch] = useState("");
  const [dirFilter, setDirFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (dirFilter  !== "ALL" && t.direction !== dirFilter)  return false;
      if (typeFilter !== "ALL" && t.type      !== typeFilter)  return false;
      if (q) {
        const hay = `${t.ownerName} ${t.ownerPhone} ${t.description} ${t.transactionId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, dirFilter, typeFilter]);

  const columns: ColumnDef<AdminTransaction>[] = [
    {
      key: "date",
      header: "Date",
      sortAccessor: (row) => row.createdAt,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "owner",
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
      key: "wallet",
      header: "Wallet",
      render: (row) => {
        const meta = walletMeta(row.walletType);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: "type",
      header: "Type",
      render: (row) => {
        const meta = txMeta(row.type);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: "amount",
      header: "Montant",
      align: "right",
      sortAccessor: (row) => row.amount,
      render: (row) => (
        <span className={`font-mono text-sm font-semibold ${row.direction === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {row.direction === "CREDIT" ? "+" : "-"}{formatXof(row.amount)}
        </span>
      ),
    },
    {
      key: "solde",
      header: "Avant → Après",
      render: (row) => (
        <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
          {formatXof(row.balanceBefore)} → {formatXof(row.balanceAfter)}
        </span>
      ),
    },
    {
      key: "desc",
      header: "Description",
      render: (row) => (
        <span className="block max-w-[180px] truncate text-xs text-[color:var(--muted-foreground)]">
          {row.description}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
        <SearchField
          placeholder="Rechercher propriétaire, description, ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-60"
        />
        <Combobox
          options={[
            { value: "ALL",    label: "Sens : tous"  },
            { value: "CREDIT", label: "Entrées"      },
            { value: "DEBIT",  label: "Sorties"      },
          ]}
          value={dirFilter}
          onChange={setDirFilter}
          className="sm:w-40"
        />
        <Combobox
          options={[
            { value: "ALL",                                label: "Type : tous"                    },
            { value: "RECHARGE",                           label: "Dépôts MoMo"                    },
            { value: "RIDE_EARNINGS",                      label: "Gains courses VTC"              },
            { value: "COMMISSION_REVENUE",                 label: "Commission VTC"                 },
            { value: "B2C_COMMISSION_REVENUE",             label: "Commission B2C"                 },
            { value: "SUBSCRIPTION_REVENUE",               label: "Revenu abonnement B2B"          },
            { value: "CONTRACT_INSTALLMENT_REVENUE",       label: "Revenu échéance contrat"        },
            { value: "CONTRACT_INSTALLMENT_MANUAL_PAYMENT",label: "Paiement manuel contrat"        },
            { value: "CASH_COMMISSION_REVENUE",            label: "Recouvrement commission cash"   },
            { value: "MILESTONE_BONUS",                    label: "Bonus palier courses"           },
            { value: "ACTIVITY_BONUS",                     label: "Bonus activité (4U V3)"         },
            { value: "QUALITY_BONUS",                      label: "Bonus qualité (4U V3)"          },
            { value: "BONUS_CREDIT",                       label: "Bonus promotionnel"             },
            { value: "WELCOME_BONUS",                      label: "Bonus de bienvenue"             },
            { value: "WITHDRAWAL",                         label: "Retraits"                       },
            { value: "ADMIN_CREDIT",                       label: "Crédits admin"                  },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
          className="sm:w-60"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted-foreground)]">
        <span>{filtered.length} transaction{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}</span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(timestampedFilename("transactions-wallet"), TX_CSV_COLUMNS, filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="size-4" />
            Exporter CSV
          </Button>
          <Link
            href="/wallet/transactions"
            className="inline-flex items-center gap-1 font-medium text-[color:var(--primary)] hover:underline"
          >
            Voir l'historique complet
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.transactionId}
          defaultSort={{ key: "date", direction: "desc" }}
        />
        <PaginationFooter total={transactions.length} shown={filtered.length} />
      </Card>
    </div>
  );
}

// ─── Retraits ─────────────────────────────────────────────────────────────────

const WITHDRAWAL_CSV_COLUMNS: readonly CsvColumn<Withdrawal>[] = [
  { key: "owner",     header: "Propriétaire",       value: (w) => w.ownerName || "" },
  { key: "phone",     header: "Téléphone",           value: (w) => w.ownerPhone || "" },
  { key: "wallet",    header: "Wallet",              value: (w) => w.walletType ? walletMeta(w.walletType).label : "" },
  { key: "amount",    header: "Montant (FCFA)",      value: (w) => w.amount },
  { key: "method",    header: "Méthode",             value: (w) => WITHDRAWAL_METHOD_LABELS[w.method] ?? w.method },
  { key: "recipient", header: "Destinataire",        value: (w) => w.recipientDetails?.phone || w.recipientDetails?.accountName || "" },
  { key: "status",    header: "Statut",              value: (w) => WITHDRAWAL_STATUS_LABELS[w.status] ?? w.status },
  { key: "reference", header: "Référence",           value: (w) => w.reference || "" },
  { key: "date",      header: "Date demande",        value: (w) => formatDate(w.createdAt ?? w.requestedAt ?? "") },
  { key: "processed", header: "Date traitement",     value: (w) => w.processedAt ? formatDate(w.processedAt) : "" },
  { key: "reason",    header: "Motif de refus",      value: (w) => w.failureReason || "" },
];

function WithdrawalsTab({ withdrawals, total, onRefresh }: { withdrawals: Withdrawal[]; total: number; onRefresh: () => void }) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [rejectModal, setRejectModal] = useState<{ open: boolean; withdrawalId: string; amount: number }>({ open: false, withdrawalId: "", amount: 0 });
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return withdrawals.filter((w) => {
      if (statusFilter !== "ALL" && w.status  !== statusFilter) return false;
      if (methodFilter !== "ALL" && w.method  !== methodFilter) return false;
      return true;
    });
  }, [withdrawals, statusFilter, methodFilter]);

  const statusIcon = (s: string) => {
    if (s === "COMPLETED") return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    if (s === "REJECTED")  return <XCircle      className="size-3.5 text-red-500"     />;
    return <Clock className="size-3.5 text-amber-500" />;
  };

  function handleApprove(w: Withdrawal) {
    startTransition(async () => {
      const res = await approveWithdrawalAction(w.withdrawalId);
      if (res.success) {
        toast({ kind: "success", title: "Retrait approuvé", description: `${formatXof(w.amount)} décaissé.` });
        onRefresh();
      } else {
        toast({ kind: "error", title: "Impossible d'approuver", description: res.error });
      }
    });
  }

  function handleRejectSubmit() {
    if (!rejectReason.trim()) {
      toast({ kind: "error", title: "Motif requis", description: "Indiquez un motif de refus." });
      return;
    }
    startTransition(async () => {
      const res = await rejectWithdrawalAction(rejectModal.withdrawalId, rejectReason.trim());
      if (res.success) {
        toast({ kind: "success", title: "Retrait rejeté", description: `${formatXof(res.data?.refundedAmount ?? 0)} recrédité.` });
        setRejectModal({ open: false, withdrawalId: "", amount: 0 });
        setRejectReason("");
        onRefresh();
      } else {
        toast({ kind: "error", title: "Impossible de rejeter", description: res.error });
      }
    });
  }

  if (withdrawals.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <Banknote className="size-10 opacity-30" />
        <p className="text-sm font-medium text-[color:var(--foreground)]">Aucun retrait en cours</p>
        <p className="max-w-sm text-xs text-[color:var(--muted-foreground)]">
          Les demandes de retrait des chauffeurs et partenaires apparaîtront ici.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Modal de rejet */}
      <Modal
        open={rejectModal.open}
        onClose={() => { setRejectModal({ open: false, withdrawalId: "", amount: 0 }); setRejectReason(""); }}
        size="md"
        title="Rejeter le retrait"
        description={`Montant : ${formatXof(rejectModal.amount)} — le wallet sera recrédité du même montant.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectModal({ open: false, withdrawalId: "", amount: 0 }); setRejectReason(""); }} disabled={pending}>Annuler</Button>
            <Button variant="danger" onClick={handleRejectSubmit} disabled={pending || !rejectReason.trim()}>
              {pending && <Spinner size="sm" />}
              Confirmer le rejet
            </Button>
          </>
        }
      >
        <Textarea
          label="Motif du refus (obligatoire)"
          required
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Coordonnées incorrectes, montant suspect, demande frauduleuse…"
          rows={3}
        />
      </Modal>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
        <Combobox
          options={[
            { value: "ALL",       label: "Statut : tous"  },
            { value: "PENDING",   label: "En attente"     },
            { value: "APPROVED",  label: "Approuvés"      },
            { value: "COMPLETED", label: "Complétés"      },
            { value: "REJECTED",  label: "Rejetés"        },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          className="sm:w-44"
        />
        <Combobox
          options={[
            { value: "ALL",           label: "Méthode : toutes" },
            { value: "MOBILE_MONEY",  label: "Mobile Money"     },
            { value: "BANK_TRANSFER", label: "Virement"         },
          ]}
          value={methodFilter}
          onChange={setMethodFilter}
          className="sm:w-48"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(timestampedFilename("retraits"), WITHDRAWAL_CSV_COLUMNS, filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="size-4" />
          Exporter CSV
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <th className="px-5 py-2.5 font-medium">Propriétaire</th>
              <th className="px-5 py-2.5 font-medium">Wallet</th>
              <th className="px-5 py-2.5 text-right font-medium">Montant</th>
              <th className="px-5 py-2.5 font-medium">Méthode</th>
              <th className="px-5 py-2.5 font-medium">Destinataire</th>
              <th className="px-5 py-2.5 font-medium">Statut</th>
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {filtered.map((w) => (
              <tr key={w.withdrawalId} className="hover:bg-[color:var(--muted)]/30">
                <td className="px-5 py-3">
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium">{w.ownerName || "—"}</span>
                    {w.ownerPhone && (
                      <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{w.ownerPhone}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  {w.walletType && (
                    <Badge tone={walletMeta(w.walletType).tone}>{walletMeta(w.walletType).label}</Badge>
                  )}
                  {w.sourceBalance === "AFFILIATE" && (
                    <p className="mt-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      {WITHDRAWAL_SOURCE_BALANCE_LABELS.AFFILIATE}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold">{formatXof(w.amount)}</td>
                <td className="px-5 py-3 text-sm">
                  {WITHDRAWAL_METHOD_LABELS[w.method] ?? w.method}
                </td>
                <td className="px-5 py-3">
                  {w.recipientDetails?.phone && (
                    <span className="font-mono text-xs">{w.recipientDetails.phone}</span>
                  )}
                  {w.recipientDetails?.accountName && (
                    <span className="text-xs">{w.recipientDetails.accountName}</span>
                  )}
                  {!w.recipientDetails?.phone && !w.recipientDetails?.accountName && (
                    <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(w.status)}
                    <Badge
                      tone={
                        w.status === "COMPLETED" ? "success"
                        : w.status === "APPROVED"  ? "info"
                        : w.status === "REJECTED"  ? "danger"
                        : "warning"
                      }
                    >
                      {WITHDRAWAL_STATUS_LABELS[w.status] ?? w.status}
                    </Badge>
                  </div>
                  {w.failureReason && (
                    <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">{w.failureReason}</p>
                  )}
                  {w.rejectionReason && (
                    <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">{w.rejectionReason}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                  {formatDate(w.createdAt ?? w.requestedAt ?? "")}
                  {w.processedAt && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      traité {formatDate(w.processedAt)}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3">
                  {w.status === "PENDING" ? (
                    <div className="flex items-center gap-2">
                      <CanView permission="wallet.withdrawal.approve">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                          onClick={() => handleApprove(w)}
                          disabled={pending}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Approuver
                        </Button>
                      </CanView>
                      <CanView permission="wallet.withdrawal.reject">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                          onClick={() => { setRejectModal({ open: true, withdrawalId: w.withdrawalId, amount: w.amount }); setRejectReason(""); }}
                          disabled={pending}
                        >
                          <XCircle className="size-3.5" />
                          Rejeter
                        </Button>
                      </CanView>
                    </div>
                  ) : (
                    <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationFooter total={total} shown={filtered.length} />
      </Card>
    </div>
  );
}

// ─── Revenus PLATFORM ─────────────────────────────────────────────────────────

function PlatformRevenueTab({ data }: { data: PlatformRevenue | undefined }) {
  if (!data) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <Banknote className="size-10 opacity-30" />
        <p className="text-sm font-medium">Données de revenus non disponibles</p>
        <p className="max-w-sm text-xs text-[color:var(--muted-foreground)]">
          Vérifiez que le wallet PLATFORM est bien initialisé côté backend.
        </p>
      </Card>
    );
  }

  const topSource = [...data.breakdown].sort((a, b) => b.total - a.total)[0];
  const pct = (item: { total: number }) =>
    data.totalRevenue > 0 ? Math.round((item.total / data.totalRevenue) * 100) : 0;

  const hasOutflows = data.outflows && data.outflows.total > 0;
  const outflowPct = (item: { total: number }) =>
    data.outflows && data.outflows.total > 0 ? Math.round((item.total / data.outflows.total) * 100) : 0;
  const netPositive = data.netResult === undefined || data.netResult >= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
            Solde wallet PLATFORM
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-[color:var(--foreground)]">
            {formatXof(data.balance)}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            Sub-balance MAIN · wallet <span className="font-mono">{data.walletId.slice(0, 12)}…</span>
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
            Revenus totaux{data.period.from ? " (période)" : " (all-time)"}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatXof(data.totalRevenue)}
          </p>
          {topSource && topSource.total > 0 ? (
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              Source principale :{" "}
              <span className="font-medium text-[color:var(--foreground)]">{topSource.label}</span>{" "}
              ({pct(topSource)}%)
            </p>
          ) : (
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">Aucun revenu enregistré.</p>
          )}
        </Card>
        {data.netResult !== undefined && (
          <Card className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">
              Résultat net
            </p>
            <p className={`mt-2 font-mono text-3xl font-bold ${netPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {netPositive ? "+" : ""}{formatXof(data.netResult)}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              Revenus − dépenses définitives
              {data.outflows ? ` (−${formatXof(data.outflows.total)} sorties)` : ""}
            </p>
          </Card>
        )}
      </div>

      {/* Breakdown revenus */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="px-5 py-4">
          <CardTitle>Décomposition des revenus par source</CardTitle>
          <CardDescription>
            {data.period.from
              ? `Période : ${formatDate(data.period.from)}${data.period.to ? ` → ${formatDate(data.period.to)}` : ""}`
              : "Toutes périodes confondues"}
          </CardDescription>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <th className="px-5 py-2.5 font-medium">Source</th>
              <th className="px-5 py-2.5 font-medium">Répartition</th>
              <th className="px-5 py-2.5 text-right font-medium">Montant crédité</th>
              <th className="px-5 py-2.5 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {data.breakdown.map((item) => {
              const p = pct(item);
              return (
                <tr key={item.source} className="hover:bg-[color:var(--muted)]/30">
                  <td className="px-5 py-3 font-medium">{item.label}</td>
                  <td className="px-5 py-3">
                    <div className="h-1.5 w-full max-w-[160px] rounded-full bg-[color:var(--muted)]">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${p}%` }} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {item.total > 0 ? `+${formatXof(item.total)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-[color:var(--muted-foreground)]">
                    {p > 0 ? `${p}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[color:var(--border)]">
              <td className="px-5 py-3 font-semibold" colSpan={2}>Total</td>
              <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                +{formatXof(data.totalRevenue)}
              </td>
              <td className="px-5 py-3 text-right font-semibold">100%</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Sorties du wallet PLATFORM */}
      {data.outflows && (
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-5 py-4">
            <CardTitle>Sorties du wallet PLATFORM</CardTitle>
            <CardDescription>
              Débits classés par catégorie économique — total {formatXof(data.outflows.total)}
            </CardDescription>
          </CardHeader>
          {data.outflows.totalsByCategory.length > 0 && (
            <div className="flex flex-wrap gap-3 border-b border-[color:var(--border)] px-5 py-3">
              {data.outflows.totalsByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-1.5">
                  <span className={`size-2 rounded-full ${
                    cat.category === "DEFINITIVE_EXPENSE" ? "bg-red-500"
                    : cat.category === "REVENUE_CORRECTION" ? "bg-amber-500"
                    : "bg-blue-500"
                  }`} />
                  <span className="text-xs font-medium">{OUTFLOW_CATEGORY_LABELS[cat.category]}</span>
                  <span className="font-mono text-xs text-[color:var(--muted-foreground)]">{formatXof(cat.total)}</span>
                </div>
              ))}
            </div>
          )}
          {hasOutflows ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[color:var(--border)] text-left text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  <th className="px-5 py-2.5 font-medium">Source</th>
                  <th className="px-5 py-2.5 font-medium">Catégorie</th>
                  <th className="px-5 py-2.5 font-medium">Répartition</th>
                  <th className="px-5 py-2.5 text-right font-medium">Montant débité</th>
                  <th className="px-5 py-2.5 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {data.outflows.breakdown.map((item) => {
                  const p = outflowPct(item);
                  return (
                    <tr key={item.source} className="hover:bg-[color:var(--muted)]/30">
                      <td className="px-5 py-3 font-medium">{item.label}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.category === "DEFINITIVE_EXPENSE"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : item.category === "REVENUE_CORRECTION"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}>
                          {OUTFLOW_CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-1.5 w-full max-w-[160px] rounded-full bg-[color:var(--muted)]">
                          <div className={`h-1.5 rounded-full ${
                            item.category === "DEFINITIVE_EXPENSE" ? "bg-red-500"
                            : item.category === "REVENUE_CORRECTION" ? "bg-amber-500"
                            : "bg-blue-500"
                          }`} style={{ width: `${p}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-red-600 dark:text-red-400">
                        {item.total > 0 ? `−${formatXof(item.total)}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-[color:var(--muted-foreground)]">
                        {p > 0 ? `${p}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[color:var(--border)]">
                  <td className="px-5 py-3 font-semibold" colSpan={3}>Total sorties</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-red-600 dark:text-red-400">
                    −{formatXof(data.outflows.total)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">100%</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <p className="text-sm text-[color:var(--muted-foreground)]">Aucune sortie enregistrée sur cette période.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Modal crédit manuel ──────────────────────────────────────────────────────

function CreditWalletModal({
  open,
  wallets,
  onClose,
}: {
  open: boolean;
  wallets: AdminWallet[];
  onClose: () => void;
}) {
  const [walletId,    setWalletId]    = useState("");
  const [balanceType, setBalanceType] = useState<WalletBalanceType>("MAIN");
  const [creditType,  setCreditType]  = useState<WalletCreditType>("ADMIN_CREDIT");
  const [amount,      setAmount]      = useState(0);
  const [description, setDescription] = useState("");
  const [pending, startTransition]    = useTransition();

  useEffect(() => {
    if (open) { setWalletId(""); setBalanceType("MAIN"); setCreditType("ADMIN_CREDIT"); setAmount(0); setDescription(""); }
  }, [open]);

  function handleSubmit() {
    if (!walletId || amount <= 0 || !description.trim()) {
      toast({ kind: "error", title: "Champs manquants", description: "Wallet, montant > 0 et motif requis." });
      return;
    }
    startTransition(async () => {
      const res = await creditWalletAction(walletId, { balanceType, amount, type: creditType, description: description.trim() });
      if (res.success) {
        toast({ kind: "success", title: "Crédit appliqué", description: `${formatXof(amount)} crédité. Tx: ${res.data?.transactionId?.slice(0, 8)}…` });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: res.error });
      }
    });
  }

  const walletOptions = wallets.map((w) => ({
    value: w.walletId,
    label: `${w.ownerName || w.profileId.slice(0, 10)} — ${walletMeta(w.walletType).label} (${formatXof(w.totalBalance)})`,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Crédit manuel wallet"
      description="Crédite un sous-solde. Réservé aux admins (compensations, corrections, bonus)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={pending}>
            {pending && <Spinner size="sm" />}
            Créditer le wallet
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Combobox label="Wallet cible" options={walletOptions} value={walletId} onChange={setWalletId} placeholder="Sélectionner un wallet…" />
        </div>
        <Combobox
          label="Sous-solde"
          options={[
            { value: "MAIN",     label: "Principal",  description: "Solde principal utilisable" },
            { value: "BONUS",    label: "Bonus",      description: "Bonus et promotions" },
            { value: "REFERRAL", label: "Parrainage", description: "Gains de parrainage" },
          ]}
          value={balanceType}
          onChange={(v) => setBalanceType(v as WalletBalanceType)}
        />
        <Combobox
          label="Type d'opération"
          options={[
            { value: "ADMIN_CREDIT",   label: "Crédit admin",      description: "Correction manuelle" },
            { value: "CREDIT",         label: "Crédit générique",   description: "Crédit standard" },
            { value: "BONUS_CREDIT",   label: "Bonus promotionnel", description: "Crédite le sous-solde BONUS" },
            { value: "REFERRAL_REWARD",label: "Récompense parrainage", description: "Crédite le sous-solde REFERRAL" },
            { value: "REFUND",         label: "Remboursement",      description: "Remboursement client" },
          ]}
          value={creditType}
          onChange={(v) => setCreditType(v as WalletCreditType)}
        />
        <Input
          label="Montant (FCFA)"
          required
          type="number"
          min={1}
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="5000"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Motif / description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Compensation retard, bonus fidélité, correction erreur…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal débit manuel ───────────────────────────────────────────────────────

function DebitWalletModal({
  open,
  wallets,
  onClose,
}: {
  open: boolean;
  wallets: AdminWallet[];
  onClose: () => void;
}) {
  const [walletId,    setWalletId]    = useState("");
  const [debitType,   setDebitType]   = useState<WalletDebitType>("ADMIN_DEBIT");
  const [amount,      setAmount]      = useState(0);
  const [description, setDescription] = useState("");
  const [pending, startTransition]    = useTransition();

  useEffect(() => {
    if (open) { setWalletId(""); setDebitType("ADMIN_DEBIT"); setAmount(0); setDescription(""); }
  }, [open]);

  function handleSubmit() {
    if (!walletId || amount <= 0 || !description.trim()) {
      toast({ kind: "error", title: "Champs manquants", description: "Wallet, montant > 0 et motif requis." });
      return;
    }
    startTransition(async () => {
      const res = await debitWalletAction(walletId, { amount, type: debitType, description: description.trim() });
      if (res.success) {
        toast({ kind: "success", title: "Débit appliqué", description: `${formatXof(amount)} débité. Solde restant : ${formatXof(res.data?.remainingBalance ?? 0)}` });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: res.error });
      }
    });
  }

  const walletOptions = wallets.map((w) => ({
    value: w.walletId,
    label: `${w.ownerName || w.profileId.slice(0, 10)} — ${walletMeta(w.walletType).label} (${formatXof(w.totalBalance)})`,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Débit manuel wallet"
      description="Débite un wallet (ordre automatique : BONUS → REFERRAL → MAIN). Réservé aux admins."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={pending}>
            {pending && <Spinner size="sm" />}
            Débiter le wallet
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Combobox label="Wallet cible" options={walletOptions} value={walletId} onChange={setWalletId} placeholder="Sélectionner un wallet…" />
        </div>
        <Combobox
          label="Type d'opération"
          options={[
            { value: "ADMIN_DEBIT", label: "Débit admin",    description: "Correction manuelle ou ajustement" },
            { value: "DEBIT",       label: "Débit générique", description: "Débit standard" },
            { value: "ADJUSTMENT",  label: "Ajustement",      description: "Correction comptable" },
          ]}
          value={debitType}
          onChange={(v) => setDebitType(v as WalletDebitType)}
        />
        <Input
          label="Montant (FCFA)"
          required
          type="number"
          min={1}
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="5000"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Motif / description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Correction erreur, résolution litige, ajustement comptable…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function WalletLivePage({
  wallets,
  transactions,
  withdrawals = [],
  withdrawalsTotal = 0,
  platformRevenue,
}: WalletLivePageProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [creditOpen, setCreditOpen] = useState(false);
  const [debitOpen,  setDebitOpen]  = useState(false);

  const paymentBalance  = wallets.filter((w) => w.walletType === "PAYMENT" ).reduce((s, w) => s + (w.totalBalance ?? 0), 0);
  const earningsBalance = wallets.filter((w) => w.walletType === "EARNINGS").reduce((s, w) => s + (w.totalBalance ?? 0), 0);
  const platformBalance = platformRevenue?.balance
    ?? wallets.find((w) => w.walletType === "PLATFORM")?.totalBalance
    ?? 0;
  const paymentCount   = wallets.filter((w) => w.walletType === "PAYMENT").length;
  const earningsCount  = wallets.filter((w) => w.walletType === "EARNINGS").length;

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING").length;
  const pendingAmount      = withdrawals.filter((w) => w.status === "PENDING").reduce((s, w) => s + w.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing}>
          {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
          Rafraîchir
        </Button>
        <CanView permission="wallet.credit">
          <Button size="sm" onClick={() => setCreditOpen(true)}>
            <ArrowDownLeft className="size-4" />
            Crédit manuel
          </Button>
        </CanView>
        <CanView permission="wallet.debit">
          <Button size="sm" variant="danger" onClick={() => setDebitOpen(true)}>
            <ArrowUpRight className="size-4" />
            Débit manuel
          </Button>
        </CanView>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          {
            label: "Fonds passagers",
            value: formatXof(paymentBalance),
            sub:   `${paymentCount} wallets PAYMENT`,
            icon:  Users,
            tone:  "primary" as const,
          },
          {
            label: "Solde net chauffeurs",
            value: formatXof(earningsBalance),
            sub:   earningsBalance < 0
              ? `${earningsCount} wallets — dont dettes`
              : `${earningsCount} wallets EARNINGS`,
            icon:  Car,
            tone:  (earningsBalance < 0 ? "danger" : "success") as "danger" | "success",
          },
          {
            label: "Trésorerie plateforme",
            value: formatXof(platformBalance),
            sub:   "Wallet PLATFORM",
            icon:  Wallet,
            tone:  "primary" as const,
          },
          {
            label: "Retraits en attente",
            value: String(pendingWithdrawals),
            sub:   pendingWithdrawals > 0 ? formatXof(pendingAmount) : "aucun retrait en attente",
            icon:  Banknote,
            tone:  (pendingWithdrawals > 0 ? "warning" : "neutral") as "warning" | "neutral",
          },
        ] as const).map(({ label, value, sub, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center gap-4 p-4">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              tone === "primary"  ? "bg-[color:var(--primary-soft)]"
              : tone === "success"  ? "bg-emerald-50 dark:bg-emerald-950/30"
              : tone === "danger"   ? "bg-red-50 dark:bg-red-950/30"
              : tone === "warning"  ? "bg-amber-50 dark:bg-amber-950/30"
              : "bg-[color:var(--muted)]"
            }`}>
              <Icon className={`size-5 ${
                tone === "primary"  ? "text-[color:var(--primary)]"
                : tone === "success"  ? "text-emerald-500"
                : tone === "danger"   ? "text-red-500"
                : tone === "warning"  ? "text-amber-500"
                : "text-[color:var(--muted-foreground)]"
              }`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--muted-foreground)]">{label}</p>
              <p className={`font-mono text-xl font-bold leading-none ${
                tone === "primary"  ? "text-[color:var(--primary)]"
                : tone === "success"  ? "text-emerald-600 dark:text-emerald-400"
                : tone === "danger"   ? "text-red-600 dark:text-red-400"
                : tone === "warning"  ? "text-amber-600 dark:text-amber-400"
                : "text-[color:var(--foreground)]"
              }`}>{value}</p>
              {sub && <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{sub}</p>}
            </div>
          </Card>
        ))}
      </section>

      <CreditWalletModal open={creditOpen} wallets={wallets} onClose={() => { setCreditOpen(false); router.refresh(); }} />
      <DebitWalletModal  open={debitOpen}  wallets={wallets} onClose={() => { setDebitOpen(false);  router.refresh(); }} />

      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        tabs={[
          {
            value: "overview",
            label: "Vue d'ensemble",
            content: <OverviewTab wallets={wallets} transactions={transactions} />,
          },
          {
            value: "wallets",
            label: "Wallets",
            badge: wallets.length > 0 ? { count: wallets.length, tone: "primary" as const } : undefined,
            content: <WalletsTab wallets={wallets} />,
          },
          {
            value: "transactions",
            label: "Transactions",
            badge: transactions.length > 0 ? { count: transactions.length, tone: "info" as const } : undefined,
            content: <TransactionsTab transactions={transactions} />,
          },
          {
            value: "withdrawals",
            label: "Retraits",
            badge: withdrawalsTotal > 0 ? { count: withdrawalsTotal, tone: "warning" as const } : undefined,
            content: <WithdrawalsTab withdrawals={withdrawals} total={withdrawalsTotal} onRefresh={() => startRefresh(() => router.refresh())} />,
          },
          {
            value: "platform-revenue",
            label: "Revenus plateforme",
            content: <PlatformRevenueTab data={platformRevenue} />,
          },
        ]}
      />
    </div>
  );
}
