"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bike,
  Car,
  RefreshCw,
  Users,
  Wallet,
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
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatDate, formatXof } from "@/shared/lib/format";
import { rideStatusMeta, fullParty, type AdminRide } from "@/features/rides/domain/admin-ride";
import {
  creditWalletAction,
  debitWalletAction,
  type WalletBalanceType,
  type WalletCreditType,
  type WalletDebitType,
} from "./application/actions";
import type { AdminWallet } from "./domain/wallet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletLivePageProps {
  wallets: AdminWallet[];
  rides: AdminRide[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WALLET_TYPE_META: Record<string, { label: string; tone: "primary" | "success" | "info" | "neutral" | "warning" }> = {
  PAYMENT:  { label: "Paiement (passager)", tone: "primary" },
  EARNINGS: { label: "Gains (driver)",      tone: "success" },
  PLATFORM: { label: "Plateforme",          tone: "info"    },
};

const PAYMENT_METHOD_META: Record<string, { label: string; color: string }> = {
  CASH:         { label: "Cash",           color: "text-orange-500" },
  WALLET:       { label: "Wallet interne", color: "text-blue-500"   },
  MOBILE_MONEY: { label: "Mobile Money",   color: "text-green-500"  },
  CARD:         { label: "Carte",          color: "text-purple-500" },
};

// ─── Vue d'ensemble ───────────────────────────────────────────────────────────

function OverviewTab({ wallets, rides }: { wallets: AdminWallet[]; rides: AdminRide[] }) {
  // Wallet breakdown by type
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

  // Rides breakdown by payment method
  const byMethod = useMemo(() => {
    const map: Record<string, { count: number; volume: number; completed: number }> = {};
    for (const r of rides) {
      const key = r.paymentMethod || "UNKNOWN";
      if (!map[key]) map[key] = { count: 0, volume: 0, completed: 0 };
      map[key].count++;
      map[key].volume += r.estimatedPrice ?? 0;
      if (["COMPLETED", "RATED"].includes(r.status)) {
        map[key].completed++;
        map[key].volume += (r.finalPrice ?? r.estimatedPrice ?? 0) - (r.estimatedPrice ?? 0);
      }
    }
    return map;
  }, [rides]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rides) {
      map[r.status] = (map[r.status] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rides]);

  return (
    <div className="flex flex-col gap-6">
      {/* Wallets par type */}
      <Card>
        <CardHeader>
          <CardTitle>Wallets par type</CardTitle>
          <CardDescription>Répartition des wallets actifs sur la plateforme.</CardDescription>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              <th className="px-5 py-2.5 font-medium">Type</th>
              <th className="px-5 py-2.5 text-right font-medium">Wallets</th>
              <th className="px-5 py-2.5 text-right font-medium">Solde total</th>
              <th className="px-5 py-2.5 text-right font-medium">Solde moyen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {Object.entries(byType).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-[color:var(--muted-foreground)]">
                  Aucun wallet disponible.
                </td>
              </tr>
            ) : (
              Object.entries(byType).map(([type, data]) => {
                const meta = WALLET_TYPE_META[type] ?? { label: type, tone: "neutral" as const };
                const avg = data.count > 0 ? data.totalBalance / data.count : 0;
                return (
                  <tr key={type}>
                    <td className="px-5 py-3">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[color:var(--foreground)]">
                      {data.count}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                      {formatXof(data.totalBalance)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[color:var(--muted-foreground)]">
                      {formatXof(Math.round(avg))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Volume courses par méthode */}
        <Card>
          <CardHeader>
            <CardTitle>Volume courses par méthode de paiement</CardTitle>
            <CardDescription>
              Basé sur {rides.length} course{rides.length !== 1 ? "s" : ""} enregistrée{rides.length !== 1 ? "s" : ""}.
            </CardDescription>
          </CardHeader>
          {Object.keys(byMethod).length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[color:var(--muted-foreground)]">Aucune course.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  <th className="px-5 py-2.5 font-medium">Méthode</th>
                  <th className="px-5 py-2.5 text-right font-medium">Courses</th>
                  <th className="px-5 py-2.5 text-right font-medium">Volume estimé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {Object.entries(byMethod).map(([method, data]) => {
                  const meta = PAYMENT_METHOD_META[method] ?? { label: method, color: "" };
                  return (
                    <tr key={method}>
                      <td className={`px-5 py-3 font-medium ${meta.color}`}>
                        {meta.label}
                      </td>
                      <td className="px-5 py-3 text-right text-[color:var(--foreground)]">
                        {data.count}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                        {formatXof(data.volume)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Statuts des courses */}
        <Card>
          <CardHeader>
            <CardTitle>Statuts des courses</CardTitle>
            <CardDescription>Répartition par état sur toutes les courses.</CardDescription>
          </CardHeader>
          {statusBreakdown.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[color:var(--muted-foreground)]">Aucune course.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[color:var(--border)]">
              {statusBreakdown.map(([status, count]) => {
                const meta = rideStatusMeta(status);
                const pct = rides.length > 0 ? Math.round((count / rides.length) * 100) : 0;
                return (
                  <li key={status} className="flex items-center gap-3 px-5 py-3">
                    <Badge tone={meta.tone} className="w-40 justify-center text-center">
                      {meta.label}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-1.5 w-full rounded-full bg-[color:var(--muted)]">
                        <div
                          className="h-1.5 rounded-full bg-[color:var(--primary)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right font-mono text-sm text-[color:var(--foreground)]">
                      {count} ({pct}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Wallets table ────────────────────────────────────────────────────────────

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
          ],
        },
      },
      render: (row) => {
        const meta = WALLET_TYPE_META[row.walletType] ?? { label: row.walletType, tone: "neutral" as const };
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: "owner",
      header: "Propriétaire",
      sortAccessor: (row) => row.ownerName || row.profileId,
      render: (row) => {
        const name = row.ownerName || "—";
        const phone = row.ownerPhone || null;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={name} className="size-8 text-xs" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-[color:var(--foreground)]">{name}</span>
              {phone ? (
                <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{phone}</span>
              ) : (
                <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]" title={row.profileId}>
                  {row.profileId.slice(0, 12)}…
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
        <span className="font-mono text-sm text-[color:var(--foreground)]">
          {formatXof(row.mainBalance)}
        </span>
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
      key: "totalBalance",
      header: "Total",
      align: "right",
      sortAccessor: (row) => row.totalBalance,
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-[color:var(--foreground)]">
          {formatXof(row.totalBalance)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      filter: {
        accessor: (row) => row.status,
        def: {
          kind: "select",
          options: [
            { value: "ACTIVE", label: "Actif"  },
            { value: "FROZEN", label: "Gelé"   },
          ],
        },
      },
      render: (row) => (
        <Badge tone={row.status === "ACTIVE" ? "success" : "warning"}>
          {row.status === "ACTIVE" ? "Actif" : row.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Créé le",
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <SearchField
          placeholder="Rechercher par type, propriétaire, ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-72"
        />
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

// ─── Transactions (courses comme proxy) ───────────────────────────────────────

function TransactionsTab({ rides }: { rides: AdminRide[] }) {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rides.filter((r) => {
      if (q) {
        const hay = `${r.rideNumber} ${fullParty(r.passenger)} ${fullParty(r.driver)} ${r.paymentMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (methodFilter !== "ALL" && r.paymentMethod !== methodFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      return true;
    });
  }, [rides, search, methodFilter, statusFilter]);

  const columns: ColumnDef<AdminRide>[] = [
    {
      key: "ride",
      header: "Course",
      sortAccessor: (row) => row.rideNumber,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
            <ArrowUpRight className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-xs font-semibold text-[color:var(--primary)]">
              {row.rideNumber}
            </span>
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              {formatDate(row.createdAt)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "passenger",
      header: "Passager",
      sortAccessor: (row) => fullParty(row.passenger),
      render: (row) => {
        const name = fullParty(row.passenger);
        return (
          <div className="flex items-center gap-2">
            <Avatar name={name} className="size-8 text-xs" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-[color:var(--foreground)]">{name || "—"}</span>
              {row.passenger?.phoneNumber ? (
                <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                  {row.passenger.phoneNumber}
                </span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: "method",
      header: "Méthode",
      sortAccessor: (row) => row.paymentMethod,
      filter: {
        accessor: (row) => row.paymentMethod,
        def: {
          kind: "select",
          options: [
            { value: "CASH",         label: "Cash"           },
            { value: "WALLET",       label: "Wallet interne" },
            { value: "MOBILE_MONEY", label: "Mobile Money"   },
            { value: "CARD",         label: "Carte"          },
          ],
        },
      },
      render: (row) => {
        const meta = PAYMENT_METHOD_META[row.paymentMethod] ?? { label: row.paymentMethod, color: "" };
        return (
          <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
        );
      },
    },
    {
      key: "amount",
      header: "Montant",
      align: "right",
      sortAccessor: (row) => row.finalPrice ?? row.estimatedPrice,
      render: (row) => {
        const amount = row.finalPrice ?? row.estimatedPrice ?? 0;
        const isEstimate = row.finalPrice == null;
        return (
          <div className="text-right">
            <span className="font-mono text-sm font-medium text-[color:var(--foreground)]">
              {formatXof(amount)}
            </span>
            {isEstimate && (
              <p className="text-[10px] text-[color:var(--muted-foreground)]">estimé</p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => row.status,
      filter: {
        accessor: (row) => row.status,
        def: {
          kind: "select",
          options: [
            { value: "COMPLETED",        label: "Terminée"            },
            { value: "RATED",            label: "Notée"               },
            { value: "IN_PROGRESS",      label: "En cours"            },
            { value: "NO_DRIVER_FOUND",  label: "Aucun driver trouvé" },
            { value: "CANCELLED_PASSENGER", label: "Annulée (passager)" },
            { value: "CANCELLED_DRIVER", label: "Annulée (driver)"    },
          ],
        },
      },
      render: (row) => {
        const meta = rideStatusMeta(row.status);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
  ];

  // Volume réel des courses terminées
  const completedVolume = rides
    .filter((r) => ["COMPLETED", "RATED"].includes(r.status))
    .reduce((s, r) => s + (r.finalPrice ?? r.estimatedPrice ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {completedVolume > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <ArrowDownLeft className="size-4" />
          Volume total des courses terminées : <strong className="font-mono">{formatXof(completedVolume)}</strong>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <SearchField
          placeholder="Rechercher course, passager, driver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1 sm:min-w-72"
        />
        <Combobox
          options={[
            { value: "ALL",          label: "Toutes méthodes" },
            { value: "CASH",         label: "Cash"            },
            { value: "WALLET",       label: "Wallet"          },
            { value: "MOBILE_MONEY", label: "Mobile Money"    },
          ]}
          value={methodFilter}
          onChange={setMethodFilter}
          className="sm:w-44"
        />
        <Combobox
          options={[
            { value: "ALL",                label: "Tous statuts"         },
            { value: "COMPLETED",          label: "Terminées"            },
            { value: "RATED",              label: "Notées"               },
            { value: "IN_PROGRESS",        label: "En cours"             },
            { value: "NO_DRIVER_FOUND",    label: "Aucun driver"         },
            { value: "CANCELLED_PASSENGER", label: "Annulées passager"  },
            { value: "CANCELLED_DRIVER",   label: "Annulées driver"      },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          className="sm:w-48"
        />
      </div>
      <Card className="overflow-hidden p-0">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.rideId}
          rowHref={(r) => `/vtc/rides/${r.rideId}`}
          defaultSort={{ key: "amount", direction: "desc" }}
        />
        <PaginationFooter total={rides.length} shown={filtered.length} />
      </Card>
    </div>
  );
}

// ─── Modal crédit manuel ──────────────────────────────────────────────────────

function CreditWalletModal({
  open,
  wallets,
  rides,
  onClose,
}: {
  open: boolean;
  wallets: AdminWallet[];
  rides: AdminRide[];
  onClose: () => void;
}) {
  const [walletId, setWalletId] = useState("");
  const [balanceType, setBalanceType] = useState<WalletBalanceType>("MAIN");
  const [creditType, setCreditType] = useState<WalletCreditType>("ADMIN_CREDIT");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setWalletId("");
      setBalanceType("MAIN");
      setCreditType("ADMIN_CREDIT");
      setAmount(0);
      setDescription("");
    }
  }, [open]);

  function handleSubmit() {
    if (!walletId || amount <= 0 || !description.trim()) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Sélectionnez un wallet, entrez un montant > 0 et un motif.",
      });
      return;
    }
    startTransition(async () => {
      const res = await creditWalletAction(walletId, {
        balanceType,
        amount,
        type: creditType,
        description: description.trim(),
      });
      if (res.success) {
        toast({
          kind: "success",
          title: "Crédit appliqué",
          description: `${formatXof(amount)} crédité sur le sous-solde ${balanceType}. Tx: ${res.data?.transactionId?.slice(0, 8)}…`,
        });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec du crédit", description: res.error });
      }
    });
  }

  // Build profileId → name from rides (passenger + driver)
  const nameByProfileId = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rides) {
      if (r.passenger?.passengerId) {
        const name = fullParty(r.passenger);
        if (name) map.set(r.passenger.passengerId, name);
      }
      if (r.driver?.driverId) {
        const name = fullParty(r.driver);
        if (name) map.set(r.driver.driverId, name);
      }
    }
    return map;
  }, [rides]);

  const walletOptions = wallets.map((w) => {
    const ownerName =
      w.ownerName ||
      nameByProfileId.get(w.profileId) ||
      null;
    const typeLabel = WALLET_TYPE_META[w.walletType]?.label ?? w.walletType;
    const label = ownerName
      ? `${ownerName} — ${typeLabel} (${formatXof(w.totalBalance)})`
      : `${typeLabel} — ${w.profileId.slice(0, 12)}… (${formatXof(w.totalBalance)})`;
    return { value: w.walletId, label };
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Crédit manuel wallet"
      description="Crédite un sous-solde. Réservé aux admins — usage interne (compensations, corrections, bonus)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={pending}>
            {pending ? <Spinner size="sm" /> : null}
            Créditer le wallet
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Combobox
            label="Wallet cible"
            options={walletOptions}
            value={walletId}
            onChange={setWalletId}
            placeholder="Sélectionner un wallet…"
          />
        </div>
        <Combobox
          label="Sous-solde"
          options={[
            { value: "MAIN",     label: "Principal",   description: "Solde principal utilisable" },
            { value: "BONUS",    label: "Bonus",        description: "Bonus et promotions" },
            { value: "REFERRAL", label: "Parrainage",   description: "Gains de parrainage" },
          ]}
          value={balanceType}
          onChange={(v) => setBalanceType(v as WalletBalanceType)}
        />
        <Combobox
          label="Type d'opération"
          options={[
            { value: "ADMIN_CREDIT",    label: "Crédit admin",       description: "Correction manuelle" },
            { value: "CREDIT",          label: "Crédit générique",   description: "Crédit standard" },
            { value: "BONUS",           label: "Bonus",              description: "Bonus promotionnel" },
            { value: "REFERRAL_BONUS",  label: "Bonus parrainage",   description: "Récompense parrainage" },
            { value: "REFUND",          label: "Remboursement",      description: "Remboursement client" },
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
  rides,
  onClose,
}: {
  open: boolean;
  wallets: AdminWallet[];
  rides: AdminRide[];
  onClose: () => void;
}) {
  const [walletId, setWalletId] = useState("");
  const [balanceType, setBalanceType] = useState<WalletBalanceType>("MAIN");
  const [debitType, setDebitType] = useState<WalletDebitType>("DEBIT");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setWalletId("");
      setBalanceType("MAIN");
      setDebitType("DEBIT");
      setAmount(0);
      setDescription("");
    }
  }, [open]);

  function handleSubmit() {
    if (!walletId || amount <= 0 || !description.trim()) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Sélectionnez un wallet, entrez un montant > 0 et un motif.",
      });
      return;
    }
    startTransition(async () => {
      const res = await debitWalletAction(walletId, {
        balanceType,
        amount,
        type: debitType,
        description: description.trim(),
      });
      if (res.success) {
        toast({
          kind: "success",
          title: "Débit appliqué",
          description: `${formatXof(amount)} débité. Solde restant : ${formatXof(res.data?.remainingBalance ?? 0)}`,
        });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec du débit", description: res.error });
      }
    });
  }

  const nameByProfileId = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rides) {
      if (r.passenger?.passengerId) {
        const name = fullParty(r.passenger);
        if (name) map.set(r.passenger.passengerId, name);
      }
      if (r.driver?.driverId) {
        const name = fullParty(r.driver);
        if (name) map.set(r.driver.driverId, name);
      }
    }
    return map;
  }, [rides]);

  const walletOptions = wallets.map((w) => {
    const ownerName = w.ownerName || nameByProfileId.get(w.profileId) || null;
    const typeLabel = WALLET_TYPE_META[w.walletType]?.label ?? w.walletType;
    const label = ownerName
      ? `${ownerName} — ${typeLabel} (${formatXof(w.totalBalance)})`
      : `${typeLabel} — ${w.profileId.slice(0, 12)}… (${formatXof(w.totalBalance)})`;
    return { value: w.walletId, label };
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Débit manuel wallet"
      description="Débite un wallet. Réservé aux admins — usage interne (corrections, pénalités, litiges)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={pending}>
            {pending ? <Spinner size="sm" /> : null}
            Débiter le wallet
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Combobox
            label="Wallet cible"
            options={walletOptions}
            value={walletId}
            onChange={setWalletId}
            placeholder="Sélectionner un wallet…"
          />
        </div>
        <Combobox
          label="Sous-solde"
          options={[
            { value: "MAIN",     label: "Principal",  description: "Solde principal" },
            { value: "BONUS",    label: "Bonus",       description: "Bonus et promotions" },
            { value: "REFERRAL", label: "Parrainage",  description: "Gains de parrainage" },
          ]}
          value={balanceType}
          onChange={(v) => setBalanceType(v as WalletBalanceType)}
        />
        <Combobox
          label="Type d'opération"
          options={[
            { value: "DEBIT",       label: "Débit générique", description: "Débit standard" },
            { value: "ADMIN_DEBIT", label: "Débit admin",     description: "Correction manuelle" },
            { value: "PENALTY",     label: "Pénalité",        description: "Sanction / amende" },
            { value: "CORRECTION",  label: "Correction",      description: "Correction d'erreur" },
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
            placeholder="Pénalité retard, correction erreur, résolution litige…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function WalletLivePage({ wallets, rides }: WalletLivePageProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [creditOpen, setCreditOpen] = useState(false);
  const [debitOpen, setDebitOpen] = useState(false);

  // KPIs réels
  const tvl = wallets.reduce((s, w) => s + (w.totalBalance ?? 0), 0);
  const activeWallets = wallets.filter((w) => w.status === "ACTIVE").length;
  const paymentWallets = wallets.filter((w) => w.walletType === "PAYMENT").length;
  const earningsWallets = wallets.filter((w) => w.walletType === "EARNINGS").length;

  const completedRides = rides.filter((r) => ["COMPLETED", "RATED"].includes(r.status));
  const totalRideVolume = completedRides.reduce(
    (s, r) => s + (r.finalPrice ?? r.estimatedPrice ?? 0),
    0,
  );

  const cashRides = rides.filter((r) => r.paymentMethod === "CASH").length;
  const walletRides = rides.filter((r) => r.paymentMethod === "WALLET").length;
  const mobileRides = rides.filter((r) => r.paymentMethod === "MOBILE_MONEY").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Actions barre */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
        >
          {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
          Rafraîchir
        </Button>
        <Button size="sm" onClick={() => setCreditOpen(true)}>
          <ArrowDownLeft className="size-4" />
          Crédit manuel
        </Button>
        <Button size="sm" variant="danger" onClick={() => setDebitOpen(true)}>
          <ArrowUpRight className="size-4" />
          Débit manuel
        </Button>
      </div>

      {/* KPI Cards — données réelles */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TVL plateforme"
          value={formatXof(tvl)}
          trend={{ value: `${wallets.length} wallets`, direction: "flat" }}
          helper={`${activeWallets} actifs · PAYMENT + EARNINGS`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Wallets passagers"
          value={String(paymentWallets)}
          trend={{ value: "type PAYMENT", direction: "flat" }}
          helper="solde paiement des passagers"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Wallets drivers"
          value={String(earningsWallets)}
          trend={{ value: "type EARNINGS", direction: "flat" }}
          helper="gains des chauffeurs"
          icon={Car}
          tone="success"
        />
        <StatCard
          label="Volume courses terminées"
          value={formatXof(totalRideVolume)}
          trend={{ value: `${completedRides.length} course${completedRides.length !== 1 ? "s" : ""}`, direction: completedRides.length > 0 ? "up" : "flat" }}
          helper={`Cash: ${cashRides} · Wallet: ${walletRides} · Mobile: ${mobileRides}`}
          icon={Bike}
          tone="secondary"
        />
      </section>

      <CreditWalletModal
        open={creditOpen}
        wallets={wallets}
        rides={rides}
        onClose={() => setCreditOpen(false)}
      />
      <DebitWalletModal
        open={debitOpen}
        wallets={wallets}
        rides={rides}
        onClose={() => setDebitOpen(false)}
      />

      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        tabs={[
          {
            value: "overview",
            label: "Vue d'ensemble",
            content: <OverviewTab wallets={wallets} rides={rides} />,
          },
          {
            value: "wallets",
            label: "Wallets",
            badge: wallets.length > 0 ? { count: wallets.length, tone: "primary" } : undefined,
            content: <WalletsTab wallets={wallets} />,
          },
          {
            value: "transactions",
            label: "Transactions (courses)",
            badge: rides.length > 0 ? { count: rides.length, tone: "info" } : undefined,
            content: <TransactionsTab rides={rides} />,
          },
          {
            value: "withdrawals",
            label: "Retraits",
            badge: undefined,
            content: (
              <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <Banknote className="size-10 opacity-30" />
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  Aucun retrait en attente
                </p>
                <p className="max-w-sm text-xs text-[color:var(--muted-foreground)]">
                  L&apos;endpoint de gestion des retraits n&apos;est pas encore disponible côté backend.
                  Les retraits apparaîtront ici dès qu&apos;il sera activé.
                </p>
              </Card>
            ),
          },
          {
            value: "reconciliation",
            label: "Réconciliation",
            content: (
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Réconciliation par méthode de paiement</CardTitle>
                    <CardDescription>
                      Basé sur {rides.length} course{rides.length !== 1 ? "s" : ""} — données en temps réel.
                    </CardDescription>
                  </CardHeader>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
                        <th className="px-5 py-2.5 font-medium">Méthode</th>
                        <th className="px-5 py-2.5 text-right font-medium">Courses</th>
                        <th className="px-5 py-2.5 text-right font-medium">Terminées</th>
                        <th className="px-5 py-2.5 text-right font-medium">Volume total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border)]">
                      {(["CASH", "WALLET", "MOBILE_MONEY", "CARD"] as const).map((method) => {
                        const methodRides = rides.filter((r) => r.paymentMethod === method);
                        const done = methodRides.filter((r) => ["COMPLETED", "RATED"].includes(r.status));
                        const vol = methodRides.reduce((s, r) => s + (r.estimatedPrice ?? 0), 0);
                        const meta = PAYMENT_METHOD_META[method];
                        return (
                          <tr key={method}>
                            <td className={`px-5 py-3 font-medium ${meta.color}`}>
                              {meta.label}
                            </td>
                            <td className="px-5 py-3 text-right text-[color:var(--foreground)]">
                              {methodRides.length > 0 ? methodRides.length : "—"}
                            </td>
                            <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400">
                              {done.length > 0 ? done.length : "—"}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                              {vol > 0 ? formatXof(vol) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>

                {/* Wallets platform */}
                <Card className="p-5">
                  <CardTitle className="mb-4">Wallet plateforme</CardTitle>
                  {wallets.filter((w) => w.walletType === "PLATFORM").length === 0 ? (
                    <p className="text-sm text-[color:var(--muted-foreground)]">Aucun wallet plateforme trouvé.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {wallets
                        .filter((w) => w.walletType === "PLATFORM")
                        .map((w) => (
                          <li key={w.walletId} className="flex items-center justify-between rounded-lg border border-[color:var(--border)] p-4">
                            <div>
                              <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Wallet Plateforme
                              </p>
                              <p className="font-mono text-xs text-[color:var(--muted-foreground)]">
                                {w.walletId}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-xl font-semibold text-[color:var(--foreground)]">
                                {formatXof(w.totalBalance)}
                              </p>
                              <Badge tone={w.status === "ACTIVE" ? "success" : "warning"}>
                                {w.status}
                              </Badge>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
