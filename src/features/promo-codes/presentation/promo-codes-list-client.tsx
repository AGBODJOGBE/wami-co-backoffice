"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FlaskConical,
  Handshake,
  Plus,
  Power,
  RefreshCw,
  Tag,
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
import { PageHeader } from "@/shared/ui/page-header";
import { SearchField } from "@/shared/ui/search-field";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { downloadCsv, timestampedFilename } from "@/shared/lib/csv";
import { formatDate } from "@/shared/lib/format";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import {
  togglePromoCodeAction,
  type ActionResult,
} from "../application/actions";
import { PromoCodeDetailModal } from "./promo-code-detail-modal";
import { PromoCodeAffiliateModal } from "./promo-code-affiliate-attachment";
import {
  CAMPAIGN_TYPE_LABELS,
  CHANNEL_LABELS,
  DISCOUNT_TYPE_LABELS,
  VERTICAL_LABELS,
  discountSummary,
  type PromoCode,
  type SetPromoCodeAffiliateResult,
} from "../domain/promo-code";
import {
  PromoCodeCreateModal,
  PromoCodeValidateModal,
} from "./promo-code-modals";
import { CanView } from "@/shared/ui/can-view";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) {
    toast({
      kind: "success",
      title: successTitle,
      description: result.message,
    });
  } else {
    toast({ kind: "error", title: "Échec", description: result.message });
  }
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "Statut: tous" },
  { value: "true", label: "Actifs" },
  { value: "false", label: "Désactivés" },
];
const VERTICAL_OPTIONS = [
  { value: "ALL", label: "Vertical: tous" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "DELIVERY_B2B", label: "Livraison B2B" },
];
const CAMPAIGN_OPTIONS = [
  { value: "ALL", label: "Type: tous" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "GROWTH", label: "Growth" },
];

function ToggleButton({ promo }: { promo: PromoCode }) {
  const [pending, start] = useTransition();
  const isActive = promo.isActive;
  return (
    <CanView permission="promo.manage">
      <Button
        variant={isActive ? "outline" : "primary"}
        size="sm"
        isLoading={pending}
        onClick={() =>
          start(async () => {
            const r = await togglePromoCodeAction(promo.id);
            notify(r, isActive ? "Code désactivé" : "Code activé");
          })
        }
      >
        <Power className="size-4" />
        {isActive ? "Désactiver" : "Activer"}
      </Button>
    </CanView>
  );
}

function dateRange(start: string, end: string) {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export interface PromoCodesListClientProps {
  promoCodes: PromoCode[];
  total: number;
}

export function PromoCodesListClient({
  promoCodes,
  total,
}: PromoCodesListClientProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verticalFilter, setVerticalFilter] = useState("ALL");
  const [campaignFilter, setCampaignFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PromoCode | null>(null);
  const [affiliateTarget, setAffiliateTarget] = useState<PromoCode | null>(null);
  // Reflète immédiatement un rattachement/détachement depuis la liste, sans
  // attendre le prochain rafraîchissement de la page.
  const [affiliateOverrides, setAffiliateOverrides] = useState<Record<string, SetPromoCodeAffiliateResult>>({});

  const enrichedPromoCodes = useMemo(() => {
    if (Object.keys(affiliateOverrides).length === 0) return promoCodes;
    return promoCodes.map((p) => {
      const o = affiliateOverrides[p.id];
      return o ? { ...p, affiliateId: o.affiliateId, affiliateCommissionRate: o.affiliateCommissionRate } : p;
    });
  }, [promoCodes, affiliateOverrides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedPromoCodes.filter((p) => {
      if (q) {
        const hay = `${p.code} ${p.campaignName} ${p.displayText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "ALL") {
        const want = statusFilter === "true";
        if (p.isActive !== want) return false;
      }
      if (verticalFilter !== "ALL" && p.vertical !== verticalFilter) return false;
      if (campaignFilter !== "ALL" && p.campaignType !== campaignFilter)
        return false;
      return true;
    });
  }, [enrichedPromoCodes, search, statusFilter, verticalFilter, campaignFilter]);

  const stats = useMemo(() => {
    const active = promoCodes.filter((p) => p.isActive).length;
    const scheduled = promoCodes.filter((p) => p.isScheduled).length;
    const now = Date.now();
    const expiring = promoCodes.filter((p) => {
      const end = new Date(p.endDate).getTime();
      const ms = end - now;
      return ms > 0 && ms < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const expired = promoCodes.filter(
      (p) => new Date(p.endDate).getTime() < now,
    ).length;
    return { active, scheduled, expiring, expired };
  }, [promoCodes]);

  const columns: ColumnDef<PromoCode>[] = [
    {
      key: "code",
      header: "Code",
      sortAccessor: (row) => row.code,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-sm font-semibold uppercase text-[color:var(--foreground)]">
            {row.code}
          </span>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            {row.campaignName}
          </span>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Réduction",
      sortAccessor: (row) => row.discountValue,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm text-[color:var(--foreground)]">
            {discountSummary(row)}
          </span>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {DISCOUNT_TYPE_LABELS[row.discountType]}
          </span>
        </div>
      ),
    },
    {
      key: "vertical",
      header: "Vertical",
      sortAccessor: (row) => row.vertical,
      render: (row) => (
        <Badge tone="primary">{VERTICAL_LABELS[row.vertical]}</Badge>
      ),
    },
    {
      key: "campaign",
      header: "Campagne",
      sortAccessor: (row) => row.campaignType,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <Badge tone={row.campaignType === "PERFORMANCE" ? "info" : "warning"}>
            {CAMPAIGN_TYPE_LABELS[row.campaignType]}
          </Badge>
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {CHANNEL_LABELS[row.channel]}
          </span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Période",
      sortAccessor: (row) => new Date(row.startDate).getTime(),
      render: (row) => (
        <span className="text-xs text-[color:var(--foreground)]">
          {dateRange(row.startDate, row.endDate)}
        </span>
      ),
    },
    {
      key: "usage",
      header: "Usages",
      sortAccessor: (row) => row.usageCount ?? 0,
      render: (row) => (
        <span className="text-sm text-[color:var(--foreground)]">
          {(row.usageCount ?? 0).toLocaleString("fr-FR")}
          {row.maxTotalUsages
            ? ` / ${row.maxTotalUsages.toLocaleString("fr-FR")}`
            : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortAccessor: (row) => (row.isActive ? 1 : 0),
      render: (row) =>
        row.isActive ? (
          <Badge tone="success">Actif</Badge>
        ) : (
          <Badge tone="danger">Désactivé</Badge>
        ),
    },
    {
      key: "budget",
      header: "Budget",
      sortAccessor: (row) => (row.budgetedLossCampaign ? (row.realCostAccrued ?? 0) : -1),
      render: (row) => {
        if (!row.budgetedLossCampaign) {
          return <span className="text-xs text-[color:var(--muted-foreground)]">—</span>;
        }
        const spent = row.realCostAccrued ?? 0;
        const budget = row.sponsoredBudget ?? 0;
        const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
        return (
          <div className="flex w-28 flex-col gap-0.5">
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              {spent.toLocaleString("fr-FR")} / {budget ? budget.toLocaleString("fr-FR") : "?"} FCFA
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
              <div
                className={`h-full rounded-full ${
                  pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "affiliate",
      header: "Affilié",
      sortAccessor: (row) => (row.affiliateId ? 1 : 0),
      render: (row) => (
        <CanView
          permission="promo.manage"
          fallback={
            row.affiliateId ? (
              <Badge tone="primary">Rattaché</Badge>
            ) : (
              <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
            )
          }
        >
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            onClick={(e) => {
              e.stopPropagation();
              setAffiliateTarget(row);
            }}
          >
            <Handshake className="size-3" />
            {row.affiliateId ? "Rattaché" : "Rattacher"}
          </Button>
        </CanView>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => <ToggleButton promo={row} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing"
        title="Codes promo"
        dataSource="live"
        dataSourceHint="Branché sur /api/admin/promo-codes — création + toggle en direct."
        description="Création, suivi et activation/désactivation des codes promotionnels."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  timestampedFilename("promo-codes"),
                  [
                    { key: "code", header: "Code", value: (r) => r.code },
                    { key: "campaign", header: "Campagne", value: (r) => r.campaignName },
                    { key: "discountType", header: "Type", value: (r) => r.discountType },
                    { key: "discountValue", header: "Valeur", value: (r) => r.discountValue },
                    { key: "vertical", header: "Vertical", value: (r) => r.vertical },
                    { key: "campaignType", header: "Campagne", value: (r) => r.campaignType },
                    { key: "channel", header: "Canal", value: (r) => r.channel },
                    { key: "startDate", header: "Début", value: (r) => r.startDate },
                    { key: "endDate", header: "Fin", value: (r) => r.endDate },
                    { key: "usage", header: "Usages", value: (r) => r.usageCount ?? 0 },
                    { key: "max", header: "Max usages", value: (r) => r.maxTotalUsages ?? "" },
                    { key: "active", header: "Actif", value: (r) => (r.isActive ? "oui" : "non") },
                  ],
                  filtered,
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidateOpen(true)}
            >
              <FlaskConical className="size-4" />
              Tester un code
            </Button>
            <CanView permission="promo.manage">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nouveau code
              </Button>
            </CanView>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Codes actifs"
          value={String(stats.active)}
          trend={{ value: "live", direction: "flat" }}
          helper={`${promoCodes.length} au total`}
          icon={Tag}
          tone="success"
        />
        <StatCard
          label="Programmés"
          value={String(stats.scheduled)}
          trend={{ value: "à venir", direction: "flat" }}
          helper="démarrage différé"
          icon={CheckCircle2}
          tone="primary"
        />
        <StatCard
          label="Expirent < 7 j"
          value={String(stats.expiring)}
          trend={{ value: "à reconduire", direction: "flat" }}
          helper="fin imminente"
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Expirés"
          value={String(stats.expired)}
          trend={{ value: "à archiver", direction: "flat" }}
          helper="hors période"
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            placeholder="Rechercher (code, campagne, texte…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            className="sm:w-44"
          />
          <Combobox
            options={VERTICAL_OPTIONS}
            value={verticalFilter}
            onChange={setVerticalFilter}
            className="sm:w-44"
          />
          <Combobox
            options={CAMPAIGN_OPTIONS}
            value={campaignFilter}
            onChange={setCampaignFilter}
            className="sm:w-44"
          />
        </div>
      </div>

      {promoCodes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <Tag className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Aucun code promo
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Crée ton premier code via le bouton « Nouveau code ».
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => setDetailTarget(row)}
            defaultSort={{ key: "period", direction: "desc" }}
          />
          <PaginationFooter total={total} shown={filtered.length} />
        </Card>
      )}

      <PromoCodeCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <PromoCodeValidateModal
        open={validateOpen}
        onClose={() => setValidateOpen(false)}
      />
      <PromoCodeDetailModal
        open={!!detailTarget}
        promo={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
      <PromoCodeAffiliateModal
        open={!!affiliateTarget}
        promo={affiliateTarget}
        onClose={() => setAffiliateTarget(null)}
        onUpdated={(result) =>
          setAffiliateOverrides((prev) => ({ ...prev, [result.promoCodeId]: result }))
        }
      />
    </div>
  );
}
