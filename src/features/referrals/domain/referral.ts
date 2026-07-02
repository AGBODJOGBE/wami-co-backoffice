/**
 * Referral domain — mirrors backend referral module types.
 */

export type ReferralStatus = "PENDING" | "VALIDATED" | "EXPIRED";

export type ReferralType =
  | "PASSENGER"
  | "DRIVER_STANDARD"
  | "DRIVER_PREMIUM"
  | "DRIVER_VIP"
  | "PARTNER";

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING:   "En attente",
  VALIDATED: "Validé",
  EXPIRED:   "Expiré",
};

export const REFERRAL_STATUS_TONES: Record<
  ReferralStatus,
  "warning" | "success" | "neutral"
> = {
  PENDING:   "warning",
  VALIDATED: "success",
  EXPIRED:   "neutral",
};

export const REFERRAL_TYPE_LABELS: Record<ReferralType, string> = {
  PASSENGER:       "Passager",
  DRIVER_STANDARD: "Driver Standard",
  DRIVER_PREMIUM:  "Driver Premium",
  DRIVER_VIP:      "Driver VIP",
  PARTNER:         "Partenaire",
};

/** Single referral item returned by admin list/filleuls/parrains endpoints. */
export interface Referral {
  referralId:     string;
  referrerId:     string;
  referredUserId: string;
  referredName:   string;
  referralCode:   string;
  referralType:   ReferralType | string;
  status:         ReferralStatus | string;
  referrerReward: number;
  referredReward: number;
  validatedAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

/** Global stats returned by GET /api/admin/referrals/stats */
export interface ReferralStats {
  totalReferrals:     number;
  validatedReferrals: number;
  pendingReferrals:   number;
  expiredReferrals:   number;
  totalRewardsGiven:  number;
}

export type RewardMode = "FIXED" | "PERCENTAGE";
export type ActionType = "RIDE" | "TRANSACTION" | "DELIVERY";

export interface RewardMatrixEntry {
  referrerType:   ReferralType | string;
  referredType:   ReferralType | string;
  rewardMode:     RewardMode;
  referrerAmount: number;
  referredAmount: number;
  referrerCap?:   number | null;
  referredCap?:   number | null;
}

export interface ValidationConditionEntry {
  referredType:    ReferralType | string;
  actionsRequired: number;
  actionType:      ActionType;
}

export interface PerTypeLimitEntry {
  referredType:  ReferralType | string;
  maxPerMonth:   number;
  maxPerDay:     number;
}

/** Full referral program configuration */
export interface ReferralConfig {
  id:          string;
  name:        string;
  description: string | null;
  isActive:    boolean;
  isDeleted:   boolean;
  rewardMatrix: RewardMatrixEntry[];
  limits: {
    perType:              PerTypeLimitEntry[];
    maxReferralsPerDayGlobal?: number | null;
  };
  validationConditions: {
    perType:        ValidationConditionEntry[];
    expirationDays?: number | null;
  };
  createdBy:      string | null;
  updatedBy:      string | null;
  createdAt:      string;
  updatedAt:      string;
  activatedAt?:   string | null;
  deactivatedAt?: string | null;
}

/** Query params for admin referral list */
export interface ReferralListQuery {
  status?:       ReferralStatus | "ALL";
  referralType?: ReferralType  | "ALL";
  dateFrom?:     string;
  dateTo?:       string;
  page?:         number;
  limit?:        number;
}
