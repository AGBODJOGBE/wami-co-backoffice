import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  Referral,
  ReferralConfig,
  ReferralListQuery,
  ReferralStats,
} from "../domain/referral";

function extractList(raw: unknown, key: string): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj[key]))  return obj[key] as unknown[];
    if (Array.isArray(obj.data))  return obj.data  as unknown[];
    if (Array.isArray(obj.items)) return obj.items as unknown[];
  }
  return [];
}

function extractTotal(raw: unknown, arr: unknown[]): number {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.total === "number") return obj.total;
    if (obj.meta && typeof (obj.meta as Record<string, unknown>).total === "number")
      return (obj.meta as Record<string, unknown>).total as number;
  }
  return arr.length;
}

/** GET /api/admin/referrals/stats */
export async function getReferralStats(): Promise<ReferralStats> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminReferrals.stats());
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.data) return obj.data as ReferralStats;
    return raw as ReferralStats;
  }
  return {
    totalReferrals: 0, validatedReferrals: 0,
    pendingReferrals: 0, expiredReferrals: 0, totalRewardsGiven: 0,
  };
}

/** GET /api/admin/referrals */
export async function listReferrals(
  query: ReferralListQuery = {},
): Promise<{ referrals: Referral[]; total: number }> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminReferrals.list(), {
    query: {
      status:       query.status       !== "ALL" ? query.status       : undefined,
      referralType: query.referralType !== "ALL" ? query.referralType : undefined,
      dateFrom:     query.dateFrom,
      dateTo:       query.dateTo,
      page:         query.page,
      limit:        query.limit ?? 200,
    },
  });
  const arr = extractList(raw, "referrals") as Referral[];
  return { referrals: arr, total: extractTotal(raw, arr) };
}

/** GET /api/admin/referrals/filleuls */
export async function listFilleuls(
  query: Pick<ReferralListQuery, "status" | "page" | "limit"> = {},
): Promise<{ referrals: Referral[]; total: number }> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminReferrals.filleuls(), {
    query: {
      status: query.status !== "ALL" ? query.status : undefined,
      page:   query.page,
      limit:  query.limit ?? 200,
    },
  });
  const arr = extractList(raw, "referrals") as Referral[];
  return { referrals: arr, total: extractTotal(raw, arr) };
}

/** GET /api/admin/referrals/parrains */
export async function listParrains(
  query: Pick<ReferralListQuery, "status" | "page" | "limit"> = {},
): Promise<{ referrals: Referral[]; total: number }> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminReferrals.parrains(), {
    query: {
      status: query.status !== "ALL" ? query.status : undefined,
      page:   query.page,
      limit:  query.limit ?? 200,
    },
  });
  const arr = extractList(raw, "referrals") as Referral[];
  return { referrals: arr, total: extractTotal(raw, arr) };
}

/** GET /api/admin/referrals/config */
export async function listReferralConfigs(): Promise<ReferralConfig[]> {
  const raw = await apiFetch<unknown>(API_ROUTES.adminReferrals.configs());
  return extractList(raw, "configs") as ReferralConfig[];
}
