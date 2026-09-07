import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { ReceivablesOverviewResult } from "../domain/receivables";

/** GET /api/admin/finance/receivables-overview — créances croisées par driver (contrats + commissions). */
export async function getReceivablesOverview(
  query: { page?: number; limit?: number } = {},
): Promise<ReceivablesOverviewResult> {
  const raw = await apiFetch<ReceivablesOverviewResult>(
    API_ROUTES.adminFinance.receivablesOverview(),
    { query },
  );
  return raw;
}
