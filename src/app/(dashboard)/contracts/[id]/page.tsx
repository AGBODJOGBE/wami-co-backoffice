import { getContract, getContractInstallments, listContractAuditLogs } from "@/features/contracts/application/api";
import { ContractDetailPage } from "@/features/contracts/presentation/contract-detail-page";
import { DetailNotFound } from "@/shared/ui/detail-header";
import { ApiError } from "@/shared/lib/api/types";

export const dynamic = "force-dynamic";

export default async function ContractDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [contract, installments, auditLogsRes] = await Promise.all([
      getContract(id),
      getContractInstallments(id).catch(() => []),
      listContractAuditLogs({ contractId: id, limit: 50 }).catch(() => ({
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      })),
    ]);
    return (
      <ContractDetailPage
        contract={contract}
        installments={installments}
        auditLogs={auditLogsRes.items}
      />
    );
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.status === 404
          ? "Contrat introuvable."
          : `${error.status} — ${error.message}`
        : error instanceof Error
          ? error.message
          : "Erreur inconnue.";
    return (
      <DetailNotFound
        backHref="/contracts"
        backLabel="Retour aux contrats"
        message={message}
      />
    );
  }
}
