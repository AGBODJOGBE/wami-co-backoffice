"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type { SurgeRule, SurgeRuleInput } from "../domain/surge";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
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

export async function createSurgeRuleAction(
  input: SurgeRuleInput,
): Promise<ActionResult<SurgeRule>> {
  try {
    const data = await apiFetch<SurgeRule>(API_ROUTES.adminSurge.create(), {
      method: "POST",
      body: input,
    });
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Règle surge créée.", data };
  } catch (e) {
    return fail(e, "Création impossible.");
  }
}

export async function updateSurgeRuleAction(
  ruleId: string,
  input: SurgeRuleInput,
): Promise<ActionResult<SurgeRule>> {
  try {
    const data = await apiFetch<SurgeRule>(
      API_ROUTES.adminSurge.update(ruleId),
      { method: "PATCH", body: input },
    );
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Règle mise à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

export async function deleteSurgeRuleAction(
  ruleId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminSurge.remove(ruleId), {
      method: "DELETE",
    });
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Règle supprimée." };
  } catch (e) {
    return fail(e, "Suppression impossible.");
  }
}
