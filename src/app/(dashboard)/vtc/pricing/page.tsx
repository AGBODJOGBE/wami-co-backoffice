import { requirePermission } from "@/features/auth/application/dal";
import { listSurgeRules } from "@/features/vtc-pricing/application/surge-api";
import {
  getPricingProfile,
  listPricingProfiles,
} from "@/features/vtc-pricing/application/pricing-profiles-api";
import { listPricingZones } from "@/features/vtc-pricing/application/pricing-zones-api";
import { PricingTabs } from "@/features/vtc-pricing/presentation/pricing-tabs";

export const dynamic = "force-dynamic";

export default async function VtcPricingPageRoute() {
  await requirePermission("pricing.grid.configure");
  const [surgeRes, profilesRes, zonesRes] = await Promise.allSettled([
    listSurgeRules(),
    listPricingProfiles(),
    listPricingZones(),
  ]);

  const surgeRules  = surgeRes.status  === "fulfilled" ? surgeRes.value  : [];
  const surgeError  = surgeRes.status  === "rejected"
    ? (surgeRes.reason instanceof Error ? surgeRes.reason.message : "Erreur de chargement.")
    : undefined;

  const lightProfiles  = profilesRes.status === "fulfilled" ? profilesRes.value : [];
  const profilesError  = profilesRes.status === "rejected"
    ? (profilesRes.reason instanceof Error ? profilesRes.reason.message : "Erreur de chargement.")
    : undefined;

  const zones      = zonesRes.status === "fulfilled" ? zonesRes.value : [];
  const zonesError = zonesRes.status === "rejected"
    ? (zonesRes.reason instanceof Error ? zonesRes.reason.message : "Erreur de chargement des zones.")
    : undefined;

  // Fetch all profile details in parallel so client components receive
  // complete data (with components) without extra client-side proxy calls.
  const detailResults = await Promise.allSettled(
    lightProfiles.map((p) => getPricingProfile(p.profileId)),
  );

  const profiles = lightProfiles.map((p, i) => {
    const res = detailResults[i];
    return res.status === "fulfilled" ? res.value : p;
  });

  return (
    <PricingTabs
      surgeRules={surgeRules}
      surgeError={surgeError}
      profiles={profiles}
      profilesError={profilesError}
      zones={zones}
      zonesError={zonesError}
    />
  );
}
