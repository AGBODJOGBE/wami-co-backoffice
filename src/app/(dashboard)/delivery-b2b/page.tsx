import { requirePermission } from "@/features/auth/application/dal";
import { DeliveryB2bDashboardPage } from "@/features/delivery-b2b/presentation/dashboard-page";

export default async function DeliveryB2bDashboardRoute() {
  await requirePermission("delivery_b2c.view_all");
  return <DeliveryB2bDashboardPage />;
}
