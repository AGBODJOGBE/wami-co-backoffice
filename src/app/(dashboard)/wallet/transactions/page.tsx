import { requireAnyPermission } from "@/features/auth/application/dal";
import { listAdminTransactions } from "@/features/wallet/application/api";
import { AdminTransactionsClient } from "@/features/wallet/presentation/admin-transactions-client";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  await requireAnyPermission(["wallet.view_all", "transaction.view_all"]);
  const sp = await searchParams;
  const page  = Math.max(1, parseInt(sp.page  ?? "1",   10) || 1);
  const limit = Math.min(500, Math.max(10, parseInt(sp.limit ?? "100", 10) || 100));

  try {
    const result = await listAdminTransactions({ page, limit });
    return (
      <AdminTransactionsClient
        transactions={result.transactions}
        total={result.total}
        page={page}
        limit={limit}
      />
    );
  } catch (error) {
    return (
      <AdminTransactionsClient
        transactions={[]}
        total={0}
        page={page}
        limit={limit}
        error={
          error instanceof Error
            ? error.message
            : "Erreur de chargement des transactions."
        }
      />
    );
  }
}
