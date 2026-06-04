import { listAdminRides } from "@/features/rides/application/api";
import { AdminRidesListClient } from "@/features/rides/presentation/admin-rides-list-client";

export const dynamic = "force-dynamic";

export default async function VtcRidesPage() {
  try {
    const result = await listAdminRides();
    return (
      <AdminRidesListClient rides={result.rides} total={result.total} />
    );
  } catch (error) {
    return (
      <AdminRidesListClient
        rides={[]}
        total={0}
        error={error instanceof Error ? error.message : "Erreur de chargement."}
      />
    );
  }
}
