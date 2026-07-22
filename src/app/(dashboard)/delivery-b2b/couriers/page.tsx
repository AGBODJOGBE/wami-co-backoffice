import { requirePermission } from "@/features/auth/application/dal";
import { listAdminDrivers } from "@/features/drivers/application/api";
import { CouriersListPage } from "@/features/delivery-b2b/presentation/couriers-list";

export const dynamic = "force-dynamic";

export default async function CouriersRoute() {
  await requirePermission("delivery_b2c.view_all");

  let drivers: Awaited<ReturnType<typeof listAdminDrivers>> = { drivers: [], total: 0 };
  try {
    drivers = await listAdminDrivers();
  } catch {
    // Affichage dégradé
  }

  return <CouriersListPage drivers={drivers.drivers} total={drivers.total} />;
}
