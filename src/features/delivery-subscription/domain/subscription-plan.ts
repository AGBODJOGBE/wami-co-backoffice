/**
 * Delivery subscription plan catalogue — mirrors backend module
 * `delivery-subscription` (`/api/admin/subscription-plans`).
 *
 * ⚠️ EXCEPTION MONÉTAIRE : `price` est stocké et transporté en CENTIMES XOF
 * partout dans ce module (contrairement au reste de la plateforme qui est en
 * FCFA entier). Un plan à 150 000 FCFA vaut `price: 15000000`. Aucune
 * conversion n'existe côté backend — elle doit être faite ici, aux deux
 * frontières (affichage : /100, envoi : *100).
 */

export type QuotaExhaustedPolicy = "BLOCK_NEW_ORDERS" | "BILL_PER_UNIT";

export const QUOTA_EXHAUSTED_POLICY_LABELS: Record<QuotaExhaustedPolicy, string> = {
  BLOCK_NEW_ORDERS: "Bloquer les nouvelles commandes",
  BILL_PER_UNIT: "Facturer à l'unité au-delà du quota",
};

export const QUOTA_EXHAUSTED_POLICY_OPTIONS = (
  Object.keys(QUOTA_EXHAUSTED_POLICY_LABELS) as QuotaExhaustedPolicy[]
).map((k) => ({ value: k, label: QUOTA_EXHAUSTED_POLICY_LABELS[k] }));

/** Forme renvoyée par GET (liste/détail) et PATCH — voir CreateSubscriptionPlanResponse
 * pour la forme (différente, plus courte) renvoyée par POST. */
export interface SubscriptionPlan {
  planId: string;
  name: string;
  description: string | null;
  durationInDays: number;
  /** null = illimité */
  deliveryQuota: number | null;
  onQuotaExhausted: QuotaExhaustedPolicy;
  /** CENTIMES XOF — diviser par 100 pour l'affichage FCFA */
  price: number;
  isActive: boolean;
}

/** Forme réduite renvoyée par POST /api/admin/subscription-plans à la création. */
export interface CreateSubscriptionPlanResponse {
  planId: string;
  name: string;
  durationInDays: number;
  deliveryQuota: number | null;
  price: number;
}

export interface CreateSubscriptionPlanInput {
  name: string;
  description?: string | null;
  durationInDays: number;
  /** null = illimité */
  deliveryQuota: number | null;
  onQuotaExhausted: QuotaExhaustedPolicy;
  /** CENTIMES XOF */
  price: number;
}

export type UpdateSubscriptionPlanInput = Partial<CreateSubscriptionPlanInput>;

export const fcfaToCentimes = (fcfa: number) => Math.round(fcfa * 100);
export const centimesToFcfa = (centimes: number) => centimes / 100;
