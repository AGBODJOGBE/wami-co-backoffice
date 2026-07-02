import { listAdminTransactions } from "@/features/wallet/application/api";
import { AdminTransactionsClient } from "@/features/wallet/presentation/admin-transactions-client";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  try {
    const result = await listAdminTransactions({ limit: 200 });
    return (
      <AdminTransactionsClient
        transactions={result.transactions}
        total={result.total}
      />
    );
  } catch (error) {
    return (
      <AdminTransactionsClient
        transactions={[]}
        total={0}
        error={
          error instanceof Error
            ? error.message
            : "Erreur de chargement des transactions."
        }
      />
    );
  }
}
