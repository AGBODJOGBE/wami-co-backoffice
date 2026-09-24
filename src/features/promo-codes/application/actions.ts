"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  CreatePromoCodeInput,
  CreatePromoCodeResult,
  SetPromoCodeAffiliateResult,
  ValidatePromoCodeInput,
  ValidatePromoCodeResult,
} from "../domain/promo-code";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function refresh() {
  revalidatePath("/promo-codes");
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, message: error.message || fallback };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

/** Strip empty optionals so the backend doesn't reject `null` where it
 * expects a number / string / array. */
function clean<T extends Record<string, unknown>>(input: T): T {
  const out = { ...input };
  for (const key of Object.keys(out) as (keyof T)[]) {
    const v = out[key];
    if (
      v === "" ||
      v === undefined ||
      (Array.isArray(v) && v.length === 0 && key !== "targetZones" && key !== "vehicleTypes" && key !== "timeWindows" && key !== "targetUserIds")
    ) {
      delete out[key];
    }
  }
  return out;
}

export async function createPromoCodeAction(
  input: CreatePromoCodeInput,
): Promise<ActionResult<CreatePromoCodeResult>> {
  try {
    // Réponse réelle : { promoCodeId, warning?, suggestedMinOrderAmount?,
    // suggestedMinBudget? } — PAS le PromoCode complet créé.
    const data = await apiFetch<CreatePromoCodeResult>(API_ROUTES.adminPromos.create(), {
      method: "POST",
      body: clean(input as unknown as Record<string, unknown>),
    });
    refresh();
    return {
      ok: true,
      // Le warning n'est pas un log : c'est un avertissement non bloquant
      // (perte chiffrée, coût par course non borné, budget suggéré) destiné
      // à l'admin — on le remonte comme message plutôt que de le taire.
      message: data.warning ? `Code promo créé. ${data.warning}` : "Code promo créé.",
      data,
    };
  } catch (e) {
    return fail(e, "Création impossible.");
  }
}

export async function togglePromoCodeAction(
  id: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminPromos.toggle(id), {
      method: "PATCH",
    });
    refresh();
    return { ok: true, message: "Statut basculé." };
  } catch (e) {
    return fail(e, "Bascule impossible.");
  }
}

/** Rattache (affiliateId + commissionRate) ou détache (affiliateId: null)
 * ce code d'un influenceur. Les deux champs se fixent ENSEMBLE — un taux
 * sans affiliateId n'a pas de sens côté backend. */
export async function setPromoCodeAffiliateAction(
  promoCodeId: string,
  affiliateId: string | null,
  commissionRate: number | null,
): Promise<ActionResult<SetPromoCodeAffiliateResult>> {
  try {
    const data = await apiFetch<SetPromoCodeAffiliateResult>(
      API_ROUTES.adminPromos.setAffiliate(promoCodeId),
      { method: "PATCH", body: { affiliateId, commissionRate } },
    );
    refresh();
    return {
      ok: true,
      message: affiliateId ? "Code rattaché à l'affilié." : "Code détaché de l'affilié.",
      data,
    };
  } catch (e) {
    return fail(e, "Rattachement impossible.");
  }
}

export async function validatePromoCodeAction(
  input: ValidatePromoCodeInput,
): Promise<ActionResult<ValidatePromoCodeResult>> {
  try {
    const data = await apiFetch<ValidatePromoCodeResult>(
      API_ROUTES.adminPromos.validate(),
      { method: "POST", body: input },
    );
    return { ok: true, message: "Code valide.", data };
  } catch (e) {
    return fail(e, "Code invalide ou non applicable.");
  }
}
