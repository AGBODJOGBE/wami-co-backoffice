"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  CreateSubscriptionPlanInput,
  CreateSubscriptionPlanResponse,
  SubscriptionPlan,
  UpdateSubscriptionPlanInput,
} from "../domain/subscription-plan";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function refresh() {
  revalidatePath("/delivery/subscription-plans");
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, message: error.message || fallback };
  }
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

export async function createSubscriptionPlanAction(
  input: CreateSubscriptionPlanInput,
): Promise<ActionResult<CreateSubscriptionPlanResponse>> {
  try {
    const data = await apiFetch<CreateSubscriptionPlanResponse>(
      API_ROUTES.adminSubscriptionPlans.create(),
      { method: "POST", body: input },
    );
    refresh();
    return { ok: true, message: "Plan d'abonnement créé.", data };
  } catch (e) {
    return fail(e, "Création du plan impossible.");
  }
}

export async function updateSubscriptionPlanAction(
  planId: string,
  patch: UpdateSubscriptionPlanInput,
): Promise<ActionResult<SubscriptionPlan>> {
  try {
    const data = await apiFetch<SubscriptionPlan>(
      API_ROUTES.adminSubscriptionPlans.update(planId),
      { method: "PATCH", body: patch },
    );
    refresh();
    return { ok: true, message: "Plan mis à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour du plan impossible.");
  }
}

export async function deactivateSubscriptionPlanAction(
  planId: string,
): Promise<ActionResult<SubscriptionPlan>> {
  try {
    const data = await apiFetch<SubscriptionPlan>(
      API_ROUTES.adminSubscriptionPlans.deactivate(planId),
      { method: "PATCH" },
    );
    refresh();
    return { ok: true, message: "Plan retiré du catalogue.", data };
  } catch (e) {
    return fail(e, "Désactivation impossible.");
  }
}

export async function reactivateSubscriptionPlanAction(
  planId: string,
): Promise<ActionResult<SubscriptionPlan>> {
  try {
    const data = await apiFetch<SubscriptionPlan>(
      API_ROUTES.adminSubscriptionPlans.reactivate(planId),
      { method: "PATCH" },
    );
    refresh();
    return { ok: true, message: "Plan remis dans le catalogue.", data };
  } catch (e) {
    return fail(e, "Réactivation impossible.");
  }
}
