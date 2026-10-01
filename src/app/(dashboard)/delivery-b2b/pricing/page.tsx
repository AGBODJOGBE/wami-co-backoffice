import { requirePermission } from "@/features/auth/application/dal";
import {
  getPricingProfile,
  listPricingProfiles,
} from "@/features/vtc-pricing/application/pricing-profiles-api";
import { PricingProfilesSection } from "@/features/vtc-pricing/presentation/pricing-profiles-section";

export const dynamic = "force-dynamic";

/**
 * Tarification Livraison B2C — réutilise le moteur générique PricingProfile
 * (même CRUD que /vtc/pricing) mais interrogé UNIQUEMENT avec
 * serviceKey=DELIVERY_B2C : aucun profil VTC ne transite jamais par cette
 * page, à l'inverse de l'ancienne page mock qui prétendait qu'aucun endpoint
 * n'existait. Le backend calcule déjà les prix B2C via ce même profil
 * (`B2cPricingService` → `CalculatePriceUseCase({ serviceKey: 'DELIVERY_B2C' })`).
 */
export default async function DeliveryB2cPricingRoute() {
  await requirePermission("delivery_b2c.view_all");

  let profilesError: string | undefined;
  let lightProfiles: Awaited<ReturnType<typeof listPricingProfiles>> = [];
  try {
    lightProfiles = await listPricingProfiles({ serviceKey: "DELIVERY_B2C" });
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
