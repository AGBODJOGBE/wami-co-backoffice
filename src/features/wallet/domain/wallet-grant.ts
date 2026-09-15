/**
 * Types frontend pour le WalletGrantCampaign (crédits en masse — maker/checker).
 * Routes : /api/admin/wallet/grants/*
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type GrantAudience = "DRIVER" | "PASSENGER";
export type GrantTargetingMode = "EXPLICIT" | "FILTER";
export type GrantBalanceType = "MAIN" | "BONUS" | "REFERRAL";

export type WalletGrantCampaignStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "COMPLETED"
  | "PARTIALLY_FAILED"
  | "REJECTED"
  | "CANCELLED";

export const GRANT_STATUS_LABELS: Record<WalletGrantCampaignStatus, string> = {
  PENDING_APPROVAL: "En attente",
  APPROVED:         "Approuvée",
  COMPLETED:        "Complétée",
  PARTIALLY_FAILED: "Partiellement échouée",
  REJECTED:         "Rejetée",
  CANCELLED:        "Annulée",
};

export const GRANT_AUDIENCE_LABELS: Record<GrantAudience, string> = {
  DRIVER:    "Chauffeurs",
  PASSENGER: "Passagers",
};

export const GRANT_BALANCE_LABELS: Record<GrantBalanceType, string> = {
  MAIN:     "Principal",
  BONUS:    "Bonus",
  REFERRAL: "Parrainage",
};

// ─── Targeting ────────────────────────────────────────────────────────────────

export interface GrantTargeting {
  mode:            GrantTargetingMode;
  beneficiaryIds?: string[];
  filters?:        Record<string, unknown>;
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export interface GrantCapViolation {
  cap:    "maxPerBeneficiary" | "maxTotal" | "maxBeneficiaries";
  limit:  number;
  actual: number;
}

export interface GrantPreviewBeneficiary {
  beneficiaryId: string;
  walletId:      string;
  amount:        number;
  mainBalance:   number;
}

export interface WalletGrantPreview {
  beneficiaryCount:         number;
  totalAmount:              number;
  unknownIds:               string[];
  beneficiariesInOverdraft: number;
  amountAbsorbedByDebt:     number;
  sample:                   GrantPreviewBeneficiary[];
  capViolations:            GrantCapViolation[];
  notes:                    string[];
}

// ─── Liste ────────────────────────────────────────────────────────────────────

export interface WalletGrantCampaignListItem {
  campaignId:           string;
  audience:             GrantAudience;
  label:                string;
  balanceType:          GrantBalanceType;
  amountPerBeneficiary: number;
  beneficiaryCount:     number;
  totalAmount:          number;
  status:               WalletGrantCampaignStatus;
  createdBy:            string;
  createdAt:            string;
  approvedBy:           string | null;
  creditedCount:        number;
  failedCount:          number;
}

export interface WalletGrantCampaignsResult {
  campaigns: WalletGrantCampaignListItem[];
  total:     number;
  page:      number;
  limit:     number;
}

// ─── Détail ───────────────────────────────────────────────────────────────────

export interface WalletGrantCampaignLine {
  beneficiaryId: string;
  walletId:      string;
  amount:        number;
  status:        string;
  transactionId: string | null;
  failureReason: string | null;
  creditedAt:    string | null;
}

export interface WalletGrantCampaignDetail {
  campaignId:           string;
  audience:             GrantAudience;
  label:                string;
  balanceType:          GrantBalanceType;
  amountPerBeneficiary: number;
  expiresAt:            string | null;
  targeting:            GrantTargeting;
  beneficiaryCount:     number;
  totalAmount:          number;
  status:               WalletGrantCampaignStatus;
  createdBy:            string;
  createdAt:            string;
  approvedBy:           string | null;
  approvedAt:           string | null;
  rejectedBy:           string | null;
  rejectedAt:           string | null;
  rejectionReason:      string | null;
  executedAt:           string | null;
  creditedCount:        number;
  failedCount:          number;
  lines:                WalletGrantCampaignLine[];
}
