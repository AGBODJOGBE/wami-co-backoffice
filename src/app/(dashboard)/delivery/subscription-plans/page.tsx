import { requirePermission } from "@/features/auth/application/dal";
import { listSubscriptionPlans } from "@/features/delivery-subscription/application/api";
import { SubscriptionPlansSection } from "@/features/delivery-subscription/presentation/subscription-plans-section";

export const dynamic = "force-dynamic";

export default async function SubscriptionPlansPageRoute() {
  await requirePermission("subscription.plan.view");

  let plans: Awaited<ReturnType<typeof listSubscriptionPlans>> = [];
  let error: string | undefined;
  try {
    plans = await listSubscriptionPlans(true);
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de chargement.";
  }

  return <SubscriptionPlansSection plans={plans} error={error} />;
}
