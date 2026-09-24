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

/**
 * Base de calcul de la commission de l'influenceur sur ce code. Portée par
 * le code lui-même — ne cascade jamais vers le profil affilié ou la config
 * globale, contrairement à `affiliateCommissionRate`.
 */
export type CommissionBase = "PLATFORM_MARGIN" | "GROSS_AMOUNT" | "NET_AMOUNT";

export const COMMISSION_BASE_LABELS: Record<CommissionBase, string> = {
  PLATFORM_MARGIN: "Marge ForYou (historique)",
  GROSS_AMOUNT: "Prix affiché (avant remise)",
  NET_AMOUNT: "Montant payé (après remise)",
};

export const COMMISSION_BASE_DESCRIPTIONS: Record<CommissionBase, string> = {
  PLATFORM_MARGIN:
    "% du gain de ForYou sur la course — structurellement borné, ForYou ne peut jamais y perdre. C'est ce qui donne 0 FCFA quand la marge est nulle.",
  GROSS_AMOUNT:
    "% du prix affiché avant remise — l'influenceur est payé même quand la marge de ForYou est nulle ou négative.",
  NET_AMOUNT:
    "% du montant réellement payé par le client après remise — toujours ≤ ce que GROSS_AMOUNT donnerait. Sur une course offerte (remise totale), la commission est honnêtement 0.",
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
  /** Rattache directement le code à un influenceur dès la création (niveau
   * 1 de la cascade de taux). Aucune vérification que l'id référence un
   * profil affilié existant. */
  affiliateId?: string | null;
  /** Taux négocié pour CE code (0-100). Ignoré si affiliateId est absent. */
  affiliateCommissionRate?: number | null;
  /** Base de calcul de la commission affiliée. Défaut serveur : PLATFORM_MARGIN. */
  commissionBase?: CommissionBase;
  /** Dérogation budgétée EXPLICITE : ForYou accepte de perdre de l'argent
   * sur ce code (remise non plafonnée par sa marge, commission versée
   * intégralement) jusqu'à épuisement de `sponsoredBudget`, qui devient
   * alors OBLIGATOIRE. Requiert la permission `promo.manage-budgeted`. */
  budgetedLossCampaign?: boolean;
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
  /** Ce que la campagne a RÉELLEMENT coûté à ForYou jusqu'ici, en FCFA
   * entiers : remise absorbée au-delà de la marge + commission affiliée
   * versée. Tenu par le système, jamais accepté en entrée. Vaut toujours 0
   * pour un code qui n'est pas une campagne à perte budgétée. C'est ce
   * compteur, comparé à `sponsoredBudget`, qui arrête la campagne. */
  realCostAccrued?: number;
}

/** Réponse de PATCH /api/admin/promo-codes/{id}/affiliate. */
export interface SetPromoCodeAffiliateResult {
  promoCodeId: string;
  affiliateId: string | null;
  affiliateCommissionRate: number | null;
}

/** Réponse RÉELLE de POST /api/admin/promo-codes — pas un `PromoCode`
 * complet (contrairement à ce qu'un appelant naïf pourrait supposer). */
export interface CreatePromoCodeResult {
  promoCodeId: string;
  /** Avertissement(s) non bloquant(s) — chiffrage d'une perte assumée sous
   * dérogation, coût par course non borné, budget minimum suggéré. Plusieurs
   * avertissements sont joints par une ligne vide. À afficher à l'admin. */
  warning?: string | null;
  /** Montant de commande suggéré à partir duquel une remise FIXED_AMOUNT/
   * CASHBACK ne dépasse plus la marge. Indicatif, jamais appliqué. */
  suggestedMinOrderAmount?: number | null;
  /** Budget total minimum suggéré pour une campagne à perte budgétée dont
   * le nombre d'usages est plafonné. Indicatif, jamais un plafond. */
  suggestedMinBudget?: number | null;
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
    affiliateId: null,
    affiliateCommissionRate: null,
    commissionBase: "PLATFORM_MARGIN",
    budgetedLossCampaign: false,
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
