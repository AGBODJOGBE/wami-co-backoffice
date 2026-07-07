import { requirePermission } from "@/features/auth/application/dal";
import { CouriersListPage } from "@/features/delivery-b2b/presentation/couriers-list";

export default async function CouriersRoute() {
  await requirePermission("delivery_b2c.view_all");
  return <CouriersListPage />;
}
