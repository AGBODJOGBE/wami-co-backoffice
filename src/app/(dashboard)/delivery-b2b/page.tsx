import { requirePermission } from "@/features/auth/application/dal";
import { listAdminDeliveries } from "@/features/delivery-b2c/application/api";
import { DeliveryB2bDashboardPage } from "@/features/delivery-b2b/presentation/dashboard-page";

export const dynamic = "force-dynamic";

export default async function DeliveryB2bDashboardRoute() {
  await requirePermission("delivery_b2c.view_all");

  let result: Awaited<ReturnType<typeof listAdminDeliveries>> = {
    deliveries: [],
    total: 0,
  };
  try {
    result = await listAdminDeliveries();
  } catch {
    // Affichage dégradé — le composant gère les tableaux vides
  }

  return (
    <DeliveryB2bDashboardPage
      deliveries={result.deliveries}
      total={result.total}
    />
  );
}
