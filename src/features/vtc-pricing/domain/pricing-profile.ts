// ─── Sub-types ─────────────────────────────────────────────────────────────

export interface KmTier {
  upTo: number | null;
  pricePerKm: number;
}

export interface ZoneRate {
  from: string;
  to: string | null;
  price: number;
  perKmBeyond?: number;
}

export interface TimedPackageOption {
  durationMinutes: number;
  price: number;
  includedKm: number;
  extraKmRate: number;
}

export interface ComponentCondition {
  field: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte";
  value: unknown;
}

// ─── PricingComponent ──────────────────────────────────────────────────────

export type PricingComponentType =
  | "TIMED_PACKAGE"
  | "FLAT_FEE"
  | "PER_KM_TIER"
  | "PER_MINUTE"
  | "PER_KG"
  | "PER_ZONE"
  | "DISTANCE_ZONE"
  | "PER_UNIT"
  | "WAITING_FEE"
  | "FIXED_SURCHARGE"
  | "MULTIPLIER"
  | "MINIMUM_FARE"
  | "PERCENTAGE_FEE"
  | "ZONE_MATRIX_PRICE"
  | "COD_FEE"
  | "INSURANCE_FEE";

export interface PricingComponent {
  type: PricingComponentType;
  key: string;
  label: string;
  /** Used by: FLAT_FEE, MINIMUM_FARE, PER_MINUTE, PER_KG (base), PER_UNIT, WAITING_FEE (rate), FIXED_SURCHARGE */
  value?: number;
  /** Used by: MULTIPLIER (static coefficient), PERCENTAGE_FEE (rate 0→1), COD_FEE, INSURANCE_FEE */
  rate?: number;
  /** Used by: MULTIPLIER — key to read dynamic rate from context (e.g. "surgeMultiplier"). Overrides `rate` when present. */
  rateFromContext?: string;
  /** Used by: PER_KG (free weight before charging) */
  threshold?: number;
  /** Used by: WAITING_FEE (minutes before billing starts) */
  freeUnits?: number;
  /** Used by: COD_FEE, INSURANCE_FEE — minimum guaranteed fee amount in centimes */
  minimum?: number;
  /** Used by: PER_KM_TIER */
  tiers?: KmTier[];
  /** Used by: PER_ZONE, DISTANCE_ZONE */
  zones?: ZoneRate[];
  /** Used by: TIMED_PACKAGE */
  packages?: TimedPackageOption[];
  condition?: ComponentCondition;
}

// ─── PricingProfile ────────────────────────────────────────────────────────

/** RIDE_PICKUP : course créée par le chauffeur pour un client sans application
 * (walk-in). Tarification et commission administrées séparément de RIDE —
 * même CRUD, profil distinct par vehicleType (`ride/domain/constants/
 * PricingServiceKeys.ts` côté backend). Le backend seede un profil actif par
 * type de véhicule au démarrage ; l'admin les ajuste comme n'importe quel
 * profil RIDE. */
export type ServiceKey = "RIDE" | "RIDE_PICKUP" | "DELIVERY_B2C" | "DELIVERY_B2B";
export type PricingStrategy = "PER_KM" | "PER_ZONE" | "FIXED" | "CATALOG";

export interface PricingProfile {
  profileId: string;
  serviceKey: ServiceKey;
  vehicleType: string | null;
  name: string;
  description: string | null;
  strategy: PricingStrategy;
  components: PricingComponent[];
  commissionRate: number;
  driverShareRate: number;
  noShowMinutes: number;
  noShowFee: number;
  isActive: boolean;
  version: number;
  activatedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Input types ──────────────────────────────────────────────────────────

export interface CreatePricingProfileInput {
  serviceKey: ServiceKey;
  vehicleType?: string | null;
  name: string;
  description?: string | null;
  strategy: PricingStrategy;
  components: PricingComponent[];
  commissionRate: number;
  driverShareRate: number;
  noShowMinutes: number;
  noShowFee: number;
}

export type PatchPricingProfileInput = Partial<CreatePricingProfileInput>;

// ─── Labels & constants ────────────────────────────────────────────────────

export const SERVICE_KEY_LABELS: Record<ServiceKey, string> = {
  RIDE: "VTC",
  RIDE_PICKUP: "VTC Pickup (sans app)",
  DELIVERY_B2C: "Livraison B2C",
  DELIVERY_B2B: "Livraison B2B",
};

export const STRATEGY_LABELS: Record<PricingStrategy, string> = {
  PER_KM: "Par km",
  PER_ZONE: "Par zone",
  FIXED: "Fixe",
  CATALOG: "Catalogue",
};

export const COMPONENT_TYPE_LABELS: Record<PricingComponentType, string> = {
  TIMED_PACKAGE:    "Forfait temporel",
  FLAT_FEE:         "Frais fixe",
  PER_KM_TIER:      "Paliers kilométriques",
  PER_MINUTE:       "Par minute",
  PER_KG:           "Par kg",
  PER_ZONE:         "Par zone",
  DISTANCE_ZONE:    "Zone de distance",
  PER_UNIT:         "Par unité",
  WAITING_FEE:      "Frais d'attente",
  FIXED_SURCHARGE:  "Supplément fixe",
  MULTIPLIER:       "Multiplicateur",
  MINIMUM_FARE:     "Tarif minimum",
  PERCENTAGE_FEE:   "Commission %",
  ZONE_MATRIX_PRICE:"Prix matrice zone",
  COD_FEE:          "Frais remboursement (COD)",
  INSURANCE_FEE:    "Frais assurance colis",
};

export const SERVICE_KEY_OPTIONS = (
  Object.keys(SERVICE_KEY_LABELS) as ServiceKey[]
).map((k) => ({ value: k, label: SERVICE_KEY_LABELS[k] }));

export const STRATEGY_OPTIONS = (
  Object.keys(STRATEGY_LABELS) as PricingStrategy[]
).map((k) => ({ value: k, label: STRATEGY_LABELS[k] }));

export const COMPONENT_TYPE_OPTIONS = (
  Object.keys(COMPONENT_TYPE_LABELS) as PricingComponentType[]
).map((k) => ({ value: k, label: COMPONENT_TYPE_LABELS[k] }));

export function defaultComponent(): PricingComponent {
  return { type: "FLAT_FEE", key: "", label: "", value: 0 };
}

// ─── Vehicle profile templates ────────────────────────────────────────────────

const RIDE_BASE_COMPONENTS = (
  baseFare: number,
  kmTiers: { upTo: number | null; pricePerKm: number }[],
  minFare: number,
  surgeRate: number,
  commissionRate: number,
): PricingComponent[] => [
  { type: "FLAT_FEE", key: "base_fare", label: "Frais de base", value: baseFare },
  { type: "PER_KM_TIER", key: "km_tiers", label: "Tarif kilométrique", tiers: kmTiers },
  { type: "MINIMUM_FARE", key: "min_fare", label: "Prix minimum", value: minFare },
  {
    type: "MULTIPLIER",
    key: "surge",
    label: "Surge tarifaire",
    rate: surgeRate,
    condition: { field: "isSurge", operator: "eq", value: true },
  },
  { type: "PERCENTAGE_FEE", key: "commission", label: "Commission plateforme", rate: commissionRate },
];

/** Default no-show config shared across all RIDE vehicle templates */
const RIDE_NO_SHOW_DEFAULTS = { noShowMinutes: 5, noShowFee: 50000 } as const;

export const RIDE_VEHICLE_TEMPLATES: Record<string, CreatePricingProfileInput> = {
  MOTO: {
    serviceKey: "RIDE",
    vehicleType: "MOTO",
    name: "RIDE MOTO Standard",
    description: "Tarif standard moto Cotonou.",
    strategy: "PER_KM",
    commissionRate: 0.18,
    driverShareRate: 0.82,
    ...RIDE_NO_SHOW_DEFAULTS,
    components: RIDE_BASE_COMPONENTS(
      200,
      [{ upTo: 10, pricePerKm: 150 }, { upTo: 20, pricePerKm: 120 }, { upTo: null, pricePerKm: 100 }],
      500, 1.5, 0.18,
    ),
  },
  TRICYCLE: {
    serviceKey: "RIDE",
    vehicleType: "TRICYCLE",
    name: "RIDE TRICYCLE Standard",
    description: "Tarif standard tricycle.",
    strategy: "PER_KM",
    commissionRate: 0.18,
    driverShareRate: 0.82,
    ...RIDE_NO_SHOW_DEFAULTS,
    components: RIDE_BASE_COMPONENTS(
      250,
      [{ upTo: 10, pricePerKm: 130 }, { upTo: 20, pricePerKm: 110 }, { upTo: null, pricePerKm: 90 }],
      500, 1.5, 0.18,
    ),
  },
  ECO: {
    serviceKey: "RIDE",
    vehicleType: "ECO",
    name: "RIDE ECO Standard",
    description: "Tarif économique.",
    strategy: "PER_KM",
    commissionRate: 0.18,
    driverShareRate: 0.82,
    ...RIDE_NO_SHOW_DEFAULTS,
    components: RIDE_BASE_COMPONENTS(
      150,
      [{ upTo: 10, pricePerKm: 100 }, { upTo: 20, pricePerKm: 85 }, { upTo: null, pricePerKm: 70 }],
      350, 1.5, 0.18,
    ),
  },
  STANDARD: {
    serviceKey: "RIDE",
    vehicleType: "STANDARD",
    name: "RIDE STANDARD",
    description: "Tarif standard véhicule classique.",
    strategy: "PER_KM",
    commissionRate: 0.20,
    driverShareRate: 0.80,
    ...RIDE_NO_SHOW_DEFAULTS,
    components: RIDE_BASE_COMPONENTS(
      400,
      [{ upTo: 10, pricePerKm: 200 }, { upTo: 20, pricePerKm: 170 }, { upTo: null, pricePerKm: 150 }],
      800, 1.5, 0.20,
    ),
  },
  CONFORT: {
    serviceKey: "RIDE",
    vehicleType: "CONFORT",
    name: "RIDE CONFORT",
    description: "Tarif véhicule confort.",
    strategy: "PER_KM",
    commissionRate: 0.20,
    driverShareRate: 0.80,
    ...RIDE_NO_SHOW_DEFAULTS,
    components: RIDE_BASE_COMPONENTS(
      600,
      [{ upTo: 10, pricePerKm: 280 }, { upTo: 20, pricePerKm: 240 }, { upTo: null, pricePerKm: 200 }],
      1200, 1.5, 0.20,
    ),
  },
  VIP: {
    serviceKey: "RIDE",
    vehicleType: "VIP",
    name: "RIDE VIP",
    description: "Tarif premium VIP.",
    strategy: "PER_KM",
    commissionRate: 0.22,
    driverShareRate: 0.78,
    ...RIDE_NO_SHOW_DEFAULTS,
    components: RIDE_BASE_COMPONENTS(
      1000,
      [{ upTo: 10, pricePerKm: 400 }, { upTo: 20, pricePerKm: 350 }, { upTo: null, pricePerKm: 300 }],
      2000, 1.5, 0.22,
    ),
  },
  VAN: {
    serviceKey: "RIDE",
    vehicleType: "VAN",
    name: "RIDE VAN",
    description: "Tarif van / transport de groupe.",
    strategy: "PER_KM",
    commissionRate: 0.20,
    driverShareRate: 0.80,
    ...RIDE_NO_SHOW_DEFAULTS,
    components: RIDE_BASE_COMPONENTS(
      800,
      [{ upTo: 10, pricePerKm: 300 }, { upTo: 20, pricePerKm: 260 }, { upTo: null, pricePerKm: 220 }],
      1500, 1.5, 0.20,
    ),
  },
};
