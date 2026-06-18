import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { PricingProfile } from "../domain/pricing-profile";

interface ListParams {
  serviceKey?: string;
  vehicleType?: string;
  isActive?: boolean;
}

function normalizeList(raw: unknown): PricingProfile[] {
  // apiFetch already unwraps envelopes — raw is either the array directly
  // or an object with a data/profiles key (legacy fallback).
  if (Array.isArray(raw)) return raw as PricingProfile[];
  if (raw && typeof raw === "object") {
    const r = raw as { data?: unknown; profiles?: unknown };
    const candidate = r.data ?? r.profiles;
    if (Array.isArray(candidate)) return candidate as PricingProfile[];
  }
  return [];
}

/**
 * GET /api/admin/pricing/profiles
 * Tolerates `{ data: [...] }` envelope or a plain array.
 */
export async function listPricingProfiles(
  params?: ListParams,
): Promise<PricingProfile[]> {
  const query: Record<string, string | boolean | undefined> = {};
  if (params?.serviceKey !== undefined) query.serviceKey = params.serviceKey;
  if (params?.vehicleType !== undefined) query.vehicleType = params.vehicleType;
  if (params?.isActive !== undefined) query.isActive = params.isActive;

  const raw = await apiFetch<unknown>(API_ROUTES.adminPricingProfiles.list(), {
    query,
  });
  return normalizeList(raw);
}

/**
 * GET /api/admin/pricing/profiles/{id}
 * Tolerates `{ data: {...} }` envelope or a plain object.
 */
export async function getPricingProfile(id: string): Promise<PricingProfile> {
  const raw = await apiFetch<unknown>(
    API_ROUTES.adminPricingProfiles.detail(id),
  );
  if (raw && typeof raw === "object") {
    const candidate =
      "data" in (raw as Record<string, unknown>)
        ? (raw as { data: unknown }).data
        : raw;
    return candidate as PricingProfile;
  }
  return raw as PricingProfile;
}
