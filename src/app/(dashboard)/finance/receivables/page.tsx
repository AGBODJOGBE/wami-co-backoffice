import { requirePermission } from "@/features/auth/application/dal";
import { getReceivablesOverview } from "@/features/finance/application/api";
import { ReceivablesClient } from "@/features/finance/presentation/receivables-client";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  await requirePermission("contract.view_all");

  let result = null;
  let error: string | undefined;
  try {
    result = await getReceivablesOverview({ limit: 100 });
  } catch (e) {
    error = e instanceof Error ? e.message : "Impossible de charger les créances.";
  }

  return (
    <ReceivablesClient
      items={result?.drivers ?? []}
      totals={result?.totals ?? { contractReceivable: 0, commissionReceivable: 0, totalReceivable: 0 }}
      total={result?.total ?? 0}
      error={error}
    />
  );
}
