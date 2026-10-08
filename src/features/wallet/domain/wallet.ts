/**
 * Admin wallets. Mirrors:
 *   GET /api/admin/wallets/{walletId}
 *   GET /api/admin/wallets             (list)
 *   GET /api/admin/withdrawals         (withdrawal requests)
 *   GET /api/admin/transactions        (all transactions)
 *   GET /api/admin/platform/revenue    (platform revenue breakdown)
 */

// ─── Wallet ───────────────────────────────────────────────────────────────────

export type WalletType = "PAYMENT" | "EARNINGS" | "PLATFORM" | "PARTNER";

export interface AdminWallet {
  walletId: string;
  profileId: string;
  walletType: WalletType;
  mainBalance: number;
  bonusBalance: number;
  referralBalance: number;
  totalBalance: number;
  status: string;
  ownerName: string;
  ownerPhone: string;
  createdAt: string;
  /** Verrou ADMIN sur les retraits uniquement — crédits et autres débits continuent normalement. */
  withdrawalsBlocked: boolean;
  withdrawalsBlockedReason: string | null;
  withdrawalsBlockedAt: string | null;
  withdrawalsBlockedBy: string | null;
}

/** Réponse identique pour block et unblock. */
export interface WalletWithdrawalLockResult {
  walletId: string;
  withdrawalsBlocked: boolean;
  withdrawalsBlockedReason: string | null;
  withdrawalsBlockedAt: string | null;
  withdrawalsBlockedBy: string | null;
}

export interface AdminWalletsResult {
  wallets: AdminWallet[];
  total: number;
}

export const WALLET_TYPE_META: Record<WalletType, { label: string; tone: "primary" | "success" | "info" | "neutral" | "warning" }> = {
  PAYMENT:  { label: "Paiement (passager)", tone: "primary"  },
  EARNINGS: { label: "Gains (driver)",      tone: "success"  },
  PLATFORM: { label: "Plateforme",          tone: "info"     },
  PARTNER:  { label: "Partenaire",          tone: "warning"  },
};

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionType =
  // Recharges
  | "RECHARGE"
  | "PREPAID_RECHARGE"
  // Rides
  | "RIDE_PAYMENT"
  | "RIDE_EARNINGS"
  | "COMMISSION"
  | "COMMISSION_REVENUE"
  // Livraison B2B
  | "DELIVERY_PAYMENT"
  | "DELIVERY_COMMISSION"
  | "B2B_DELIVERY_REVENUE"
  // Abonnements livraison B2B
  | "SUBSCRIPTION_PAYMENT"
  | "SUBSCRIPTION_REVENUE"
  // Livraison B2C
  | "B2C_PAYMENT"
  | "B2C_EARNINGS"
  | "B2C_COMMISSION"
  | "B2C_COMMISSION_REVENUE"
  // Contrats location-vente
  | "CONTRACT_INSTALLMENT"
  | "CONTRACT_INSTALLMENT_REVENUE"
  | "CONTRACT_INSTALLMENT_MANUAL_PAYMENT"
  | "CONTRACT_REVENUE_RETROACTIVE_REVERSAL"
  | "CONTRACT_REVENUE_SHARE"
  // Véhicule
  | "VEHICLE_RENTAL"
  | "VEHICLE_RENTAL_REVENUE"
  // Retraits
  | "WITHDRAWAL"
  // Bonus & récompenses
  | "BONUS_CREDIT"
  | "REFERRAL_REWARD"
  | "MILESTONE_BONUS"
  | "ACTIVITY_BONUS"
  | "QUALITY_BONUS"
  | "BONUS_EXPIRY"
  | "WELCOME_BONUS"
  // Corrections admin
  | "REFUND"
  | "ADJUSTMENT"
  // Consolidation
  | "BALANCE_CONSOLIDATION"
  | "CONSOLIDATION_CREDIT"
  | "CONSOLIDATION_FEE_REVENUE"
  // P2P
  | "P2P_TRANSFER_SENT"
  | "P2P_TRANSFER_RECEIVED"
  | "P2P_FEE_REVENUE"
  // Annulations
  | "CANCELLATION_FEE"
  | "CANCELLATION_INDEMNITY"
  | "CANCELLATION_INDEMNITY_ADVANCE"
  // Recouvrement dettes
  | "DEBT_COLLECTION"
  | "CASH_COMMISSION_DEBT"
  | "CASH_COMMISSION_REVENUE"
  // Fallback
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "CREDIT"
  | "DEBIT";

export interface AdminTransaction {
  transactionId: string;
  walletId: string;
  ownerName: string;
  ownerPhone: string;
  walletType: WalletType;
  type: TransactionType;
  direction: "CREDIT" | "DEBIT";
  balanceType: "MAIN" | "BONUS" | "REFERRAL";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  description: string;
  status: string;
  metadata: unknown;
  processedAt: string | null;
  createdAt: string;
}

export interface AdminTransactionsResult {
  transactions: AdminTransaction[];
  total: number;
  page: number;
  limit: number;
}

export const TRANSACTION_TYPE_META: Record<
  TransactionType,
  { label: string; tone: "success" | "danger" | "warning" | "primary" | "info" | "neutral"; group: string }
> = {
  // Recharges
  RECHARGE:                              { label: "Dépôt Mobile Money",              tone: "success",  group: "Dépôts"          },
  PREPAID_RECHARGE:                      { label: "Dépôt partenaire",                tone: "success",  group: "Dépôts"          },
  // Courses VTC
  RIDE_PAYMENT:                          { label: "Paiement course",                 tone: "danger",   group: "Courses"         },
  RIDE_EARNINGS:                         { label: "Gains course",                    tone: "success",  group: "Courses"         },
  COMMISSION:                            { label: "Commission ForYou",               tone: "warning",  group: "Courses"         },
  COMMISSION_REVENUE:                    { label: "Revenu commission VTC",           tone: "primary",  group: "Courses"         },
  // Livraison B2B
  DELIVERY_PAYMENT:                      { label: "Paiement livraison B2B",          tone: "danger",   group: "Livraison B2B"   },
  DELIVERY_COMMISSION:                   { label: "Commission livraison",            tone: "warning",  group: "Livraison B2B"   },
  B2B_DELIVERY_REVENUE:                  { label: "Revenu livraison B2B",            tone: "primary",  group: "Livraison B2B"   },
  // Abonnements livraison B2B
  SUBSCRIPTION_PAYMENT:                  { label: "Paiement abonnement",             tone: "danger",   group: "Livraison B2B"   },
  SUBSCRIPTION_REVENUE:                  { label: "Revenu abonnement",               tone: "primary",  group: "Livraison B2B"   },
  // Livraison B2C
  B2C_PAYMENT:                           { label: "Paiement livraison B2C",          tone: "danger",   group: "Livraison B2C"   },
  B2C_EARNINGS:                          { label: "Gains livraison B2C",             tone: "success",  group: "Livraison B2C"   },
  B2C_COMMISSION:                        { label: "Commission B2C",                  tone: "warning",  group: "Livraison B2C"   },
  B2C_COMMISSION_REVENUE:                { label: "Revenu commission B2C",           tone: "primary",  group: "Livraison B2C"   },
  // Contrats location-vente
  CONTRACT_INSTALLMENT:                  { label: "Échéance contrat",                tone: "danger",   group: "Contrats"        },
  CONTRACT_INSTALLMENT_REVENUE:          { label: "Revenu échéance contrat",         tone: "primary",  group: "Contrats"        },
  CONTRACT_INSTALLMENT_MANUAL_PAYMENT:   { label: "Paiement manuel contrat",         tone: "info",     group: "Contrats"        },
  CONTRACT_REVENUE_RETROACTIVE_REVERSAL: { label: "Annulation revenu rétroactif",    tone: "warning",  group: "Contrats"        },
  CONTRACT_REVENUE_SHARE:                { label: "Prélèvement contrat (revenu)",    tone: "danger",   group: "Contrats"        },
  // Véhicule
  VEHICLE_RENTAL:                        { label: "Location véhicule",               tone: "danger",   group: "Véhicule"        },
  VEHICLE_RENTAL_REVENUE:                { label: "Revenu location véhicule",        tone: "primary",  group: "Véhicule"        },
  // Retraits
  WITHDRAWAL:                            { label: "Retrait",                         tone: "danger",   group: "Retraits"        },
  // Bonus & récompenses
  BONUS_CREDIT:                          { label: "Bonus promotionnel",              tone: "success",  group: "Bonus"           },
  REFERRAL_REWARD:                       { label: "Récompense parrainage",           tone: "success",  group: "Bonus"           },
  MILESTONE_BONUS:                       { label: "Bonus palier courses",            tone: "success",  group: "Bonus"           },
  ACTIVITY_BONUS:                        { label: "Bonus activité (4U V3)",          tone: "success",  group: "Bonus"           },
  QUALITY_BONUS:                         { label: "Bonus qualité (4U V3)",           tone: "success",  group: "Bonus"           },
  BONUS_EXPIRY:                          { label: "Expiration bonus",                tone: "neutral",  group: "Bonus"           },
  WELCOME_BONUS:                         { label: "Bonus de bienvenue",              tone: "success",  group: "Bonus"           },
  // Corrections
  REFUND:                                { label: "Remboursement",                   tone: "success",  group: "Admin"           },
  ADJUSTMENT:                            { label: "Ajustement",                      tone: "info",     group: "Admin"           },
  ADMIN_CREDIT:                          { label: "Crédit admin",                    tone: "info",     group: "Admin"           },
  ADMIN_DEBIT:                           { label: "Débit admin",                     tone: "danger",   group: "Admin"           },
  CREDIT:                                { label: "Crédit",                          tone: "success",  group: "Admin"           },
  DEBIT:                                 { label: "Débit",                           tone: "danger",   group: "Admin"           },
  // Consolidation
  BALANCE_CONSOLIDATION:                 { label: "Consolidation (source)",          tone: "neutral",  group: "Consolidation"   },
  CONSOLIDATION_CREDIT:                  { label: "Consolidation (destination)",     tone: "success",  group: "Consolidation"   },
  CONSOLIDATION_FEE_REVENUE:             { label: "Frais consolidation",             tone: "primary",  group: "Consolidation"   },
  // P2P
  P2P_TRANSFER_SENT:                     { label: "Transfert P2P (envoi)",           tone: "danger",   group: "P2P"             },
  P2P_TRANSFER_RECEIVED:                 { label: "Transfert P2P (reçu)",            tone: "success",  group: "P2P"             },
  P2P_FEE_REVENUE:                       { label: "Frais transfert P2P",             tone: "primary",  group: "P2P"             },
  // Annulations
  CANCELLATION_FEE:                      { label: "Frais d'annulation",              tone: "danger",   group: "Annulations"     },
  CANCELLATION_INDEMNITY:                { label: "Indemnité annulation",            tone: "success",  group: "Annulations"     },
  CANCELLATION_INDEMNITY_ADVANCE:        { label: "Avance indemnité (ForYou)",       tone: "warning",  group: "Annulations"     },
  // Recouvrement dettes
  DEBT_COLLECTION:                       { label: "Recouvrement dette passager",     tone: "warning",  group: "Recouvrement"    },
  CASH_COMMISSION_DEBT:                  { label: "Créance commission cash",         tone: "danger",   group: "Recouvrement"    },
  CASH_COMMISSION_REVENUE:               { label: "Recouvrement commission cash",    tone: "primary",  group: "Recouvrement"    },
};

// ─── Withdrawal ───────────────────────────────────────────────────────────────

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
export type WithdrawalMethod = "MOBILE_MONEY" | "BANK_TRANSFER" | string;

/** Sous-solde débité par le retrait. MAIN pour driver/partenaire (EARNINGS/PARTNER) ;
 * AFFILIATE pour un passager qui retire ses commissions d'affiliation sur son
 * wallet PAYMENT — le seul sous-solde retirable sur ce type de wallet. */
export type WithdrawalSourceBalance = "MAIN" | "AFFILIATE" | string;

export const WITHDRAWAL_SOURCE_BALANCE_LABELS: Record<string, string> = {
  MAIN:      "Solde principal",
  AFFILIATE: "Commissions affilié",
};

export interface Withdrawal {
  withdrawalId: string;
  walletId: string;
  ownerName?: string;
  ownerPhone?: string;
  walletType?: WalletType | string;
  amount: number;
  method: WithdrawalMethod;
  recipientDetails: {
    phone?: string;
    iban?: string;
    bankName?: string;
    accountName?: string;
  };
  status: WithdrawalStatus | string;
  reference: string | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
  /** MAIN (driver/partenaire) ou AFFILIATE (passager — commissions d'affiliation). */
  sourceBalance?: WithdrawalSourceBalance;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  /** @deprecated Use createdAt */
  requestedAt?: string;
}

export interface WithdrawalsResult {
  withdrawals: Withdrawal[];
  total: number;
  page: number;
  limit: number;
}

export const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING:   "En attente",
  APPROVED:  "Approuvé",
  REJECTED:  "Rejeté",
  COMPLETED: "Complété",
};

export const WITHDRAWAL_METHOD_LABELS: Record<string, string> = {
  MOBILE_MONEY:  "Mobile Money",
  BANK_TRANSFER: "Virement bancaire",
};

// ─── Platform revenue ─────────────────────────────────────────────────────────

export interface PlatformRevenueBreakdownItem {
  source: string;
  label: string;
  total: number;
}

export type PlatformOutflowCategory =
  | "DEFINITIVE_EXPENSE"
  | "REVENUE_CORRECTION"
  | "RECOVERABLE_ADVANCE";

export interface PlatformOutflowBreakdownItem {
  source: string;
  label: string;
  category: PlatformOutflowCategory;
  total: number;
}

export interface PlatformOutflowCategoryTotal {
  category: PlatformOutflowCategory;
  total: number;
}

export interface PlatformOutflowSummary {
  breakdown: PlatformOutflowBreakdownItem[];
  totalsByCategory: PlatformOutflowCategoryTotal[];
  total: number;
}

export const OUTFLOW_CATEGORY_LABELS: Record<PlatformOutflowCategory, string> = {
  DEFINITIVE_EXPENSE:  "Dépenses définitives",
  REVENUE_CORRECTION:  "Corrections de revenus",
  RECOVERABLE_ADVANCE: "Avances récupérables",
};

export interface PlatformRevenue {
  walletId: string;
  balance: number;
  period: { from: string | null; to: string | null };
  breakdown: PlatformRevenueBreakdownItem[];
  totalRevenue: number;
  /** Toutes les sorties du wallet PLATFORM (Lot F dashboard). Absent sur les anciens payloads. */
  outflows?: PlatformOutflowSummary;
  /** totalRevenue − DEFINITIVE_EXPENSE. Absent sur les anciens payloads. */
  netResult?: number;
}
