import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  AffiliateConfig,
  AffiliateCommissionDetail,
  AffiliateCommissionSkipsFilters,
  AffiliateCommissionSkipsResult,
  AffiliateDetail,
  AffiliateListItem,
} from "../domain/affiliate";

// ─── Liste ────────────────────────────────────────────────────────────────────

export async function listAffiliates(): Promise<AffiliateListItem[]> {
  return apiFetch<AffiliateListItem[]>(API_ROUTES.affiliates.list());
}

// ─── Détail ───────────────────────────────────────────────────────────────────

export interface AffiliateDetailFilters {
  status?: string;
  from?:   string;
  to?:     string;
  limit?:  number;
  offset?: number;
}

export async function getAffiliateDetail(
  affiliateId: string,
  filters?: AffiliateDetailFilters,
): Promise<AffiliateDetail> {
  let url = API_ROUTES.affiliates.detail(affiliateId);
  if (filters) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.from)   params.set("from",   filters.from);
    if (filters.to)     params.set("to",     filters.to);
    if (filters.limit  != null) params.set("limit",  String(filters.limit));
    if (filters.offset != null) params.set("offset", String(filters.offset));
    const qs = params.toString();
    if (qs) url = `${url}?${qs}`;
  }
  return apiFetch<AffiliateDetail>(url);
}

// ─── Configuration ────────────────────────────────────────────────────────────

export async function getAffiliateConfig(): Promise<AffiliateConfig> {
  return apiFetch<AffiliateConfig>(API_ROUTES.affiliates.config());
}

// ─── Commission (détail admin) ────────────────────────────────────────────────

export async function getAffiliateCommissionDetail(
  commissionId: string,
): Promise<AffiliateCommissionDetail> {
  return apiFetch<AffiliateCommissionDetail>(
    API_ROUTES.affiliates.commissionDetail(commissionId),
  );
}

// ─── Usages écartés (aucune commission générée) ───────────────────────────────

export async function listAffiliateCommissionSkips(
  filters?: AffiliateCommissionSkipsFilters,
): Promise<AffiliateCommissionSkipsResult> {
  return apiFetch<AffiliateCommissionSkipsResult>(
    API_ROUTES.affiliates.commissionSkips(filters),
  );
}
