"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  CreatePromoCodeInput,
  PromoCode,
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
): Promise<ActionResult<PromoCode>> {
  try {
    const data = await apiFetch<PromoCode>(API_ROUTES.adminPromos.create(), {
      method: "POST",
      body: clean(input as unknown as Record<string, unknown>),
    });
    refresh();
    return { ok: true, message: "Code promo créé.", data };
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
