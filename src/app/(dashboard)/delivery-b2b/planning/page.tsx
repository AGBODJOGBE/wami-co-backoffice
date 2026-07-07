import { requirePermission } from "@/features/auth/application/dal";
import { PlanningPage } from "@/features/delivery-b2b/presentation/planning-page";

export default async function PlanningRoute() {
  await requirePermission("delivery_b2c.view_all");
  return <PlanningPage />;
}
