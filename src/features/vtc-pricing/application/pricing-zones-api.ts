import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { PricingZone } from "../domain/pricing-zone";

function normalizeZones(raw: unknown): PricingZone[] {
  if (Array.isArray(raw)) return raw as PricingZone[];
  if (raw && typeof raw === "object") {
    const r = raw as { data?: unknown; zones?: unknown };
    const candidate = r.zones ?? r.data;
    if (Array.isArray(candidate)) return candidate as PricingZone[];
  }
  return [];
}

export async function listPricingZones(serviceKey?: string): Promise<PricingZone[]> {
  const query: Record<string, string> = {};
  if (serviceKey) query.serviceKey = serviceKey;
  const raw = await apiFetch<unknown>(API_ROUTES.adminPricingZones.list(), { query });
  return normalizeZones(raw);
}
