import { requirePermission } from "@/features/auth/application/dal";
import { listContracts } from "@/features/contracts/application/api";
import { ActiveContractDriversClient } from "@/features/contracts/presentation/active-contract-drivers-client";

export const dynamic = "force-dynamic";

export default async function PilotesActifsRoute() {
  await requirePermission("contract.view_all");

  const [activeRes, suspendedRes] = await Promise.allSettled([
    listContracts({ status: "ACTIVE",    limit: 500 }),
    listContracts({ status: "SUSPENDED", limit: 500 }),
  ]);

  const active    = activeRes.status    === "fulfilled" ? activeRes.value.items    : [];
  const suspended = suspendedRes.status === "fulfilled" ? suspendedRes.value.items : [];
  const contracts = [...active, ...suspended];

  const error =
    activeRes.status === "rejected" && suspendedRes.status === "rejected"
      ? "Impossible de charger les contrats."
      : undefined;

  return <ActiveContractDriversClient contracts={contracts} error={error} />;
}
