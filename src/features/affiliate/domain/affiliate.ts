/**
 * Types frontend pour le module Affiliate (influenceurs).
 * Miroir des DTOs backend — jamais de logique ici.
 *
 * Routes admin : /api/admin/affiliates/*
 */

// ─── Statuts et modes ─────────────────────────────────────────────────────────

export type AffiliateStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type AffiliateSuspensionMode = "PAUSE" | "SANCTION";

export const AFFILIATE_STATUS_LABELS: Record<string, string> = {
  ACTIVE:    "Actif",
  SUSPENDED: "Suspendu",
  CLOSED:    "Clôturé",
};

// ─── Éligibilité (pré-check avant création) ───────────────────────────────────

/**
 * Les quatre statuts d'éligibilité — l'affilié n'a pas de compte dédié :
 * l'admin ne fait que vérifier qu'un compte PASSAGER existe déjà pour ce
 * numéro avant de rattacher un profil affilié dessus.
 */
export type AffiliateEligibilityStatus =
  | "NO_ACCOUNT"
  | "NO_PASSENGER_PROFILE"
  | "ALREADY_AFFILIATE"
  | "ELIGIBLE";

export const AFFILIATE_ELIGIBILITY_LABELS: Record<AffiliateEligibilityStatus, string> = {
  NO_ACCOUNT:            "Aucun compte passager pour ce numéro — la personne doit d'abord créer son compte dans l'app.",
  NO_PASSENGER_PROFILE:  "Un compte existe pour ce numéro mais sans profil passager.",
  ALREADY_AFFILIATE:     "Ce numéro est déjà rattaché à un profil affilié.",
  ELIGIBLE:              "Éligible — le profil affilié peut être créé.",
};

export interface AffiliateEligibilityResult {
  status:      AffiliateEligibilityStatus;
  userId:      string | null;
  displayName: string | null;
}

export const SUSPENSION_MODE_LABELS: Record<AffiliateSuspensionMode, string> = {
  PAUSE:    "Pause",
  SANCTION: "Sanction",
};

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  ACCRUED:             "Accumulé",
  PARTIALLY_PAYABLE:   "Partiellement payable",
  PAYABLE:             "Payable",
  PAID:                "Payé",
  CANCELLED:           "Annulé",
};

// ─── Code promo affilié ───────────────────────────────────────────────────────

export interface AffiliatePromoCodeSummary {
  promoCodeId:             string;
  code:                    string;
  vertical:                string;
  campaignType:            string;
  discountType:            string;
  discountValue:           number;
  startDate:               string;
  endDate:                 string;
  currentUsages:           number;
  maxTotalUsages:          number | null;
  affiliateCommissionRate: number | null;
  isCurrentlyUsable:       boolean;
}

/** Code compact (utilisé dans la liste admin). */
export interface AffiliatePromoCodeCompact {
  promoCodeId:       string;
  code:              string;
  currentUsages:     number;
  isCurrentlyUsable: boolean;
}

// ─── Liste admin ──────────────────────────────────────────────────────────────

export interface AffiliateListItem {
  affiliateId:            string;
  name:                   string;
  phoneNumber:            string;
  socialNetwork:          string;
  audienceSize:           number | null;
  status:                 string;
  commissionRate:         number | null;
  effectiveCommissionRate: number;
  totalPayable:           number;
  totalPaid:              number;
  outstandingPayable:     number;
  codes:                  AffiliatePromoCodeCompact[];
  createdAt:              string;
}

// ─── Relevé de commissions ────────────────────────────────────────────────────

export interface AffiliateStatementLine {
  commissionId:             string;
  sourceType:               string;
  sourceId:                 string;
  amount:                   number;
  payableAmount:            number;
  paidAmount:               number;
  outstandingPayableAmount: number;
  appliedRate:              number;
  rateSource:               string;
  status:                   string;
  accruedAt:                string;
  paidAt:                   string | null;
  lastPayoutRef:            string | null;
  held:                     boolean;
}

export interface AffiliateStatementByStatus {
  status:             string;
  count:              number;
  totalAmount:        number;
  totalPayableAmount: number;
  totalPaidAmount:    number;
}

export interface AffiliateStatementWalletBalance {
  main:     number;
  bonus:    number;
  referral: number;
  total:    number;
}

export interface AffiliateStatement {
  affiliateId:     string;
  byStatus:        AffiliateStatementByStatus[];
  totals: {
    totalAccrued:       number;
    totalPayable:       number;
    totalPaid:          number;
    outstandingPayable: number;
    totalCancelled:     number;
    heldOutstanding:    number;
  };
  minPayoutAmount: number;
  walletBalance:   AffiliateStatementWalletBalance | null;
  lines:           AffiliateStatementLine[];
  pagination: {
    total:  number;
    limit:  number;
    offset: number;
  };
}

// ─── Détail admin ─────────────────────────────────────────────────────────────

export interface AffiliateDetail {
  affiliateId:      string;
  name:             string;
  phoneNumber:      string;
  socialNetwork:    string;
  audienceSize:     number | null;
  status:           string;
  commissionRate:   number | null;
  suspensionMode:   AffiliateSuspensionMode | null;
  suspensionReason: string | null;
  createdAt:        string;
  codes:            AffiliatePromoCodeSummary[];
  statement:        AffiliateStatement;
}

// ─── Configuration globale ────────────────────────────────────────────────────

export interface AffiliateConfig {
  defaultCommissionRate: number;
  minPayoutAmount:       number;
  updatedBy:             string;
  updatedAt:             string;
}

// ─── Commission (détail admin) ────────────────────────────────────────────────

export interface AffiliateCommissionDetail {
  commissionId:       string;
  affiliateId:        string;
  promoCodeId:        string;
  userId:             string;
  sourceType:         string;
  sourceId:           string;
  platformCommission: number;
  appliedRate:        number;
  rateSource:         string;
  amount:             number;
  /** Plafond de marge en force à la création — null si aucun (base PLATFORM_MARGIN, ou code en dérogation). */
  maxAllowedAmount:   number | null;
  /** `amount` AVANT écrêtage — égal à `amount` si aucun plafond n'a mordu. */
  rawAmount:          number | null;
  /** true si `maxAllowedAmount` a réellement réduit `amount`. */
  wasCapped:          boolean;
  /** FCFA entiers, 0 quand `wasCapped` est false. */
  cappingShortfall:   number;
  /** Pourquoi `amount` vaut 0, dérivé jamais stocké. NEGATIVE_MARGIN : ForYou a absorbé une
   * remise supérieure à sa marge. ZERO_RATE : filet de sécurité pour une commission
   * historique. null dès que amount > 0. */
  zeroAmountReason:   "NEGATIVE_MARGIN" | "ZERO_RATE" | null;
  cashPortionAmount:  number;
  payableAmount:      number;
  paidAmount:         number;
  paidAt:             string | null;
  lastPayoutRef:      string | null;
  status:             string;
  accruedAt:          string;
  held:               boolean;
  heldAt:             string | null;
  holdReason:         string | null;
  heldBy:             string | null;
  cancelledAt:        string | null;
  cancelReason:       string | null;
  cancelledBy:        string | null;
}

// ─── Usages écartés (aucune commission générée) ───────────────────────────────

/**
 * Les neuf motifs pour lesquels un usage de code promo affilié n'a produit
 * AUCUNE commission. Avant ce chantier, ces cas n'existaient que dans les
 * logs serveur — c'est la réponse directe à « pourquoi mon influenceur n'a
 * rien touché sur cette course ».
 */
export type AffiliateCommissionSkipReason =
  | "PROFILE_NOT_FOUND"
  | "PROFILE_SUSPENDED"
  | "PROFILE_CLOSED"
  | "SELF_REFERRAL"
  | "PROFILE_SANCTIONED"
  | "ZERO_RATE"
  | "GROSS_AMOUNT_WITHOUT_BASE"
  | "NET_AMOUNT_WITHOUT_BASE"
  | "NET_AMOUNT_EXHAUSTED";

export const AFFILIATE_COMMISSION_SKIP_LABELS: Record<AffiliateCommissionSkipReason, string> = {
  PROFILE_NOT_FOUND:          "Profil affilié introuvable",
  PROFILE_SUSPENDED:          "Profil suspendu",
  PROFILE_CLOSED:             "Partenariat clôturé à cette date",
  SELF_REFERRAL:              "Auto-référencement (l'affilié a utilisé son propre code)",
  PROFILE_SANCTIONED:         "Usage antérieur à la levée d'une sanction",
  ZERO_RATE:                  "Taux résolu à 0 (commission historique)",
  GROSS_AMOUNT_WITHOUT_BASE:  "Assiette manquante (prix affiché jamais transmis — anomalie de câblage)",
  NET_AMOUNT_WITHOUT_BASE:    "Assiette manquante (montant payé jamais transmis — anomalie de câblage)",
  NET_AMOUNT_EXHAUSTED:       "Montant payé nul (remise totale — net légitimement épuisé)",
};

/** true = anomalie technique à corriger côté backend, jamais un comportement métier normal. */
export const AFFILIATE_COMMISSION_SKIP_IS_WIRING_BUG: Record<AffiliateCommissionSkipReason, boolean> = {
  PROFILE_NOT_FOUND:         false,
  PROFILE_SUSPENDED:         false,
  PROFILE_CLOSED:            false,
  SELF_REFERRAL:             false,
  PROFILE_SANCTIONED:        false,
  ZERO_RATE:                 false,
  GROSS_AMOUNT_WITHOUT_BASE: true,
  NET_AMOUNT_WITHOUT_BASE:   true,
  NET_AMOUNT_EXHAUSTED:      false,
};

export interface AffiliateCommissionSkipItem {
  skipId:               string;
  affiliateId:          string;
  promoCodeId:           string;
  userId:               string;
  sourceType:            string;
  sourceId:              string;
  vertical:              string;
  reason:                AffiliateCommissionSkipReason;
  /** Commission plateforme au moment de l'usage. */
  platformCommission:    number;
  /** Ce qu'aurait été la commission si ce blocage n'existait pas. null pour ZERO_RATE,
   * GROSS_AMOUNT_WITHOUT_BASE, NET_AMOUNT_WITHOUT_BASE et NET_AMOUNT_EXHAUSTED. */
  potentialAmount:       number | null;
  maxAllowedAmount:      number | null;
  rawAmount:             number | null;
  wasCapped:             boolean;
  cappingShortfall:      number;
  appliedAt:             string;
  recordedAt:            string;
  /** Non nul si l'usage a fini par produire une vraie commission (régularisation). */
  resolvedAt:            string | null;
  resolvedCommissionId:  string | null;
}

export interface AffiliateCommissionSkipsResult {
  items: AffiliateCommissionSkipItem[];
  pagination: {
    total:  number;
    limit:  number;
    offset: number;
  };
}

export interface AffiliateCommissionSkipsFilters {
  affiliateId?: string;
  reason?:      AffiliateCommissionSkipReason;
  /** Absent (défaut) = non résolues uniquement. */
  resolved?:    boolean;
  from?:        string;
  to?:          string;
  limit?:       number;
  offset?:      number;
}
