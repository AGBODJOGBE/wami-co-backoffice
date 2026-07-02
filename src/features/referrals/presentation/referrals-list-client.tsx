"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  TimerOff,
  Users,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import {
  DataTable,
  PaginationFooter,
  type ColumnDef,
} from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDate, formatXof } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import {
  validateReferralAction,
  expireReferralAction,
  type ActionResult,
} from "../application/actions";
import {
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_TONES,
  REFERRAL_TYPE_LABELS,
  type Referral,
  type ReferralStats,
} from "../domain/referral";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({ kind: "success", title: successTitle, description: result.message });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

const STATUS_OPTIONS = [
  { value: "ALL",       label: "Statut : tous" },
  { value: "PENDING",   label: "En attente" },
  { value: "VALIDATED", label: "Validés" },
  { value: "EXPIRED",   label: "Expirés" },
];

const TYPE_OPTIONS = [
  { value: "ALL",            label: "Type : tous" },
  { value: "PASSENGER",      label: "Passager" },
  { value: "DRIVER_STANDARD",label: "Driver Standard" },
  { value: "DRIVER_PREMIUM", label: "Driver Premium" },
  { value: "DRIVER_VIP",     label: "Driver VIP" },
  { value: "PARTNER",        label: "Partenaire" },
];

function ActionButtons({ referral }: { referral: Referral }) {
  const [validating, startValidate] = useTransition();
  const [expiring,   startExpire]   = useTransition();

  if (referral.status !== "PENDING") return null;

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={validating || expiring}
        onClick={() =>
          startValidate(async () => {
            const res = await validateReferralAction(referral.referralId);
            notify(res, "Parrainage validé");
          })
        }
      >
        {validating ? <Spinner size="sm" /> : <CheckCircle2 className="size-3.5 text-emerald-600" />}
        Valider
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={validating || expiring}
        onClick={() =>
          startExpire(async () => {
            const res = await expireReferralAction(referral.referralId);
            notify(res, "Parrainage expiré");
          })
        }
      >
        {expiring ? <Spinner size="sm" /> : <TimerOff className="size-3.5 text-red-500" />}
        Expirer
      </Button>
    </div>
  );
}

export interface ReferralsListClientProps {
  referrals: Referral[];
  total: number;
  stats: ReferralStats;
}

export function ReferralsListClient({
  referrals,
  total,
  stats,
}: ReferralsListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search,      setSearch]   = useState("");
  const [statusFilter, setStatus]  = useState("ALL");
  const [typeFilter,   setType]    = useState("ALL");

  const filtered = useMemo(() => {
    let rows = referrals;
    if (statusFilter !== "ALL") rows = rows.filter((r) => r.status === statusFilter);
    if (typeFilter   !== "ALL") rows = rows.filter((r) => r.referralType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.referredName?.toLowerCase().includes(q) ||
          r.referralCode?.toLowerCase().includes(q) ||
          r.referrerId?.toLowerCase().includes(q) ||
          r.referredUserId?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [referrals, statusFilter, typeFilter, search]);

  const validationRate = stats.totalReferrals > 0
    ? Math.round((stats.validatedReferrals / stats.totalReferrals) * 100)
    : 0;

  const columns: ColumnDef<Referral>[] = [
    {
      key: "code",
      header: "Code",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[color:var(--primary)]">
          {r.referralCode}
        </span>
      ),
    },
    {
      key: "filleul",
      header: "Filleul",
      render: (r) => (
        <span className="text-sm font-medium text-[color:var(--foreground)]">
          {r.referredName || "—"}
        </span>
      ),
      sortAccessor: (r) => r.referredName,
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge tone="neutral">
          {REFERRAL_TYPE_LABELS[r.referralType as keyof typeof REFERRAL_TYPE_LABELS] ?? r.referralType}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (r) => (
        <Badge tone={REFERRAL_STATUS_TONES[r.status as keyof typeof REFERRAL_STATUS_TONES] ?? "neutral"}>
          {REFERRAL_STATUS_LABELS[r.status as keyof typeof REFERRAL_STATUS_LABELS] ?? r.status}
        </Badge>
      ),
      sortAccessor: (r) => r.status,
    },
    {
      key: "referrerReward",
      header: "Récompense parrain",
      align: "right",
      render: (r) => (
        <span className="font-mono text-sm">{formatXof(r.referrerReward)}</span>
      ),
      sortAccessor: (r) => r.referrerReward,
    },
    {
      key: "referredReward",
      header: "Récompense filleul",
      align: "right",
      render: (r) => (
        <span className="font-mono text-sm">{formatXof(r.referredReward)}</span>
      ),
      sortAccessor: (r) => r.referredReward,
    },
    {
      key: "validatedAt",
      header: "Validé le",
      render: (r) =>
        r.validatedAt ? (
          <span className="text-xs text-[color:var(--foreground)]">{formatDate(r.validatedAt)}</span>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">—</span>
        ),
      sortAccessor: (r) => r.validatedAt ?? "",
    },
    {
      key: "createdAt",
      header: "Créé le",
      render: (r) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">{formatDate(r.createdAt)}</span>
      ),
      sortAccessor: (r) => r.createdAt,
    },
    {
      key: "actions",
      header: "",
      render: (r) => <ActionButtons referral={r} />,
    },
  ];

  function exportCsv() {
    downloadCsv(
      timestampedFilename("referrals"),
      [
        { key: "code",              header: "Code",                      value: (r) => r.referralCode },
        { key: "filleul",           header: "Filleul",                   value: (r) => r.referredName },
        { key: "type",              header: "Type",                      value: (r) => REFERRAL_TYPE_LABELS[r.referralType as keyof typeof REFERRAL_TYPE_LABELS] ?? r.referralType },
        { key: "statut",            header: "Statut",                    value: (r) => REFERRAL_STATUS_LABELS[r.status as keyof typeof REFERRAL_STATUS_LABELS] ?? r.status },
        { key: "recompense_parrain",header: "Récompense parrain (FCFA)", value: (r) => r.referrerReward },
        { key: "recompense_filleul",header: "Récompense filleul (FCFA)", value: (r) => r.referredReward },
        { key: "valide_le",         header: "Validé le",                 value: (r) => r.validatedAt ?? "" },
        { key: "cree_le",           header: "Créé le",                   value: (r) => r.createdAt },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing"
        title="Parrainage"
        description="Programme de parrainage — suivi des codes, récompenses et validations."
        dataSource="live"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-4" />
              Exporter
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
          </>
        }
      />

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total parrainages"
          value={stats.totalReferrals.toString()}
          helper="depuis l'ouverture"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Validés"
          value={stats.validatedReferrals.toString()}
          helper={`${validationRate}% de taux de conversion`}
          icon={BadgeCheck}
          tone="success"
        />
        <StatCard
          label="En attente"
          value={stats.pendingReferrals.toString()}
          helper="à traiter"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Récompenses versées"
          value={formatXof(stats.totalRewardsGiven)}
          helper="wallet BONUS"
          icon={Banknote}
          tone="primary"
        />
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
        <SearchField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Code, filleul, ID…"
          className="w-56"
        />
        <Combobox
          value={statusFilter}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          className="w-44"
        />
        <Combobox
          value={typeFilter}
          onChange={setType}
          options={TYPE_OPTIONS}
          className="w-48"
        />
        <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.referralId}
          emptyMessage="Aucun parrainage trouvé."
          defaultSort={{ key: "createdAt", direction: "desc" }}
        />
        <PaginationFooter total={total} shown={filtered.length} />
      </div>
    </div>
  );
}
