/**
 * Promo codes admin domain. Mirrors the OpenAPI contract for
 *   POST   /api/admin/promo-codes
 *   GET    /api/admin/promo-codes
 *   PATCH  /api/admin/promo-codes/{id}/toggle
 *   POST   /api/admin/promo-codes/validate
 */

export type DiscountType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "CASHBACK"
  | "FREE_RIDE";

export type UserType = "NEW" | "RECURRING" | "INACTIVE" | "ALL";

export type Vertical = "TRANSPORT" | "DELIVERY_B2B";

export type CampaignType = "PERFORMANCE" | "GROWTH";

export type FundedBy = "FORYOU" | "PARTNER";

export type Channel =
  | "IN_APP"
  | "SMS"
  | "SOCIAL_MEDIA"
  | "FACEBOOK_ADS"
  | "BILLBOARDS"
  | "EVENTS"
  | "OTHER";

export type CodeType = "USER" | "MERCHANT";

export type Targeting = "ALL" | "SEGMENT" | "CSV";

export type Objective = "ACQUISITION" | "RETENTION";

/** Vehicle types accepted by the validate endpoint. */
export type ValidateVehicleType = "MOTO" | "STANDARD" | "CONFORT" | "VAN";

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "Pourcentage",
  FIXED_AMOUNT: "Montant fixe",
  CASHBACK: "Cashback",
  FREE_RIDE: "Course offerte",
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  NEW: "Nouveaux utilisateurs",
  RECURRING: "Récurrents",
  INACTIVE: "Inactifs",
  ALL: "Tous",
};

export const VERTICAL_LABELS: Record<Vertical, string> = {
  TRANSPORT: "Transport",
  DELIVERY_B2B: "Livraison B2B",
};

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  PERFORMANCE: "Performance",
  GROWTH: "Growth",
};

export const FUNDED_BY_LABELS: Record<FundedBy, string> = {
  FORYOU: "ForYou",
  PARTNER: "Partenaire",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  IN_APP: "In-App",
  SMS: "SMS",
  SOCIAL_MEDIA: "Réseaux sociaux",
  FACEBOOK_ADS: "Facebook Ads",
  BILLBOARDS: "Affichage",
  EVENTS: "Événements",
  OTHER: "Autre",
};

export const CODE_TYPE_LABELS: Record<CodeType, string> = {
  USER: "Utilisateur",
  MERCHANT: "Marchand",
};

export const TARGETING_LABELS: Record<Targeting, string> = {
  ALL: "Tous",
  SEGMENT: "Segment",
  CSV: "Liste CSV",
};

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  ACQUISITION: "Acquisition",
  RETENTION: "Rétention",
};

export interface TimeWindow {
  startHour: number;
  endHour: number;
}

/** Body of POST /api/admin/promo-codes. */
export interface CreatePromoCodeInput {
  code: string;
  campaignName: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  startDate: string; // ISO date-time
  endDate: string;
  maxTotalUsages?: number | null;
  maxUsagesPerUser?: number | null;
  minOrderAmount?: number | null;
  targetZones?: string[];
  vehicleTypes?: string[];
  timeWindows?: TimeWindow[];
  userType?: UserType;
  usageNumber?: number | null;
  vertical: Vertical;
  campaignType: CampaignType;
  fundedBy: FundedBy;
  sponsorId?: string | null;
  sponsoredBudget?: number | null;
  dailySpendingLimit?: number | null;
  channel: Channel;
  codeType: CodeType;
  targeting: Targeting;
  targetUserIds?: string[];
  isPushed?: boolean;
  displayText: string;
  objective: Objective;
  isActive?: boolean;
  isScheduled?: boolean;
}

/** Promo code as returned by the list endpoint (best-effort shape, the
 * swagger doesn't document the response — extends the create input plus
 * server-managed fields). */
export interface PromoCode extends CreatePromoCodeInput {
  id: string;
  createdAt: string;
  updatedAt?: string;
  usageCount?: number;
  isActive: boolean;
  isScheduled: boolean;
}

export interface PromoCodeListQuery {
  isActive?: boolean;
  vertical?: Vertical;
  campaignType?: CampaignType;
}

export interface ValidatePromoCodeInput {
  code: string;
  orderAmount: number;
  vehicleType: ValidateVehicleType;
  pickupZone?: string;
}

export interface ValidatePromoCodeResult {
  promoCodeId: string;
  code: string;
  discountAmount: number;
  finalAmount: number;
  displayText: string;
}

/** Default values used when opening the create modal — covers every
 * required field with a sensible starting value. */
export function defaultPromoCodeInput(): CreatePromoCodeInput {
  const today = new Date();
  const inOneMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString();
  return {
    code: "",
    campaignName: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    startDate: iso(today),
    endDate: iso(inOneMonth),
    targetZones: [],
    vehicleTypes: [],
    timeWindows: [],
    userType: "ALL",
    vertical: "TRANSPORT",
    campaignType: "PERFORMANCE",
    fundedBy: "FORYOU",
    channel: "IN_APP",
    codeType: "USER",
    targeting: "ALL",
    targetUserIds: [],
    isPushed: false,
    displayText: "",
    objective: "ACQUISITION",
    isActive: true,
    isScheduled: false,
  };
}

export function discountSummary(p: Pick<PromoCode, "discountType" | "discountValue" | "maxDiscountAmount">): string {
  switch (p.discountType) {
    case "PERCENTAGE":
      return `-${p.discountValue}%${p.maxDiscountAmount ? ` (max ${p.maxDiscountAmount.toLocaleString("fr-FR")} FCFA)` : ""}`;
    case "FIXED_AMOUNT":
      return `-${p.discountValue.toLocaleString("fr-FR")} FCFA`;
    case "CASHBACK":
      return `Cashback ${p.discountValue.toLocaleString("fr-FR")} FCFA`;
    case "FREE_RIDE":
      return "Course offerte";
  }
}
