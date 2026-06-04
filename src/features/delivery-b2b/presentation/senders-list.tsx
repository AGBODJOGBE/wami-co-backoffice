"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Mail,
  Phone,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/features/dashboard/presentation/components/stat-card";
import { formatXof } from "@/shared/lib/format";
import {
  SENDER_TIER_META,
  type SenderTier,
} from "../domain/types";
import { SENDERS } from "../domain/mock";

const TIER_OPTIONS = [
  { value: "ALL", label: "Tier : tous" },
  ...(Object.keys(SENDER_TIER_META) as SenderTier[]).map((t) => ({
    value: t,
    label: SENDER_TIER_META[t].label,
  })),
];

export function SendersListPage() {
  const [search, setSearch] = useState("");
  const [tierF, setTierF] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SENDERS.filter((s) => {
      if (q) {
        const hay = `${s.name} ${s.legalName} ${s.industry} ${s.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tierF !== "ALL" && s.tier !== tierF) return false;
      return true;
    });
  }, [search, tierF]);

  const stats = useMemo(() => {
    const enterprise = SENDERS.filter((s) => s.tier === "ENTERPRISE").length;
    const totalSpend = SENDERS.reduce((s, x) => s + x.spendThisMonth, 0);
    const totalShipments = SENDERS.reduce(
      (s, x) => s + x.shipmentsThisMonth,
      0,
    );
    return { enterprise, totalSpend, totalShipments };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B"
        title="Clients expéditeurs"
        dataSource="mock"
        description="Entreprises qui envoient via la plateforme — pharmacies, banques, restaurants, e-commerce."
        actions={
          <Button size="sm">
            <Plus className="size-4" />
            Onboarder un client
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total clients B2B"
          value={String(SENDERS.length)}
          trend={{ value: "+1 ce mois", direction: "up" }}
          helper={`${stats.enterprise} Enterprise`}
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="CA cumulé du mois"
          value={formatXof(stats.totalSpend)}
          trend={{ value: "+18 % vs mois dernier", direction: "up" }}
          helper="commission incluse"
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Volume du mois"
          value={`${stats.totalShipments.toLocaleString("fr-FR")} colis`}
          trend={{ value: "rythme tenable", direction: "flat" }}
          helper={`Moyenne ${Math.round(stats.totalShipments / 30)}/jour`}
          icon={BriefcaseBusiness}
          tone="secondary"
        />
        <StatCard
          label="Panier moyen"
          value={formatXof(
            Math.round(
              SENDERS.reduce((s, x) => s + x.averageBasket, 0) /
                SENDERS.length,
            ),
          )}
          trend={{ value: "stable", direction: "flat" }}
          helper="par expédition"
          icon={TrendingUp}
          tone="warning"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 dark:bg-[color:var(--muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher (raison sociale, secteur, ville)"
            leftIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-72"
          />
          <Combobox
            options={TIER_OPTIONS}
            value={tierF}
            onChange={setTierF}
            className="sm:w-44"
          />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => {
          const tier = SENDER_TIER_META[s.tier];
          return (
            <Card key={s.id} className="transition hover:shadow-md">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} className="size-12 text-base" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {s.name}
                      </span>
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        {s.industry} · {s.city}
                      </span>
                    </div>
                  </div>
                  <Badge tone={tier.tone}>{tier.label}</Badge>
                </div>

                <div className="flex flex-col gap-1 text-xs text-[color:var(--muted-foreground)]">
                  <span className="font-medium text-[color:var(--foreground)]">
                    {s.contactName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {s.contactPhone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {s.contactEmail}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-[color:var(--muted)]/40 p-3 text-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[color:var(--muted-foreground)]">
                      Colis (mois)
                    </span>
                    <span className="text-sm font-semibold">
                      {s.shipmentsThisMonth}
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[color:var(--border)]">
                    <span className="text-[10px] text-[color:var(--muted-foreground)]">
                      Dépense
                    </span>
                    <span className="text-sm font-semibold">
                      {formatXof(s.spendThisMonth)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[color:var(--muted-foreground)]">
                      Entrepôts
                    </span>
                    <span className="text-sm font-semibold">
                      {s.warehousesCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-xs text-[color:var(--muted-foreground)]">
                  <span>Inscrit {s.joinedAgo}</span>
                  {s.isActive ? (
                    <Badge tone="success">Actif</Badge>
                  ) : (
                    <Badge tone="danger">Inactif</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
