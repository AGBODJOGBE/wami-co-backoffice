"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof ApiError) return { ok: false, message: error.message || fallback };
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

function refresh(orderId: string) {
  revalidatePath("/delivery/orders");
  revalidatePath(`/delivery/orders/${orderId}`);
  revalidatePath("/delivery-b2b/shipments");
  revalidatePath(`/delivery-b2b/shipments/${orderId}`);
}

export async function cancelDeliveryAction(
  orderId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDelivery.cancel(orderId), {
      method: "DELETE",
      body: reason ? { reason } : undefined,
    });
    refresh(orderId);
    return { ok: true, message: "Commande annulée." };
  } catch (e) {
    return fail(e, "Impossible d'annuler la commande.");
  }
}
