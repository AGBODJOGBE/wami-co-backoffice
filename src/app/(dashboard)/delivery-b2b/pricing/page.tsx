import { requirePermission } from "@/features/auth/application/dal";
import { PricingPage } from "@/features/delivery-b2b/presentation/pricing-page";

export default async function PricingRoute() {
  await requirePermission("delivery_b2c.view_all");
  return <PricingPage />;
}
