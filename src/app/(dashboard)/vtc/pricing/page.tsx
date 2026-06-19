import { listSurgeRules } from "@/features/vtc-pricing/application/surge-api";
import {
  getPricingProfile,
  listPricingProfiles,
} from "@/features/vtc-pricing/application/pricing-profiles-api";
import { PricingTabs } from "@/features/vtc-pricing/presentation/pricing-tabs";

export const dynamic = "force-dynamic";

export default async function VtcPricingPageRoute() {
  const [surgeRes, profilesRes] = await Promise.allSettled([
    listSurgeRules(),
    listPricingProfiles(),
  ]);

  const surgeRules = surgeRes.status === "fulfilled" ? surgeRes.value : [];
  const surgeError =
    surgeRes.status === "rejected"
      ? surgeRes.reason instanceof Error
        ? surgeRes.reason.message
        : "Erreur de chargement."
      : undefined;

  const lightProfiles =
    profilesRes.status === "fulfilled" ? profilesRes.value : [];
  const profilesError =
    profilesRes.status === "rejected"
      ? profilesRes.reason instanceof Error
        ? profilesRes.reason.message
        : "Erreur de chargement."
      : undefined;

  // Fetch all profile details server-side in parallel so client components
  // receive complete data (with components) without needing client-side proxy calls.
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
    />
  );
}
