import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AdminDeliveriesResult,
  AdminDelivery,
  AdminDeliveryDetail,
} from "../domain/delivery";

/**
 * GET /api/admin/delivery — list every B2C delivery order.
 *
 * Same tolerance pattern as the other admin lists: the backend may wrap
 * the array under `{data}`, `{deliveries,total}`, or send a bare array.
 */
export async function listAdminDeliveries(): Promise<AdminDeliveriesResult> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminDelivery.list());
  if (Array.isArray(raw)) {
    return { deliveries: raw as AdminDelivery[], total: raw.length };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.deliveries)) {
      return {
        deliveries: obj.deliveries as AdminDelivery[],
        total: (obj.total as number | undefined) ?? obj.deliveries.length,
      };
    }
    if (Array.isArray(obj.data)) {
      return {
        deliveries: obj.data as AdminDelivery[],
        total: (obj.total as number | undefined) ?? obj.data.length,
      };
    }
  }
  return { deliveries: [], total: 0 };
}

/** GET /api/admin/delivery/{orderId} — full enriched detail. */
export async function getAdminDelivery(
  orderId: string,
): Promise<AdminDeliveryDetail> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminDelivery.detail(orderId));
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // Tolerate {data} envelope.
    if (
      "data" in obj &&
      obj.data &&
      typeof obj.data === "object" &&
      "id" in (obj.data as Record<string, unknown>)
    ) {
      return obj.data as AdminDeliveryDetail;
    }
    return raw as AdminDeliveryDetail;
  }
  throw new Error("Réponse inattendue du serveur.");
}
