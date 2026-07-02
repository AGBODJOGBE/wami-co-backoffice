"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  RefreshCw,
  Star,
  Trophy,
  User,
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
import { formatDate, formatXof } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import {
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_TONES,
  REFERRAL_TYPE_LABELS,
  type Referral,
} from "../domain/referral";

/* Group referrals by referrerId to build "parrain" rows */
interface ParrainRow {
  referrerId:      string;
  referralCode:    string;
  referralType:    string;
  totalFilleuls:   number;
  validatedCount:  number;
  pendingCount:    number;
  totalEarned:     number;
  lastReferralAt:  string;
}

function buildParrainRows(referrals: Referral[]): ParrainRow[] {
  const map = new Map<string, ParrainRow>();
  for (const r of referrals) {
    const existing = map.get(r.referrerId);
    if (existing) {
      existing.totalFilleuls  += 1;
      existing.validatedCount += r.status === "VALIDATED" ? 1 : 0;
      existing.pendingCount   += r.status === "PENDING"   ? 1 : 0;
      existing.totalEarned    += r.status === "VALIDATED" ? r.referrerReward : 0;
      if (r.createdAt > existing.lastReferralAt) existing.lastReferralAt = r.createdAt;
    } else {
      map.set(r.referrerId, {
        referrerId:     r.referrerId,
        referralCode:   r.referralCode,
        referralType:   r.referralType,
        totalFilleuls:  1,
        validatedCount: r.status === "VALIDATED" ? 1 : 0,
        pendingCount:   r.status === "PENDING"   ? 1 : 0,
        totalEarned:    r.status === "VALIDATED" ? r.referrerReward : 0,
        lastReferralAt: r.createdAt,
      });
    }
  }
  return Array.from(map.values());
}

const TYPE_OPTIONS = [
  { value: "ALL",             label: "Type : tous" },
  { value: "PASSENGER",       label: "Passager" },
  { value: "DRIVER_STANDARD", label: "Driver Standard" },
  { value: "DRIVER_PREMIUM",  label: "Driver Premium" },
  { value: "DRIVER_VIP",      label: "Driver VIP" },
  { value: "PARTNER",         label: "Partenaire" },
];

export interface ParrainsListClientProps {
  referrals: Referral[];
  total: number;
}

export function ParrainsListClient({ referrals, total }: ParrainsListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [type,   setType]   = useState("ALL");

  const allParrains = useMemo(() => buildParrainRows(referrals), [referrals]);

  const filtered = useMemo(() => {
    let rows = allParrains;
    if (type !== "ALL") rows = rows.filter((r) => r.referralType === type);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.referrerId.toLowerCase().includes(q) ||
          r.referralCode.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [allParrains, type, search]);

  const totalEarned   = allParrains.reduce((s, p) => s + p.totalEarned, 0);
  const topParrain    = [...allParrains].sort((a, b) => b.validatedCount - a.validatedCount)[0];

  const columns: ColumnDef<ParrainRow>[] = [
    {
      key: "parrain",
      header: "Parrain (ID)",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-medium text-[color:var(--foreground)]">
            {r.referrerId}
          </span>
          <span className="font-mono text-[10px] text-[color:var(--primary)]">
            Code : {r.referralCode}
          </span>
        </div>
      ),
      sortAccessor: (r) => r.referrerId,
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
      key: "total",
      header: "Filleuls",
      align: "right",
      render: (r) => (
        <span className="font-mono font-semibold">{r.totalFilleuls}</span>
      ),
      sortAccessor: (r) => r.totalFilleuls,
    },
    {
      key: "validated",
      header: "Validés",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono font-semibold text-emerald-600">{r.validatedCount}</span>
          {r.totalFilleuls > 0 && (
            <span className="text-xs text-[color:var(--muted-foreground)]">
              ({Math.round((r.validatedCount / r.totalFilleuls) * 100)}%)
            </span>
          )}
        </div>
      ),
      sortAccessor: (r) => r.validatedCount,
    },
    {
      key: "pending",
      header: "En attente",
      align: "right",
      render: (r) =>
        r.pendingCount > 0 ? (
          <Badge tone="warning">{r.pendingCount}</Badge>
        ) : (
          <span className="text-xs text-[color:var(--muted-foreground)]">0</span>
        ),
      sortAccessor: (r) => r.pendingCount,
    },
    {
      key: "earned",
      header: "Récompenses gagnées",
      align: "right",
      render: (r) => (
        <span className={`font-mono text-sm ${r.totalEarned > 0 ? "font-semibold text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]"}`}>
          {r.totalEarned > 0 ? formatXof(r.totalEarned) : "—"}
        </span>
      ),
      sortAccessor: (r) => r.totalEarned,
    },
    {
      key: "lastAt",
      header: "Dernier filleul",
      render: (r) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">{formatDate(r.lastReferralAt)}</span>
      ),
      sortAccessor: (r) => r.lastReferralAt,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing · Parrainage"
        title="Parrains"
        description="Utilisateurs qui ont parrainé d'autres membres."
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
        <StatCard
          label="Parrains actifs"
          value={allParrains.length.toString()}
          helper={`${total} filleuls au total`}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Top parrain"
          value={topParrain ? `${topParrain.validatedCount} validé${topParrain.validatedCount > 1 ? "s" : ""}` : "—"}
          helper={topParrain ? topParrain.referralCode : "aucun parrain"}
          icon={Trophy}
          tone="warning"
        />
        <StatCard
          label="Total versé aux parrains"
          value={formatXof(totalEarned)}
          helper="wallet BONUS"
          icon={Banknote}
          tone="success"
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-white p-3 dark:bg-[color:var(--muted)]">
        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID parrain, code…" className="w-56" />
        <Combobox value={type} onChange={setType} options={TYPE_OPTIONS} className="w-48" />
        <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">
          {filtered.length} parrain{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.referrerId}
          emptyMessage="Aucun parrain trouvé."
          defaultSort={{ key: "validated", direction: "desc" }}
        />
        <PaginationFooter total={allParrains.length} shown={filtered.length} />
      </div>
    </div>
  );
}
