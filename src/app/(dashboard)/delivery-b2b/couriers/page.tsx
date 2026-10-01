import { requirePermission } from "@/features/auth/application/dal";
import { listAdminDrivers } from "@/features/drivers/application/api";
import { CouriersListPage } from "@/features/delivery-b2b/presentation/couriers-list";

export const dynamic = "force-dynamic";

export default async function CouriersRoute() {
  await requirePermission("delivery_b2c.view_all");

  let allDrivers: Awaited<ReturnType<typeof listAdminDrivers>> = { drivers: [], total: 0 };
  try {
    allDrivers = await listAdminDrivers();
  } catch {
    // Affichage dégradé
  }

  // Livreurs uniquement — driverType DELIVERY ou BOTH. La liste brute
  // /api/admin/drivers renvoie TOUS les drivers (VTC inclus) : sans ce filtre,
  // cette page "Livraison" affichait des pilotes VTC purs, mélangés aux livreurs.
  const couriers = allDrivers.drivers.filter(
    (d) => d.driverType === "DELIVERY" || d.driverType === "BOTH",
  );

  return <CouriersListPage drivers={couriers} total={couriers.length} />;
}
