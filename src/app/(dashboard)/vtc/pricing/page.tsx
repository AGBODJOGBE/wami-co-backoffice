import { getActiveRidePricing } from "@/features/vtc-pricing/application/api";
import { listSurgeRules } from "@/features/vtc-pricing/application/surge-api";
import { PricingTabs } from "@/features/vtc-pricing/presentation/pricing-tabs";
import type { RideVehicleType } from "@/features/vtc-pricing/domain/ride-pricing";

export const dynamic = "force-dynamic";

const DEFAULT_PRICING_VEHICLE: RideVehicleType = "STANDARD";

export default async function VtcPricingPageRoute() {
  const [surgeRes, pricingRes] = await Promise.allSettled([
    listSurgeRules(),
    getActiveRidePricing(DEFAULT_PRICING_VEHICLE),
  ]);

  const surgeRules = surgeRes.status === "fulfilled" ? surgeRes.value : [];
  const surgeError =
    surgeRes.status === "rejected"
      ? surgeRes.reason instanceof Error
        ? surgeRes.reason.message
        : "Erreur de chargement."
      : undefined;

  const initialPricing =
    pricingRes.status === "fulfilled" ? pricingRes.value : undefined;
  const initialPricingError =
    pricingRes.status === "rejected"
      ? pricingRes.reason instanceof Error
        ? pricingRes.reason.message
        : "Erreur de chargement."
      : undefined;

  return (
    <PricingTabs
      surgeRules={surgeRules}
      surgeError={surgeError}
      initialPricing={initialPricing}
      initialVehicleType={DEFAULT_PRICING_VEHICLE}
      initialPricingError={initialPricingError}
    />
  );
}
