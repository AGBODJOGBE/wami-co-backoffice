/**
 * Types frontend pour le module Affiliate (influenceurs).
 * Miroir des DTOs backend — jamais de logique ici.
 *
 * Routes admin : /api/admin/affiliates/*
 */

// ─── Statuts et modes ─────────────────────────────────────────────────────────

export type AffiliateStatus = "ACTIVE" | "SUSPENDED";
export type AffiliateSuspensionMode = "PAUSE" | "SANCTION";

export const AFFILIATE_STATUS_LABELS: Record<string, string> = {
  ACTIVE:    "Actif",
  SUSPENDED: "Suspendu",
};

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
