import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  WalletGrantCampaignsResult,
  WalletGrantCampaignDetail,
} from "../domain/wallet-grant";

export interface ListGrantsFilters {
  status?:   string;
  audience?: string;
  page?:     number;
  limit?:    number;
}

export async function listWalletGrantCampaigns(
  filters?: ListGrantsFilters,
): Promise<WalletGrantCampaignsResult> {
  let url = API_ROUTES.adminWalletGrants.list();
  if (filters) {
    const p = new URLSearchParams();
    if (filters.status)   p.set("status",   filters.status);
    if (filters.audience) p.set("audience", filters.audience);
    if (filters.page  != null) p.set("page",  String(filters.page));
    if (filters.limit != null) p.set("limit", String(filters.limit));
    const qs = p.toString();
    if (qs) url = `${url}?${qs}`;
  }
  return apiFetch<WalletGrantCampaignsResult>(url);
}

export async function getWalletGrantCampaign(
  campaignId: string,
): Promise<WalletGrantCampaignDetail> {
  return apiFetch<WalletGrantCampaignDetail>(API_ROUTES.adminWalletGrants.detail(campaignId));
}
