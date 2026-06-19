import { listContracts } from "@/features/contracts/application/api";
import { ContractsPage } from "@/features/contracts/presentation/contracts-page";

export const dynamic = "force-dynamic";

export default async function ContractsRoute() {
  try {
    const result = await listContracts({ limit: 100 });
    return (
      <ContractsPage
        contracts={result.items}
        total={result.total}
      />
    );
  } catch (error) {
    return (
      <ContractsPage
        contracts={[]}
        total={0}
        error={
          error instanceof Error
            ? error.message
            : "Impossible de charger les contrats."
        }
      />
    );
  }
}
