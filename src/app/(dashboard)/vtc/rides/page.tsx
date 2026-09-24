import { requirePermission } from "@/features/auth/application/dal";
import { listAdminRides } from "@/features/rides/application/api";
import { AdminRidesListClient } from "@/features/rides/presentation/admin-rides-list-client";

export const dynamic = "force-dynamic";

/** Backend hard cap — Math.min(200, ...) in ListAllRidesUseCase. */
const PAGE_LIMIT = 200;

/**
 * Charge UNIQUEMENT la première page (les 200 courses les plus récentes) pour
 * que la page s'affiche en ~2 s. Le reste de l'historique est rapatrié en
 * arrière-plan par le client (`fetchRidesPageAction`), page après page, pour
 * que la recherche finisse par couvrir toutes les courses sans bloquer
 * l'affichage initial.
 */
export default async function VtcRidesPage() {
  await requirePermission("ride.view_all");
  try {
    const first = await listAdminRides({ page: 1, limit: PAGE_LIMIT });
    return (
      <AdminRidesListClient
        rides={first.rides}
        total={first.total}
        pageSize={PAGE_LIMIT}
      />
    );
  } catch (error) {
    return (
      <AdminRidesListClient
        rides={[]}
        total={0}
        pageSize={PAGE_LIMIT}
        error={error instanceof Error ? error.message : "Erreur de chargement."}
      />
    );
  }
}
