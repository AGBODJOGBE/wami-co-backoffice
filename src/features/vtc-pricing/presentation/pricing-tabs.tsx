"use client";

import { Tabs } from "@/shared/ui/tabs";
import { RidePricingProfileEditor } from "./ride-pricing-profile-editor";
import { SurgeRulesSection } from "./surge-rules-section";
import { PricingProfilesSection } from "./pricing-profiles-section";
import { VehiclePricingGrid } from "./vehicle-pricing-grid";
import type { SurgeRule } from "../domain/surge";
import type { PricingProfile } from "../domain/pricing-profile";

export interface PricingTabsProps {
  surgeRules: SurgeRule[];
  surgeError?: string;
  profiles: PricingProfile[];
  profilesError?: string;
}

export function PricingTabs({
  surgeRules,
  surgeError,
  profiles,
  profilesError,
}: PricingTabsProps) {
  return (
    <Tabs
      defaultValue="grid"
      tabs={[
        {
          value: "grid",
          label: "Grille tarifaire",
          content: (
            <RidePricingProfileEditor
              profiles={profiles}
              error={profilesError}
            />
          ),
        },
        {
          value: "surge",
          label: "Règles de surge",
          badge:
            surgeRules.length > 0
              ? { count: surgeRules.length, tone: "info" }
              : undefined,
          content: <SurgeRulesSection rules={surgeRules} error={surgeError} />,
        },
        {
          value: "profiles",
          label: "Profils de tarification",
          badge:
            profiles.length > 0
              ? { count: profiles.length, tone: "neutral" }
              : undefined,
          content: (
            <PricingProfilesSection
              profiles={profiles}
              error={profilesError}
            />
          ),
        },
        {
          value: "vehicles",
          label: "Tarifs par véhicule",
          content: (
            <VehiclePricingGrid profiles={profiles} error={profilesError} />
          ),
        },
      ]}
    />
  );
}
