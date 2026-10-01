import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { SubscriptionPlan } from "../domain/subscription-plan";

/** GET /api/admin/subscription-plans?includeInactive=true */
export async function listSubscriptionPlans(
  includeInactive = true,
): Promise<SubscriptionPlan[]> {
  const data = await apiFetch<SubscriptionPlan[]>(API_ROUTES.adminSubscriptionPlans.list(), {
    query: includeInactive ? { includeInactive: "true" } : undefined,
  });
  return Array.isArray(data) ? data : [];
}

/** GET /api/admin/subscription-plans/{planId} */
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
  return apiFetch<SubscriptionPlan>(API_ROUTES.adminSubscriptionPlans.detail(planId));
}
