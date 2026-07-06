export type ZoneType = "CITY" | "DISTRICT" | "NEIGHBORHOOD" | "CUSTOM";

export interface PricingZone {
  zoneId: string;
  serviceKey: string;
  /** Always uppercase — immutable after creation. */
  code: string;
  name: string;
  type: ZoneType;
  isActive: boolean;
}

export interface CreatePricingZoneInput {
  serviceKey: string;
  code: string;
  name: string;
  type: ZoneType;
}

export interface PatchPricingZoneInput {
  name?: string;
  type?: ZoneType;
  isActive?: boolean;
}

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  CITY:         "Ville",
  DISTRICT:     "Arrondissement",
  NEIGHBORHOOD: "Quartier",
  CUSTOM:       "Personnalisé",
};

export const ZONE_TYPE_OPTIONS = (Object.keys(ZONE_TYPE_LABELS) as ZoneType[]).map(
  (k) => ({ value: k, label: ZONE_TYPE_LABELS[k] }),
);
