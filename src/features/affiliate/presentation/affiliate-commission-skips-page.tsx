"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { DataTable, PaginationFooter, type ColumnDef } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { formatDateTime, formatXof } from "@/shared/lib/format";
import { fetchCommissionSkipsAction } from "../application/actions";
import {
  AFFILIATE_COMMISSION_SKIP_LABELS,
  AFFILIATE_COMMISSION_SKIP_IS_WIRING_BUG,
  type AffiliateCommissionSkipItem,
  type AffiliateCommissionSkipReason,
} from "../domain/affiliate";

const REASON_OPTIONS = [
  { value: "ALL", label: "Motif : tous" },
  ...(Object.keys(AFFILIATE_COMMISSION_SKIP_LABELS) as AffiliateCommissionSkipReason[]).map((r) => ({
    value: r,
    label: AFFILIATE_COMMISSION_SKIP_LABELS[r],
  })),
];

export interface AffiliateCommissionSkipsPageProps {
  items: AffiliateCommissionSkipItem[];
  total: number;
}

export function AffiliateCommissionSkipsPage({ items, total }: AffiliateCommissionSkipsPageProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [loadingResolved, startLoadingResolved] = useTransition();
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [includeResolved, setIncludeResolved] = useState(false);
  const [data, setData] = useState(items);
  const [dataTotal, setDataTotal] = useState(total);

  function toggleResolved(checked: boolean) {
    setIncludeResolved(checked);
    startLoadingResolved(async () => {
      const res = await fetchCommissionSkipsAction(
        checked ? { resolved: true, limit: 100 } : { resolved: false, limit: 100 },
      );
      if (res.success && res.data) {
        setData(res.data.items);
        setDataTotal(res.data.pagination.total);
      }
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((s) => {
      if (reasonFilter !== "ALL" && s.reason !== reasonFilter) return false;
      if (q) {
        const hay = `${s.affiliateId} ${s.promoCodeId} ${s.sourceId} ${s.userId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, reasonFilter]);

  const wiringBugCount = data.filter((s) => AFFILIATE_COMMISSION_SKIP_IS_WIRING_BUG[s.reason]).length;

  const columns: ColumnDef<AffiliateCommissionSkipItem>[] = [
    {
      key: "affiliate",
      header: "Affilié",
      sortAccessor: (row) => row.affiliateId,
      render: (row) => (
        <Link
          href={`/affiliate/${row.affiliateId}`}
          className="font-mono text-xs hover:text-[color:var(--primary)] hover:underline"
        >
          {row.affiliateId.slice(0, 12)}…
        </Link>
      ),
    },
    {
      key: "reason",
      header: "Motif",
      sortAccessor: (row) => row.reason,
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Badge tone={AFFILIATE_COMMISSION_SKIP_IS_WIRING_BUG[row.reason] ? "danger" : "warning"}>
            {AFFILIATE_COMMISSION_SKIP_LABELS[row.reason]}
          </Badge>
          {row.resolvedAt ? (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Régularisée le {formatDateTime(row.resolvedAt)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium">{row.sourceType}</span>
          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
            {row.sourceId.slice(0, 12)}…
          </span>
        </div>
      ),
    },
    {
      key: "platformCommission",
      header: "Commission ForYou",
      align: "right",
      sortAccessor: (row) => row.platformCommission,
      render: (row) => <span className="font-mono text-xs">{formatXof(row.platformCommission)}</span>,
    },
    {
      key: "potential",
      header: "Aurait dû toucher",
      align: "right",
      sortAccessor: (row) => row.potentialAmount ?? -1,
      render: (row) =>
        row.potentialAmount != null ? (
          <div className="flex flex-col items-end">
            <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
              {formatXof(row.potentialAmount)}
            </span>
            {row.wasCapped ? (
              <span className="text-[10px] text-[color:var(--muted-foreground)]">
                écrêté (−{formatXof(row.cappingShortfall)})
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
        ),
    },
    {
      key: "appliedAt",
      header: "Usage",
      sortAccessor: (row) => new Date(row.appliedAt).getTime(),
      render: (row) => (
        <span className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(row.appliedAt)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing · Affiliés"
        title="Usages sans commission"
        description="Trace durable de chaque usage de code promo affilié qui n'a produit aucune commission — la réponse directe à « pourquoi mon influenceur n'a rien touché sur cette course »."
        dataSource="live"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/affiliate"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] dark:bg-transparent"
            >
              Retour aux affiliés
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
          </div>
        }
      />

      {wiringBugCount > 0 && (
        <Card className="flex items-start gap-3 border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {wiringBugCount} anomalie{wiringBugCount > 1 ? "s" : ""} technique{wiringBugCount > 1 ? "s" : ""} détectée{wiringBugCount > 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
              Motif « assiette manquante » — le montant nécessaire au calcul n&apos;a jamais été transmis. Ce
              n&apos;est jamais un comportement métier normal : à signaler au backend.
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher (affilié, code, course…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={REASON_OPTIONS}
            value={reasonFilter}
            onChange={setReasonFilter}
            className="sm:w-64"
          />
          <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
            <input
              type="checkbox"
              checked={includeResolved}
              onChange={(e) => toggleResolved(e.target.checked)}
              disabled={loadingResolved}
              className="size-4 rounded border-[color:var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
            />
            Inclure les régularisées
            {loadingResolved && <Spinner size="sm" />}
          </label>
          <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">
            {filtered.length} / {dataTotal}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <AlertTriangle className="size-10 opacity-30" />
          <p className="text-sm font-medium">
            {includeResolved ? "Aucun usage écarté" : "Aucun usage non régularisé écarté"}
          </p>
          <p className="max-w-sm text-xs text-[color:var(--muted-foreground)]">
            Tous les usages de codes affiliés ont produit une commission normalement.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.skipId}
            defaultSort={{ key: "appliedAt", direction: "desc" }}
          />
          <PaginationFooter total={dataTotal} shown={filtered.length} />
        </Card>
      )}
    </div>
  );
}
