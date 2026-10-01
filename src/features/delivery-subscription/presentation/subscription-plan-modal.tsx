"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import {
  createSubscriptionPlanAction,
  updateSubscriptionPlanAction,
  type ActionResult,
} from "../application/actions";
import {
  centimesToFcfa,
  fcfaToCentimes,
  QUOTA_EXHAUSTED_POLICY_OPTIONS,
  type CreateSubscriptionPlanInput,
  type QuotaExhaustedPolicy,
  type SubscriptionPlan,
} from "../domain/subscription-plan";

function notify(result: ActionResult<unknown>, successTitle: string) {
  if (result.ok) toast({ kind: "success", title: successTitle, description: result.message });
  else toast({ kind: "error", title: "Échec", description: result.message });
}

interface FormState {
  name: string;
  description: string;
  durationInDays: number;
  unlimitedQuota: boolean;
  deliveryQuota: number;
  onQuotaExhausted: QuotaExhaustedPolicy;
  priceFcfa: number;
}

function defaultForm(): FormState {
  return {
    name: "",
    description: "",
    durationInDays: 30,
    unlimitedQuota: false,
    deliveryQuota: 100,
    onQuotaExhausted: "BLOCK_NEW_ORDERS",
    priceFcfa: 0,
  };
}

function planToForm(p: SubscriptionPlan): FormState {
  return {
    name: p.name,
    description: p.description ?? "",
    durationInDays: p.durationInDays,
    unlimitedQuota: p.deliveryQuota === null,
    deliveryQuota: p.deliveryQuota ?? 100,
    onQuotaExhausted: p.onQuotaExhausted,
    priceFcfa: centimesToFcfa(p.price),
  };
}

export interface SubscriptionPlanModalProps {
  open: boolean;
  plan: SubscriptionPlan | null;
  onClose: () => void;
}

export function SubscriptionPlanModal({ open, plan, onClose }: SubscriptionPlanModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm(plan ? planToForm(plan) : defaultForm());
  }, [open, plan]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.name.trim()) {
      toast({ kind: "error", title: "Nom requis", description: "Donnez un nom au plan." });
      return;
    }
    if (!Number.isInteger(form.durationInDays) || form.durationInDays <= 0) {
      toast({ kind: "error", title: "Durée invalide", description: "La durée doit être un entier positif de jours." });
      return;
    }
    if (!form.unlimitedQuota && (!Number.isInteger(form.deliveryQuota) || form.deliveryQuota <= 0)) {
      toast({ kind: "error", title: "Quota invalide", description: "Le quota doit être un entier positif, ou cochez « illimité »." });
      return;
    }
    const price = fcfaToCentimes(form.priceFcfa);
    if (!Number.isInteger(price) || price < 0) {
      toast({ kind: "error", title: "Prix invalide", description: "Le prix doit être un montant positif." });
      return;
    }

    const input: CreateSubscriptionPlanInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      durationInDays: form.durationInDays,
      deliveryQuota: form.unlimitedQuota ? null : form.deliveryQuota,
      onQuotaExhausted: form.onQuotaExhausted,
      price,
    };

    start(async () => {
      const r = plan
        ? await updateSubscriptionPlanAction(plan.planId, input)
        : await createSubscriptionPlanAction(input);
      notify(r, plan ? "Plan mis à jour" : "Plan créé");
      if (r.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={plan ? "Modifier le plan" : "Créer un plan d'abonnement"}
      description={
        plan
          ? "Les partenaires déjà abonnés gardent les conditions gelées de leur souscription (PlanSnapshot) — seuls les nouveaux abonnements utilisent la version modifiée."
          : "Catalogue d'abonnements livraison B2B proposé aux partenaires."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Enregistrement…" : plan ? "Enregistrer" : "Créer le plan"}
          </Button>
        </>
      }
    >
      <div className="relative flex flex-col gap-5">
        {pending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[color:var(--background)]/70 backdrop-blur-sm">
            <Spinner size="lg" label="Enregistrement…" />
          </div>
        )}

        <fieldset disabled={pending} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nom *"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Plan Bronze"
              required
            />
            <Input
              label="Prix (FCFA) *"
              type="number" step="1" min={0}
              value={form.priceFcfa}
              onChange={(e) => set("priceFcfa", Math.max(0, Number(e.target.value)))}
              hint="Montant facturé au partenaire pour la durée du plan"
              required
            />
          </div>

          <Input
            label="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Description optionnelle du plan"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Durée (jours) *"
              type="number" step="1" min={1}
              value={form.durationInDays}
              onChange={(e) => set("durationInDays", Math.max(1, Number(e.target.value)))}
              hint="Ex. 30 = mensuel, 365 = annuel"
              required
            />
            <Select
              label="Quota épuisé *"
              id="sp-quota-policy"
              options={QUOTA_EXHAUSTED_POLICY_OPTIONS}
              value={form.onQuotaExhausted}
              onChange={(e) => set("onQuotaExhausted", e.target.value as QuotaExhaustedPolicy)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]">
              <input
                type="checkbox"
                checked={form.unlimitedQuota}
                onChange={(e) => set("unlimitedQuota", e.target.checked)}
                className="size-4 rounded border-[color:var(--border)]"
              />
              Quota de livraisons illimité
            </label>
            {!form.unlimitedQuota && (
              <Input
                label="Quota de livraisons *"
                type="number" step="1" min={1}
                value={form.deliveryQuota}
                onChange={(e) => set("deliveryQuota", Math.max(1, Number(e.target.value)))}
                hint="Nombre de livraisons incluses sur la durée du plan"
                required
              />
            )}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
