"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { SearchField } from "@/shared/ui/search-field";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatXof } from "@/shared/lib/format";
import {
  useWalletStore,
  type TxRow,
  type TxType,
  type UserKind,
} from "./store";

const TX_TYPE_META: Record<
  TxType,
  { label: string; tone: "success" | "primary" | "warning" | "danger" | "info"; isCredit: boolean }
> = {
  RECHARGE: { label: "Recharge", tone: "success", isCredit: true },
  PAYMENT: { label: "Paiement", tone: "primary", isCredit: false },
  TRANSFER: { label: "Transfert", tone: "info", isCredit: false },
  WITHDRAW: { label: "Retrait", tone: "warning", isCredit: false },
  REFERRAL_BONUS: { label: "Bonus parrainage", tone: "success", isCredit: true },
  MANUAL_CREDIT: { label: "Crédit admin", tone: "info", isCredit: true },
  MANUAL_DEBIT: { label: "Débit admin", tone: "warning", isCredit: false },
  REFUND: { label: "Remboursement", tone: "primary", isCredit: true },
};

const METHOD_LABEL: Record<TxRow["method"], string> = {
  WALLET: "Wallet interne",
  FEDAPAY: "FedaPay",
  MOMO: "MTN MoMo",
  MOOV: "Moov Money",
  KKIAPAY: "KKiaPay",
  CASH: "Cash",
};

function MethodIcon({ method }: { method: TxRow["method"] }) {
  const cls = "size-3.5 text-[color:var(--muted-foreground)]";
  if (method === "WALLET") return <Wallet className={cls} />;
  if (method === "FEDAPAY") return <CreditCard className={cls} />;
  if (method === "CASH") return <Banknote className={cls} />;
  return <Smartphone className={cls} />;
}

function ManualOpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useWalletStore((s) => s.createManual);
  const [type, setType] = useState<"MANUAL_CREDIT" | "MANUAL_DEBIT">("MANUAL_CREDIT");
  const [userKind, setUserKind] = useState<UserKind>("PASSENGER");
  const [userName, setUserName] = useState("");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setType("MANUAL_CREDIT");
      setUserKind("PASSENGER");
      setUserName("");
      setAmount(0);
      setReason("");
    }
  }, [open]);

  function handleSubmit() {
    if (!userName || amount <= 0 || !reason.trim()) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Utilisateur, montant > 0 et motif sont requis.",
      });
      return;
    }
    create({ type, userName, userKind, amount, reason: reason.trim() });
    toast({
      kind: "success",
      title: type === "MANUAL_CREDIT" ? "Crédit appliqué" : "Débit appliqué",
      description: `${formatXof(amount)} · ${userName}`,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Crédit / débit manuel"
      description="Opération comptable visible dans l'audit log."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant={type === "MANUAL_DEBIT" ? "danger" : "primary"}
            onClick={handleSubmit}
          >
            {type === "MANUAL_CREDIT" ? "Créditer le compte" : "Débiter le compte"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Combobox
          label="Type d'opération"
          options={[
            { value: "MANUAL_CREDIT", label: "Crédit (+)", description: "Augmente le solde" },
            { value: "MANUAL_DEBIT", label: "Débit (−)", description: "Diminue le solde" },
          ]}
          value={type}
          onChange={(v) => setType(v as "MANUAL_CREDIT" | "MANUAL_DEBIT")}
        />
        <Combobox
          label="Type d'utilisateur"
          options={[
            { value: "PASSENGER", label: "Passager" },
            { value: "DRIVER", label: "Driver" },
          ]}
          value={userKind}
          onChange={(v) => setUserKind(v as UserKind)}
        />
        <Input
          label="Nom de l'utilisateur"
          required
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Aline Kouassi"
          className="sm:col-span-2"
        />
        <Input
          label="Montant (FCFA)"
          required
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Motif"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bonus fidélité, remboursement, correction…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}

function TransactionsTable({
  rows,
  onApprove,
  onRefuse,
}: {
  rows: TxRow[];
  onApprove: (tx: TxRow) => void;
  onRefuse: (tx: TxRow) => void;
}) {
  const columns: ColumnDef<TxRow>[] = [
    {
      key: "type",
      header: "Type",
      sortAccessor: (row) => row.type,
      filter: {
        accessor: (row) => row.type,
        def: {
          kind: "select",
          options: [
            { value: "RECHARGE", label: "Recharge" },
            { value: "PAYMENT", label: "Paiement" },
            { value: "TRANSFER", label: "Transfert" },
            { value: "WITHDRAW", label: "Retrait" },
            { value: "REFERRAL_BONUS", label: "Bonus parrainage" },
            { value: "MANUAL_CREDIT", label: "Crédit admin" },
            { value: "MANUAL_DEBIT", label: "Débit admin" },
            { value: "REFUND", label: "Remboursement" },
          ],
        },
      },
      render: (row) => {
        const meta = TX_TYPE_META[row.type];
        return (
          <div className="flex items-center gap-2">
            <span
              className={`flex size-8 items-center justify-center rounded-full ${
                meta.isCredit
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              }`}
            >
              {meta.isCredit ? (
                <ArrowDownLeft className="size-4" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
            </span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        );
      },
    },
    {
      key: "user",
      header: "Utilisateur",
      sortAccessor: (row) => row.userName.toLowerCase(),
      filter: {
        accessor: (row) => row.userKind,
        def: {
          kind: "select",
          options: [
            { value: "PASSENGER", label: "Passagers" },
            { value: "DRIVER", label: "Drivers" },
            { value: "ADMIN", label: "Admins" },
          ],
        },
      },
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.userName} className="size-8 text-xs" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-[color:var(--foreground)]">{row.userName}</span>
            <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
              {row.userKind === "PASSENGER"
                ? "Passager"
                : row.userKind === "DRIVER"
                  ? "Driver"
                  : "Admin"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "method",
      header: "Méthode",
      sortAccessor: (row) => row.method,
      filter: {
        accessor: (row) => row.method,
        def: {
          kind: "select",
          options: [
            { value: "WALLET", label: "Wallet interne" },
            { value: "FEDAPAY", label: "FedaPay" },
            { value: "MOMO", label: "MTN MoMo" },
            { value: "MOOV", label: "Moov Money" },
            { value: "KKIAPAY", label: "KKiaPay" },
            { value: "CASH", label: "Cash" },
          ],
        },
      },
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-[color:var(--foreground)]">
          <MethodIcon method={row.method} />
          {METHOD_LABEL[row.method]}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Référence",
      sortAccessor: (row) => row.reference,
      render: (row) => (
        <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
          {row.reference}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Montant",
      align: "right",
      sortAccessor: (row) => row.amount,
      filter: {
        accessor: (row) => row.amount,
        def: { kind: "number", unit: "FCFA" },
      },
      render: (row) => {
        const meta = TX_TYPE_META[row.type];
        return (
          <span
            className={`font-mono text-sm font-medium ${
              meta.isCredit
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[color:var(--foreground)]"
            }`}
          >
            {meta.isCredit ? "+" : "−"}
            {formatXof(row.amount)}
          </span>
        );
      },
    },
    {
      key: "when",
      header: "Date",
      sortAccessor: (row) => row.ago,
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">{row.ago}</span>
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
            { value: "SUCCESS", label: "Confirmées" },
            { value: "PENDING", label: "En attente" },
            { value: "FAILED", label: "Échec" },
            { value: "REJECTED", label: "Refusées" },
          ],
        },
      },
      render: (row) => {
        const tone =
          row.status === "SUCCESS"
            ? "success"
            : row.status === "PENDING"
              ? "warning"
              : "danger";
        const label =
          row.status === "SUCCESS"
            ? "Confirmée"
            : row.status === "PENDING"
              ? "En attente"
              : row.status === "REJECTED"
                ? "Refusée"
                : "Échec";
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        row.type === "WITHDRAW" && row.status === "PENDING" ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="outline" size="sm" onClick={() => onRefuse(row)}>
              Refuser
            </Button>
            <Button size="sm" onClick={() => onApprove(row)}>
              Approuver
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />
      <PaginationFooter total={rows.length} shown={rows.length} />
    </Card>
  );
}

function PendingWithdrawalsList({
  rows,
  onApprove,
  onRefuse,
}: {
  rows: TxRow[];
  onApprove: (tx: TxRow) => void;
  onRefuse: (tx: TxRow) => void;
}) {
  return (
    <Card className="p-0">
      <CardHeader className="flex-row items-end justify-between">
        <div>
          <CardTitle>Retraits en attente de validation</CardTitle>
          <CardDescription>
            Retraits drivers à valider — déclenche le virement Mobile Money.
          </CardDescription>
        </div>
        <Badge tone="warning">{rows.length} en attente</Badge>
      </CardHeader>
      <ul className="flex flex-col">
        {rows.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            Aucun retrait en attente.
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] px-5 py-4 first:border-t-0"
            >
              <Avatar name={row.userName} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[color:var(--foreground)]">
                  {row.userName}
                </p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  {METHOD_LABEL[row.method]} · ref {row.reference} · {row.ago}
                </p>
              </div>
              <span className="font-mono text-base font-semibold text-[color:var(--foreground)]">
                −{formatXof(row.amount)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onRefuse(row)}>
                  Refuser
                </Button>
                <Button size="sm" onClick={() => onApprove(row)}>
                  Approuver
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

function OverviewTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Réconciliation par méthode (30 derniers jours)</CardTitle>
          <CardDescription>
            Volumes encaissés / décaissés par provider de paiement.
          </CardDescription>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              <th className="px-5 py-2.5 font-medium">Méthode</th>
              <th className="px-5 py-2.5 font-medium">Statut</th>
              <th className="px-5 py-2.5 text-right font-medium">Volume entrant</th>
              <th className="px-5 py-2.5 text-right font-medium">Volume sortant</th>
              <th className="px-5 py-2.5 text-right font-medium">Solde net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {[
              { name: "FedaPay", status: "Actif", in: 12_400_000, out: 0, tone: "success" as const },
              { name: "KKiaPay", status: "À câbler", in: 0, out: 0, tone: "neutral" as const },
              { name: "MTN MoMo", status: "À câbler", in: 0, out: 4_200_000, tone: "warning" as const },
              { name: "Moov Money", status: "À câbler", in: 0, out: 0, tone: "neutral" as const },
              { name: "Cash (en main)", status: "Drivers", in: 0, out: 8_350_000, tone: "info" as const },
            ].map((row) => (
              <tr key={row.name}>
                <td className="px-5 py-3 font-medium text-[color:var(--foreground)]">
                  {row.name}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={row.tone}>{row.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {row.in > 0 ? `+${formatXof(row.in)}` : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                  {row.out > 0 ? `−${formatXof(row.out)}` : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-[color:var(--foreground)]">
                  {formatXof(row.in - row.out)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <CardTitle>Commission plateforme</CardTitle>
        <CardDescription className="mt-1">
          Marge encaissée par la plateforme — calculée sur les courses et livraisons facturées.
        </CardDescription>

        <dl className="mt-5 flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Aujourd&apos;hui
            </dt>
            <dd className="font-mono text-2xl font-semibold text-[color:var(--foreground)]">
              {formatXof(184_300)}
            </dd>
          </div>
          <div className="flex items-end justify-between">
            <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Mois en cours
            </dt>
            <dd className="font-mono text-lg font-semibold text-[color:var(--foreground)]">
              {formatXof(4_120_000)}
            </dd>
          </div>
          <div className="flex items-end justify-between">
            <dt className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Année en cours
            </dt>
            <dd className="font-mono text-lg font-semibold text-[color:var(--foreground)]">
              {formatXof(38_900_000)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-[color:var(--border)] pt-4">
          <Button variant="outline" size="sm" fullWidth>
            Voir l&apos;export comptable
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function WalletPage() {
  const transactions = useWalletStore((s) => s.transactions);
  const approveWithdraw = useWalletStore((s) => s.approveWithdraw);
  const refuseWithdraw = useWalletStore((s) => s.refuseWithdraw);

  const [txSearch, setTxSearch] = useState("");
  const [txType, setTxType] = useState("ALL");
  const [txMethod, setTxMethod] = useState("ALL");

  const [manualOpen, setManualOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: "approve" | "refuse";
    target: TxRow | null;
  }>({ open: false, action: "approve", target: null });

  const filtered = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      if (q) {
        const haystack = `${t.userName} ${t.reference}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (txType !== "ALL" && t.type !== txType) return false;
      if (txMethod !== "ALL" && t.method !== txMethod) return false;
      return true;
    });
  }, [transactions, txSearch, txType, txMethod]);

  const pending = transactions.filter(
    (t) => t.type === "WITHDRAW" && t.status === "PENDING",
  );

  function handleApprove(tx: TxRow) {
    setConfirm({ open: true, action: "approve", target: tx });
  }
  function handleRefuse(tx: TxRow) {
    setConfirm({ open: true, action: "refuse", target: tx });
  }
  function runConfirm(reason?: string) {
    if (!confirm.target) return;
    if (confirm.action === "approve") {
      approveWithdraw(confirm.target.id);
      toast({
        kind: "success",
        title: "Retrait approuvé",
        description: `${formatXof(confirm.target.amount)} → ${confirm.target.userName}`,
      });
    } else {
      refuseWithdraw(confirm.target.id, reason ?? "");
      toast({
        kind: "warning",
        title: "Retrait refusé",
        description: `${formatXof(confirm.target.amount)} · ${confirm.target.userName}`,
      });
    }
    setConfirm((c) => ({ ...c, open: false, target: null }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm">
          Export comptable
        </Button>
        <Button size="sm" onClick={() => setManualOpen(true)}>
          Crédit / débit manuel
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="TVL plateforme"
          value="14,2 M FCFA"
          trend={{ value: "+1,1 M cette semaine", direction: "up" }}
          helper="solde main + bonus + parrainage"
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Recharges du jour"
          value="412 000 FCFA"
          trend={{ value: "+8 %", direction: "up" }}
          helper="38 transactions"
          icon={ArrowDownLeft}
          tone="success"
        />
        <StatCard
          label="Retraits en attente"
          value={String(pending.length)}
          trend={{ value: "à valider", direction: "flat" }}
          helper={`${formatXof(pending.reduce((s, t) => s + t.amount, 0))}`}
          icon={ArrowUpRight}
          tone="warning"
        />
        <StatCard
          label="Commission du jour"
          value="184 300 FCFA"
          trend={{ value: "+8,4 %", direction: "up" }}
          helper="= 14,8 % du GMV"
          icon={Building2}
          tone="secondary"
        />
      </section>

      <Tabs
        defaultValue="overview"
        tabs={[
          { value: "overview", label: "Vue d'ensemble", content: <OverviewTab /> },
          {
            value: "transactions",
            label: "Transactions",
            badge: { count: transactions.length, tone: "primary" },
            content: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
                  <div className="flex flex-wrap items-center gap-3">
                    <SearchField
                      placeholder="Rechercher utilisateur, référence…"
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="w-full sm:flex-1 sm:min-w-72"
                    />
                    <Combobox
                      options={[
                        { value: "ALL", label: "Tous types" },
                        { value: "RECHARGE", label: "Recharges" },
                        { value: "PAYMENT", label: "Paiements" },
                        { value: "WITHDRAW", label: "Retraits" },
                        { value: "TRANSFER", label: "Transferts" },
                        { value: "REFUND", label: "Remboursements" },
                        { value: "MANUAL_CREDIT", label: "Crédits admin" },
                        { value: "MANUAL_DEBIT", label: "Débits admin" },
                      ]}
                      value={txType}
                      onChange={setTxType}
                      className="sm:w-44"
                    />
                    <Combobox
                      options={[
                        { value: "ALL", label: "Toutes méthodes" },
                        { value: "FEDAPAY", label: "FedaPay" },
                        { value: "MOMO", label: "MTN MoMo" },
                        { value: "MOOV", label: "Moov Money" },
                        { value: "WALLET", label: "Wallet interne" },
                      ]}
                      value={txMethod}
                      onChange={setTxMethod}
                      className="sm:w-44"
                    />
                  </div>
                </div>
                <TransactionsTable
                  rows={filtered}
                  onApprove={handleApprove}
                  onRefuse={handleRefuse}
                />
              </div>
            ),
          },
          {
            value: "withdrawals",
            label: "Retraits à valider",
            badge: { count: pending.length, tone: "warning" },
            content: (
              <PendingWithdrawalsList
                rows={pending}
                onApprove={handleApprove}
                onRefuse={handleRefuse}
              />
            ),
          },
          {
            value: "settled",
            label: "Réconciliation",
            content: (
              <Card className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">
                <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-500" />
                Tout est aligné — dernière réconciliation FedaPay terminée à 09:00.
              </Card>
            ),
          },
        ]}
      />

      <ManualOpModal open={manualOpen} onClose={() => setManualOpen(false)} />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          confirm.action === "approve"
            ? "Approuver ce retrait ?"
            : "Refuser ce retrait ?"
        }
        description={
          confirm.target ? (
            <p>
              <span className="font-medium">{confirm.target.userName}</span> ·{" "}
              <span className="font-mono">{confirm.target.reference}</span> ·{" "}
              <span className="font-semibold">{formatXof(confirm.target.amount)}</span>{" "}
              via {METHOD_LABEL[confirm.target.method]}
            </p>
          ) : null
        }
        confirmLabel={confirm.action === "approve" ? "Approuver" : "Refuser"}
        tone={confirm.action === "refuse" ? "danger" : "primary"}
        withReason={
          confirm.action === "refuse"
            ? {
                label: "Motif du refus",
                placeholder: "Solde insuffisant, KYC, fraude présumée…",
                required: true,
              }
            : undefined
        }
      />
    </div>
  );
}
