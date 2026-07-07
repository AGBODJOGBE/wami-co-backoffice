export type DriverBonusVehicleCategory =
  | "MOTO"
  | "TRICYCLE"
  | "ECO"
  | "STANDARD"
  | "CONFORT"
  | "VAN"
  | "VIP"
  | "ALL";

export interface BonusTier {
  ridesThreshold: number;
  bonusAmount: number;
}

export interface DriverBonusTierConfig {
  id: string;
  name: string;
  description: string | null;
  vehicleCategory: DriverBonusVehicleCategory;
  tiers: BonusTier[];
  isActive: boolean;
  isDeleted: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
  deletedAt: string | null;
}

export interface DriverBonusAward {
  id: string;
  driverId: string;
  vehicleCategory: DriverBonusVehicleCategory;
  ridesThreshold: number;
  bonusAmount: number;
  configId: string;
  transactionId: string | null;
  awardedAt: string;
}

export interface DriverBonusAwardsResult {
  awards: DriverBonusAward[];
  total: number;
  page: number;
  limit: number;
}

export const VEHICLE_CATEGORY_META: Record<
  DriverBonusVehicleCategory,
  { label: string; tone: "primary" | "success" | "warning" | "neutral" | "info" | "danger" }
> = {
  MOTO:     { label: "Moto",     tone: "warning" },
  TRICYCLE: { label: "Tricycle", tone: "warning" },
  ECO:      { label: "Éco",      tone: "success" },
  STANDARD: { label: "Standard", tone: "primary" },
  CONFORT:  { label: "Confort",  tone: "primary" },
  VAN:      { label: "Van",      tone: "info" },
  VIP:      { label: "VIP",      tone: "info" },
  ALL:      { label: "Toutes",   tone: "neutral" },
};

export const VEHICLE_CATEGORIES: DriverBonusVehicleCategory[] = [
  "ALL", "MOTO", "TRICYCLE", "ECO", "STANDARD", "CONFORT", "VAN", "VIP",
];
