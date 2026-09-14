"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import { CanView } from "@/shared/ui/can-view";
import { updateAffiliateConfigAction } from "../application/actions";
import type { AffiliateConfig } from "../domain/affiliate";

interface Props {
  config: AffiliateConfig;
}

export function AffiliateConfigPage({ config }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState<string>(String(config.defaultCommissionRate));
  const [minPayout, setMinPayout] = useState<string>(String(config.minPayoutAmount));

  function handleSave() {
    const r = Number(rate);
    const m = Number(minPayout);
    if (isNaN(r) || r < 0 || r > 100) {
      toast({ kind: "error", title: "Taux invalide", description: "Le taux doit être entre 0 et 100." });
      return;
    }
    if (isNaN(m) || m < 0) {
      toast({ kind: "error", title: "Montant invalide", description: "Le seuil doit être ≥ 0." });
      return;
    }
    startTransition(async () => {
      const res = await updateAffiliateConfigAction({
        defaultCommissionRate: r,
        minPayoutAmount: m,
      });
      if (res.success) {
        toast({ kind: "success", title: "Configuration mise à jour" });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Mise à jour échouée", description: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Marketing · Affiliés"
        title="Configuration globale"
        description="Paramètres appliqués à tous les affiliés sans taux personnalisé."
        dataSource="live"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/affiliate"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--muted)] dark:bg-transparent"
            >
              <ArrowLeft className="size-4" />
              Retour
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulaire */}
        <CanView permission="affiliate.config.manage">
          <Card className="flex flex-col gap-5 p-5">
            <h2 className="font-semibold">Paramètres</h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Taux de commission par défaut (%)"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="ex. 10"
              />
              <Input
                label="Seuil de versement minimum (FCFA en centimes)"
                type="number"
                min={0}
                value={minPayout}
                onChange={(e) => setMinPayout(e.target.value)}
                placeholder="ex. 500000 = 5 000 FCFA"
              />
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Les montants sont exprimés en centimes XOF (500000 = 5 000 FCFA).
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={pending}>
                {pending && <Spinner size="sm" />}
                Enregistrer
              </Button>
            </div>
          </Card>
        </CanView>

        {/* Infos courantes */}
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="font-semibold">Configuration courante</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Taux par défaut</dt>
              <dd className="mt-0.5 font-mono font-semibold">{config.defaultCommissionRate}%</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Seuil min. versement</dt>
              <dd className="mt-0.5 font-mono">{(config.minPayoutAmount / 100).toLocaleString("fr-FR")} FCFA</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Dernière modif.</dt>
              <dd className="mt-0.5 text-xs">{formatDate(config.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">Modifié par</dt>
              <dd className="mt-0.5 font-mono text-xs">{config.updatedBy.slice(0, 12)}…</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
