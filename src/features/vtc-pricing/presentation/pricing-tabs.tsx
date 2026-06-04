"use client";

import { Tabs } from "@/shared/ui/tabs";
import { RidePricingClient } from "./ride-pricing-client";
import { SurgeRulesSection } from "./surge-rules-section";
import type {
  RidePricingInput,
  RideVehicleType,
} from "../domain/ride-pricing";
import type { SurgeRule } from "../domain/surge";

export interface PricingTabsProps {
  surgeRules: SurgeRule[];
  surgeError?: string;
  initialPricing?: RidePricingInput;
  initialVehicleType?: RideVehicleType;
  initialPricingError?: string;
}

export function PricingTabs({
  surgeRules,
  surgeError,
  initialPricing,
  initialVehicleType,
  initialPricingError,
}: PricingTabsProps) {
  return (
    <Tabs
      defaultValue="grid"
      tabs={[
        {
          value: "grid",
          label: "Grille tarifaire",
          content: (
            <RidePricingClient
              initialPricing={initialPricing}
              initialVehicleType={initialVehicleType}
              initialError={initialPricingError}
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
      ]}
    />
  );
}
