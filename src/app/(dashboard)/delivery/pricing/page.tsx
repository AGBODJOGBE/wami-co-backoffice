import { requirePermission } from "@/features/auth/application/dal";
import {
  getPricingProfile,
  listPricingProfiles,
} from "@/features/vtc-pricing/application/pricing-profiles-api";
import { PricingProfilesSection } from "@/features/vtc-pricing/presentation/pricing-profiles-section";

export const dynamic = "force-dynamic";

/**
 * Tarification Livraison B2B — même moteur générique PricingProfile que VTC
 * et Livraison B2C, interrogé UNIQUEMENT avec serviceKey=DELIVERY_B2B.
 * Le backend calcule déjà les prix B2B via ce même profil
 * (`B2bPricingService` → `CalculatePriceUseCase({ serviceKey: 'DELIVERY_B2B' })`),
 * même si le reste du pôle B2B (partenaires, tournées) reste mocké.
 */
export default async function DeliveryB2bPricingRoute() {
  await requirePermission("delivery.order.view_all");

  let profilesError: string | undefined;
  let lightProfiles: Awaited<ReturnType<typeof listPricingProfiles>> = [];
  try {
    lightProfiles = await listPricingProfiles({ serviceKey: "DELIVERY_B2B" });
  } catch (e) {
    profilesError = e instanceof Error ? e.message : "Erreur de chargement.";
  }

  const detailResults = await Promise.allSettled(
    lightProfiles.map((p) => getPricingProfile(p.profileId)),
  );
  const profiles = lightProfiles.map((p, i) => {
    const res = detailResults[i];
    return res.status === "fulfilled" ? res.value : p;
  });

  return <PricingProfilesSection profiles={profiles} error={profilesError} />;
}
