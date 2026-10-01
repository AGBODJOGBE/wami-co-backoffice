"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CanView } from "@/shared/ui/can-view";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatXof } from "@/shared/lib/format";
import {
  deactivateSubscriptionPlanAction,
  reactivateSubscriptionPlanAction,
  type ActionResult,
} from "../application/actions";
import {
  centimesToFcfa,
  QUOTA_EXHAUSTED_POLICY_LABELS,
  type SubscriptionPlan,
} from "../domain/subscription-plan";
import { SubscriptionPlanModal } from "./subscription-plan-modal";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) toast({ kind: "success", title: successTitle, description: result.message });
  else toast({ kind: "error", title: "Échec", description: result.message });
}

export interface SubscriptionPlansSectionProps {
  plans: SubscriptionPlan[];
  error?: string;
}

export function SubscriptionPlansSection({ plans, error }: SubscriptionPlansSectionProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubscriptionPlan | null>(null);

  const [toggleTarget, setToggleTarget] = useState<{
    plan: SubscriptionPlan;
    kind: "deactivate" | "reactivate";
  } | null>(null);
  const [toggling, startToggle] = useTransition();

  function runToggle() {
    if (!toggleTarget) return;
    const { plan, kind } = toggleTarget;
    startToggle(async () => {
      const r =
        kind === "deactivate"
          ? await deactivateSubscriptionPlanAction(plan.planId)
          : await reactivateSubscriptionPlanAction(plan.planId);
      notify(r, kind === "deactivate" ? "Plan retiré" : "Plan réactivé");
      if (r.ok) setToggleTarget(null);
    });
  }

  const activeCount = plans.filter((p) => p.isActive).length;
  const sorted = [...plans].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name, "fr");
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Livraison B2B · Abonnements"
        title="Plans d'abonnement"
        description="Catalogue des plans proposés aux partenaires livraison — quota de livraisons, durée et prix."
        dataSource="live"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
            >
              {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
              Rafraîchir
            </Button>
            <CanView permission="subscription.plan.manage">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nouveau plan
              </Button>
            </CanView>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      <p className="text-xs text-[color:var(--muted-foreground)]">
        {activeCount} actif{activeCount !== 1 ? "s" : ""} sur {plans.length} plan{plans.length !== 1 ? "s" : ""}
      </p>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
          <AlertTriangle className="size-8 text-[color:var(--muted-foreground)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              Aucun plan d&apos;abonnement
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              Créez le premier plan pour ouvrir le catalogue aux partenaires.
            </p>
          </div>
          <CanView permission="subscription.plan.manage">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Créer le premier plan
            </Button>
          </CanView>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((plan) => (
            <PlanRow
              key={plan.planId}
              plan={plan}
              onEdit={() => setEditTarget(plan)}
              onDeactivate={() => setToggleTarget({ plan, kind: "deactivate" })}
              onReactivate={() => setToggleTarget({ plan, kind: "reactivate" })}
            />
          ))}
        </div>
      )}

      <SubscriptionPlanModal
        open={createOpen || !!editTarget}
        plan={editTarget}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
      />

      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={runToggle}
        title={toggleTarget?.kind === "deactivate" ? "Retirer ce plan du catalogue ?" : "Remettre ce plan au catalogue ?"}
        description={
          toggleTarget ? (
            <p>
              {toggleTarget.kind === "deactivate" ? (
                <>
                  <strong>{toggleTarget.plan.name}</strong> ne sera plus proposé aux
                  nouveaux abonnements. Les partenaires déjà abonnés ne sont pas affectés
                  (conditions gelées dans leur souscription).
                </>
              ) : (
                <>
                  <strong>{toggleTarget.plan.name}</strong> redeviendra disponible dans
                  le catalogue partenaire.
                </>
              )}
            </p>
          ) : null
        }
        confirmLabel={toggleTarget?.kind === "deactivate" ? "Retirer" : "Réactiver"}
        tone={toggleTarget?.kind === "deactivate" ? "danger" : "primary"}
        isLoading={toggling}
      />
    </div>
  );
}

function PlanRow({
  plan,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        plan.isActive
          ? "border-[color:var(--primary)]/30 bg-[color:var(--muted)]/20"
          : "border-[color:var(--border)] bg-[color:var(--background)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {plan.isActive && (
              <span className="inline-block size-2 rounded-full bg-[color:var(--primary)]" />
            )}
            <span className="text-sm font-semibold text-[color:var(--foreground)]">
              {plan.name}
            </span>
            {plan.isActive ? (
              <Badge tone="success">Actif</Badge>
            ) : (
              <Badge tone="neutral">Inactif</Badge>
            )}
            <Badge tone="info">{formatXof(centimesToFcfa(plan.price))}</Badge>
            <Badge tone="neutral">{plan.durationInDays} j</Badge>
          </div>

          {plan.description && (
            <p className="text-xs text-[color:var(--muted-foreground)]">{plan.description}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1">
              <Boxes className="size-3" />
              Quota :{" "}
              <strong className="text-[color:var(--foreground)]">
                {plan.deliveryQuota === null ? "Illimité" : `${plan.deliveryQuota} livraisons`}
              </strong>
            </span>
            <span>
              Au-delà : {QUOTA_EXHAUSTED_POLICY_LABELS[plan.onQuotaExhausted]}
            </span>
          </div>
        </div>

        <CanView permission="subscription.plan.manage">
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {plan.isActive ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="size-4" />
                  Modifier
                </Button>
                <Button variant="outline" size="sm" onClick={onDeactivate}>
                  <PowerOff className="size-4" />
                  Retirer
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={onReactivate}>
                <Zap className="size-4" />
                Réactiver
              </Button>
            )}
          </div>
        </CanView>
      </div>
    </div>
  );
}
