import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  PromoCode,
  PromoCodeListQuery,
} from "../domain/promo-code";

/**
 * The swagger doesn't document the GET response shape. We support both
 * conventions:
 *   - bare array: `PromoCode[]`
 *   - wrapped:   `{ promoCodes: PromoCode[]; total: number }`
 */
type RawListResponse =
  | PromoCode[]
  | { promoCodes: PromoCode[]; total?: number };

/** Normalize a record so `id` is always set (some backends use `_id`,
 * `promoId`, etc.). Falls back to `code` last resort so React keys never
 * collide on undefined. */
function withId(p: Record<string, unknown>): PromoCode {
  const id =
    (p.id as string | undefined) ??
    (p._id as string | undefined) ??
    (p.promoId as string | undefined) ??
    (p.promoCodeId as string | undefined) ??
    (p.code as string | undefined) ??
    "";
  // Backend exposes `currentUsages`; our UI uses `usageCount`.
  const usageCount =
    (p.usageCount as number | undefined) ??
    (p.currentUsages as number | undefined) ??
    0;
  return { ...p, id, usageCount } as unknown as PromoCode;
}

export async function listPromoCodes(
  query: PromoCodeListQuery = {},
): Promise<{ promoCodes: PromoCode[]; total: number }> {
  const raw = await apiFetch<RawListResponse>(API_ROUTES.adminPromos.list(), {
    query: {
      isActive: query.isActive,
      vertical: query.vertical,
      campaignType: query.campaignType,
    },
  });
  const arr: unknown[] = Array.isArray(raw)
    ? (raw as unknown[])
    : ((raw.promoCodes ?? []) as unknown[]);
  const normalized = arr.map((p) => withId(p as Record<string, unknown>));
  // One-time debug log to confirm the wire shape (visible in `npm run dev`
  // logs / .next/dev/logs/next-development.log).
  if (arr.length > 0) {
    const sample = arr[0] as Record<string, unknown>;
    console.log(
      `[promo-codes] received ${normalized.length} item(s), keys of first item: ${Object.keys(sample).join(", ")}`,
    );
  } else {
    console.log("[promo-codes] received 0 items");
  }
  const total = Array.isArray(raw)
    ? raw.length
    : (raw.total ?? normalized.length);
  return { promoCodes: normalized, total };
}
