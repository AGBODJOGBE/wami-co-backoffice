export type DriverBonusVehicleCategory =
  | "MOTO"
  | "TRICYCLE"
  | "ECO"
  | "STANDARD"
  | "CONFORT"
  | "VAN"
  | "VIP"
  | "ALL";

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

// ─── Système C — Paliers / Bienvenue ─────────────────────────────────────────

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

// ─── Système A — Activité quotidienne ────────────────────────────────────────

export interface ActivityTier {
  name: string;
  ridesThresholdPerDay: number;
  bonusPct: number;
}

export interface DriverBonusActivityConfig {
  id: string;
  name: string;
  description: string | null;
  vehicleCategory: DriverBonusVehicleCategory;
  tiers: ActivityTier[];
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

export interface DriverBonusActivityDailyLedger {
  id: string;
  driverId: string;
  vehicleCategory: DriverBonusVehicleCategory;
  activityDate: string;
  ridesCount: number;
  netAmount: number;
  tierPctApplied: number;
  bonusAmount: number;
  configId: string;
  paid: boolean;
  paidAt: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface DriverBonusActivityPayout {
  id: string;
  driverId: string;
  payoutRunDate: string;
  coveredLedgerIds: string[];
  totalAmount: number;
  transactionId: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Système B — Qualité mensuelle ───────────────────────────────────────────

export interface QualityTier {
  minRating: number;
  bonusAmount: number;
}

export interface DriverBonusQualityConfig {
  id: string;
  name: string;
  description: string | null;
  vehicleCategory: DriverBonusVehicleCategory;
  minRidesPerMonth: number;
  tiers: QualityTier[];
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

export interface DriverBonusQualityMonthlyLedger {
  id: string;
  driverId: string;
  vehicleCategory: DriverBonusVehicleCategory;
  yearMonth: string;
  ridesCount: number;
  averageRating: number;
  bonusAmount: number;
  configId: string;
  transactionId: string | null;
  awardedAt: string;
}

// ─── RunConfig — Cadence & kill-switches ─────────────────────────────────────

export type BonusRunFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export const BONUS_RUN_FREQUENCY_LABELS: Record<BonusRunFrequency, string> = {
  DAILY:   "Quotidien",
  WEEKLY:  "Hebdomadaire",
  MONTHLY: "Mensuel",
};

export interface DriverBonusRunConfig {
  welcomeBonusEnabled: boolean;
  activityBonusEnabled: boolean;
  activityJournalCronHour: number;
  activityPayoutFrequency: BonusRunFrequency;
  activityPayoutCronHour: number;
  activityPayoutWeeklyDay: number;
  activityPayoutMonthlyDay: number;
  qualityBonusEnabled: boolean;
  qualityBonusCronDay: number;
  qualityBonusCronHour: number;
  updatedBy: string | null;
  updatedAt: string | null;
}
