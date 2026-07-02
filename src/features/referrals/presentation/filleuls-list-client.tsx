"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  TimerOff,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DataTable,
  PaginationFooter,
  type ColumnDef,
} from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Combobox } from "@/shared/ui/combobox";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatXof } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { validateReferralAction, expireReferralAction, type ActionResult } from "../application/actions";
import {
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_TONES,
  REFERRAL_TYPE_LABELS,
  type Referral,
} from "../domain/referral";

function notify(result: ActionResult<unknown>, title: string) {
  if (result.ok) toast({ kind: "success", title, description: result.message });
  else toast({ kind: "error", title: "Échec", description: result.message });
}

const STATUS_OPTIONS = [
  { value: "ALL",       label: "Statut : tous" },
  { value: "PENDING",   label: "En attente" },
  { value: "VALIDATED", label: "Validés" },
  { value: "EXPIRED",   label: "Expirés" },
];

function InlineActions({ referral }: { referral: Referral }) {
  const [validating, startValidate] = useTransition();
  const [expiring,   startExpire]   = useTransition();
  if (referral.status !== "PENDING") return null;
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" disabled={validating || expiring}
        onClick={() => startValidate(async () => {
          notify(await validateReferralAction(referral.referralId), "Parrainage validé");
        })}
      >
        {validating ? <Spinner size="sm" /> : <CheckCircle2 className="size-3.5 text-emerald-600" />}
        Valider
      </Button>
      <Button size="sm" variant="outline" disabled={validating || expiring}
        onClick={() => startExpire(async () => {
          notify(await expireReferralAction(referral.referralId), "Parrainage expiré");
        })}
      >
        {expiring ? <Spinner size="sm" /> : <TimerOff className="size-3.5 text-red-500" />}
        Expirer
      </Button>
    </div>
  );
}

export interface FilleulsListClientProps {
  referrals: Referral[];
  total: number;
}

export function FilleulsListClient({ referrals, total }: FilleulsListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search,   setSearch]  = useState("");
  const [status,   setStatus]  = useState("ALL");

  const filtered = useMemo(() => {
    let rows = referrals;
    if (status !== "ALL") rows = rows.filter((r) => r.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.referredName?.toLowerCase().includes(q) ||
          r.referralCode?.toLowerCase().includes(q) ||
          r.referredUserId?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [referrals, status, search]);

  const pending   = referrals.filter((r) => r.status === "PENDING").length;
  const validated = referrals.filter((r) => r.status === "VALIDATED").length;
  const totalRewards = referrals
    .filter((r) => r.status === "VALIDATED")
    .reduce((s, r) => s + r.referredReward, 0);

  const columns: ColumnDef<Referral>[] = [
    {
      key: "filleul",
      header: "Filleul",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[color:var(--foreground)]">
            {r.referredName || "—"}
          </span>
          <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
            {r.referredUserId}
          </span>
        </div>
      ),
      sortAccessor: (r) => r.referredName,
    },
    {
      key: "code",
      header: "Code utilisé",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[color:var(--primary)]">
          {r.referralCode}
        </span>
      ),
    },
    {
      key: "type",
      header: "Profil",
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
      key: "reward",
      header: "Récompense reçue",
      align: "right",
      render: (r) => (
        <span className={`font-mono text-sm ${r.status === "VALIDATED" ? "font-semibold text-[color:var(--primary)]" : "text-[color:var(--muted-foreground)]"}`}>
          {formatXof(r.referredReward)}
        </span>
      ),
      sortAccessor: (r) => r.referredReward,
    },
    {
      key: "validatedAt",
      header: "Validé le",
      render: (r) =>
        r.validatedAt ? (
          <span className="text-xs">{formatDate(r.validatedAt)}</span>
        ) : (
          <span className="text-xs italic text-[color:var(--muted-foreground)]">—</span>
        ),
      sortAccessor: (r) => r.validatedAt ?? "",
    },
    {
      key: "createdAt",
      header: "Inscrit le",
      render: (r) => <span className="text-xs text-[color:var(--muted-foreground)]">{formatDate(r.createdAt)}</span>,
      sortAccessor: (r) => r.createdAt,
    },
    { key: "actions", header: "", render: (r) => <InlineActions referral={r} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing · Parrainage"
        title="Filleuls"
        description="Utilisateurs inscrits via un code de parrainage."
        dataSource="live"
        actions={
          <Button variant="outline" size="sm" disabled={refreshing}
            onClick={() => startRefresh(() => router.refresh())}
          >
            {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Rafraîchir
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total filleuls"    value={total.toString()}        helper="inscrits via parrainage" icon={Users}     tone="primary" />
        <StatCard label="Validés"           value={validated.toString()}    helper="conditions remplies"     icon={UserCheck} tone="success" />
        <StatCard label="Récompenses versées" value={formatXof(totalRewards)} helper="aux filleuls validés"  icon={CheckCircle2} tone="primary" />
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, code, ID filleul…" className="w-56" />
        <Combobox value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-44" />
        <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.referralId}
          emptyMessage="Aucun filleul trouvé."
          defaultSort={{ key: "createdAt", direction: "desc" }}
        />
        <PaginationFooter total={total} shown={filtered.length} />
      </div>
    </div>
  );
}
