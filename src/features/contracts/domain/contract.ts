// ─── Contract statuses ────────────────────────────────────────────────────────

export type ContractStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "COMPLETED"
  | "BROKEN"
  | "TERMINATED";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING:    "En attente",
  ACTIVE:     "Actif",
  SUSPENDED:  "Suspendu",
  COMPLETED:  "Soldé",
  BROKEN:     "Résilié",
  TERMINATED: "Terminé",
};

export const CONTRACT_STATUS_TONES: Record<
  ContractStatus,
  "neutral" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  PENDING:    "warning",
  ACTIVE:     "success",
  SUSPENDED:  "danger",
  COMPLETED:  "info",
  BROKEN:     "danger",
  TERMINATED: "neutral",
};

// ─── Installment ──────────────────────────────────────────────────────────────

/**
 * Statuts retournés par le backend (champ statut).
 *
 * Cash-basis (Lot D) :
 *   EN_RECOUVREMENT      — imputation faite (wallet débité, possiblement en découvert),
 *                          aucun cash encaissé côté PLATFORM encore.
 *   PARTIELLEMENT_RECOUVREE — partiellement imputée OU imputée mais cash partiel.
 *   PAYEE                — imputée ET entièrement encaissée en cash.
 *
 * Legacy (conservé pour compatibilité données historiques) :
 *   PARTIELLE            — ancien nom de PARTIELLEMENT_RECOUVREE (pré-Lot D).
 */
export type InstallmentStatus =
  | "EN_ATTENTE"
  | "EN_RECOUVREMENT"
  | "PARTIELLEMENT_RECOUVREE"
  | "PAYEE"
  | "IMPAYEE"
  | "ANNULEE"
  | "PARTIELLE"; // legacy — traité comme PARTIELLEMENT_RECOUVREE

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  EN_ATTENTE:             "À payer",
  EN_RECOUVREMENT:        "En recouvrement",
  PARTIELLEMENT_RECOUVREE:"Partielle",
  PAYEE:                  "Payée",
  IMPAYEE:                "Impayée",
  ANNULEE:                "Annulée",
  PARTIELLE:              "Partielle",
};

export const INSTALLMENT_STATUS_TONES: Record<
  InstallmentStatus,
  "neutral" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  EN_ATTENTE:             "neutral",
  EN_RECOUVREMENT:        "info",
  PARTIELLEMENT_RECOUVREE:"warning",
  PAYEE:                  "success",
  IMPAYEE:                "danger",
  ANNULEE:                "neutral",
  PARTIELLE:              "warning",
};

/** Retourne true si le statut est "partiellement réglé" (nouveau ou legacy). */
export function isPartialStatus(status: InstallmentStatus): boolean {
  return status === "PARTIELLEMENT_RECOUVREE" || status === "PARTIELLE";
}

/** Retourne true si le statut indique une imputation faite (wallet débité). */
export function isImputedStatus(status: InstallmentStatus): boolean {
  return (
    status === "EN_RECOUVREMENT" ||
    status === "PARTIELLEMENT_RECOUVREE" ||
    status === "PAYEE" ||
    status === "PARTIELLE"
  );
}

export interface ContractInstallment {
  installmentId: string; // mapped from API `id`
  contractId?: string;
  numero: number;
  montant: number;
  montantPaye?: number;
  montantRestant?: number;
  /** Portion de l'échéance effectivement encaissée en cash (cash-basis, Lot D). */
  montantRecouvre?: number;
  dateEcheance: string;
  datePaiement: string | null;
  status: InstallmentStatus; // mapped from API `statut`
  retardJours?: number;
  penalite?: number;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export interface ContractVehicle {
  vehicleId: string;
  make?: string;
  model?: string;
  licensePlate?: string;
  vehicleType?: string;
}

export interface ContractDriver {
  driverId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface Contract {
  contractId: string;
  status: ContractStatus;
  driver: ContractDriver;
  vehicle: ContractVehicle;
  dateDebut: string;
  dateFin?: string | null;
  dureeMois: number;
  prixAchat?: number;
  montantTotal: number;
  apport: number;
  tauxInteret: number;
  frequencePaiement: PaymentFrequency;
  montantMensuel?: number;
  montantPaye?: number;
  montantRestant?: number;
  echeancesTotal?: number;
  echeancesPayees?: number;
  montantCaution?: number;
  cautionRestituee?: boolean;
  /** Nombre d'échéances passées en statut IMPAYEE. */
  nbImpayes?: number;
  /**
   * Cash-basis (Lot D) — montant imputé mais pas encore encaissé côté PLATFORM.
   * > 0 signifie qu'une partie de la dette a été réglée via découvert wallet,
   * le recouvrement cash est progressif.
   */
  montantNonReconnu?: number;
  /**
   * Cash-basis (Lot D) — montant effectivement encaissé en cash par PLATFORM
   * (= montantPaye − montantNonReconnu).
   */
  montantRecouvre?: number;
  /**
   * Cash-basis (Lot D) — montant total restant à recouvrer
   * (= montantRestant + montantNonReconnu).
   * Calculé par le backend au moment du GET.
   */
  resteARecouvrer?: number;
  createdAt: string;
  updatedAt: string;
  breakReason?: string | null;
  /** ECHEANCIER (par défaut) ou PAR_REVENU (prélèvement % sur chaque course/livraison). */
  modeRemboursement: ModeRemboursement;
  /** Fraction 0–1 (0.5 = 50%). Non-null uniquement si modeRemboursement = PAR_REVENU. */
  tauxPrelevementRevenu: number | null;
  /** Date de bascule ECHEANCIER → PAR_REVENU, ou null si jamais basculé. */
  dateBasculePrelevement: string | null;
  /** Présent UNIQUEMENT sur GET /:id (jamais sur la liste) et seulement pour un contrat PAR_REVENU. */
  revenueShareSummary?: RevenueShareSummary;
}

// ─── Revenue share (remboursement par prélèvement sur revenus) ───────────────

/** Valeurs acceptées par le backend (champ modeRemboursement). */
export type ModeRemboursement = "ECHEANCIER" | "PAR_REVENU";

export const MODE_REMBOURSEMENT_LABELS: Record<ModeRemboursement, string> = {
  ECHEANCIER: "Échéancier",
  PAR_REVENU: "Prélèvement sur revenus",
};

export type RevenueShareAlertReason = "DEBT_THRESHOLD_EXCEEDED" | "INACTIVITY";

export const REVENUE_SHARE_ALERT_REASON_LABELS: Record<RevenueShareAlertReason, string> = {
  DEBT_THRESHOLD_EXCEEDED: "Dette non recouvrée au-delà du seuil",
  INACTIVITY: "Aucun prélèvement récent (chauffeur inactif)",
};

export interface RevenueShareSummary {
  /** FCFA — cumul prélevé depuis la bascule/création du contrat. */
  cumulPreleve: number;
  dernierPrelevement: string | null;
  alertReasons: RevenueShareAlertReason[];
}

/** Item de GET /api/admin/contracts/revenue-share/alerts — PAS de nom de chauffeur (driverId seul). */
export interface RevenueShareAlertItem {
  contractId: string;
  driverId: string;
  montantNonReconnu: number;
  montantRestant: number;
  lastWithholdingDate: string | null;
  reasons: RevenueShareAlertReason[];
}

export interface RevenueShareAlertsResult {
  items: RevenueShareAlertItem[];
  total: number;
  page: number;
  limit: number;
}

/** Source d'un prélèvement — course, livraison, bonus, etc. (jamais remboursement/ajustement/P2P). */
export type RevenueShareSourceType =
  | "RIDE"
  | "RIDE_PICKUP"
  | "B2C_DELIVERY"
  | "WELCOME_BONUS"
  | "MILESTONE_BONUS"
  | "ACTIVITY_BONUS"
  | "QUALITY_BONUS"
  | "REFERRAL_REWARD"
  | "SCHEDULED_RIDE_DRIVER_BOOKING_BONUS"
  | "CANCELLATION_INDEMNITY"
  | "WALLET_GRANT"
  | string;

export const REVENUE_SHARE_SOURCE_LABELS: Record<string, string> = {
  RIDE: "Course VTC",
  RIDE_PICKUP: "Course Pickup",
  B2C_DELIVERY: "Livraison B2C",
  WELCOME_BONUS: "Bonus de bienvenue",
  MILESTONE_BONUS: "Bonus palier",
  ACTIVITY_BONUS: "Bonus activité",
  QUALITY_BONUS: "Bonus qualité",
  REFERRAL_REWARD: "Récompense parrainage",
  SCHEDULED_RIDE_DRIVER_BOOKING_BONUS: "Prime réservation programmée",
  CANCELLATION_INDEMNITY: "Indemnité annulation",
  WALLET_GRANT: "Campagne de crédit",
};

/** Item de GET /api/admin/contracts/:id/revenue-share/withholdings */
export interface RevenueShareWithholding {
  transactionId: string;
  /** FCFA — montant prélevé. */
  amount: number;
  sourceType: RevenueShareSourceType | null;
  sourceId: string | null;
  date: string;
}

export interface RevenueShareWithholdingsResult {
  items: RevenueShareWithholding[];
  total: number;
  page: number;
  limit: number;
}

/** Réponse de POST /:id/repayment-mode */
export interface SwitchToRevenueShareResult {
  contractId: string;
  modeRemboursement: "PAR_REVENU";
  tauxPrelevementRevenu: number;
  /** Échéances EN_ATTENTE annulées définitivement par la bascule. */
  cancelledInstallmentsCount: number;
  /** true si le chauffeur était bloqué (SUSPENDED) et vient d'être débloqué. */
  driverUnblocked: boolean;
}

/** Réponse de PATCH /:id/revenue-share-rate */
export interface UpdateRevenueShareRateResult {
  contractId: string;
  tauxPrelevementRevenu: number;
}

// ─── Payment frequency ────────────────────────────────────────────────────────

/** Valeurs acceptées par le backend (champ frequenceEcheances) */
export type PaymentFrequency = "JOURNALIER" | "HEBDOMADAIRE" | "MENSUEL";

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  JOURNALIER:   "Journalier",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUEL:      "Mensuel",
};

export const PAYMENT_FREQUENCY_OPTIONS = (
  Object.keys(PAYMENT_FREQUENCY_LABELS) as PaymentFrequency[]
).map((k) => ({ value: k, label: PAYMENT_FREQUENCY_LABELS[k] }));

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface ContractKpis {
  contracts: {
    total:     number;
    active:    number;
    suspended: number;
    completed: number;
    broken:    number;
    /** Contrats TERMINE (véhicule transféré au chauffeur). */
    terminated?: number;
  };
  financials: {
    totalMontantTotal:         number;
    totalMontantPaye:          number;
    totalMontantRestant:       number;
    totalResidualDebt:         number;
    /** Apport total versé à la signature. */
    totalDownPayment?:         number;
    /** Montant net à financer total (montantTotal − apport). */
    totalMontantNetAFinancer?: number;
  };
  installments: {
    enAttente:             number;
    /** Cash-basis (Lot D) — imputées, en cours de recouvrement. */
    enRecouvrement:        number;
    /** Cash-basis (Lot D) — partiellement recouvrées en cash. */
    partiellementRecouvree:number;
    payee:                 number;
    impayee:               number;
    annulee:               number;
    overdueCount:          number;
  };
  blocking: {
    atRiskCount:  number;
    blockedCount: number;
    threshold:    number;
  };
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export type AuditLogAction =
  | "CONTRACT_CREATED"
  | "CONTRACT_RESUMED"
  | "CONTRACT_SUSPENDED"
  | "CONTRACT_TERMINATED"
  | "CONTRACT_BROKEN"
  | "CONTRACT_DEBT_RECONCILED"
  | "INSTALLMENT_PAID"
  | "INSTALLMENT_PARTIALLY_PAID"
  | "INSTALLMENT_UNPAID"
  | "INSTALLMENT_RECOVERY_RESTORED"
  | "INSTALLMENT_LOCKED_DEFAULTED"
  | "DRIVER_BLOCKED"
  | "DRIVER_UNBLOCKED"
  | "MANUAL_PAYMENT_RECORDED"
  | "PLATFORM_REVENUE_RECOGNIZED"
  | "CAUTION_RESTITUEE";

export const AUDIT_LOG_ACTION_LABELS: Record<AuditLogAction, string> = {
  CONTRACT_CREATED:             "Contrat créé",
  CONTRACT_RESUMED:             "Contrat repris",
  CONTRACT_SUSPENDED:           "Contrat suspendu",
  CONTRACT_TERMINATED:          "Contrat terminé",
  CONTRACT_BROKEN:              "Contrat résilié",
  CONTRACT_DEBT_RECONCILED:     "Réconciliation de dette contrat",
  INSTALLMENT_PAID:             "Échéance payée",
  INSTALLMENT_PARTIALLY_PAID:   "Échéance partiellement collectée",
  INSTALLMENT_UNPAID:           "Échéance impayée",
  INSTALLMENT_RECOVERY_RESTORED:"Recouvrement restauré",
  INSTALLMENT_LOCKED_DEFAULTED: "Échéance verrouillée (défaut)",
  DRIVER_BLOCKED:               "Chauffeur bloqué",
  DRIVER_UNBLOCKED:             "Chauffeur débloqué",
  MANUAL_PAYMENT_RECORDED:      "Paiement manuel enregistré",
  PLATFORM_REVENUE_RECOGNIZED:  "Revenu PLATFORM reconnu (cash)",
  CAUTION_RESTITUEE:            "Caution restituée au chauffeur",
};

export interface ContractAuditLog {
  id: string;
  contractId: string;
  driverId: string;
  action: AuditLogAction;
  performedBy: string;
  details?: Record<string, unknown>;
  occurredAt: string;
}

export interface ContractAuditLogsResult {
  items: ContractAuditLog[];
  total: number;
  page: number;
  limit: number;
}

// ─── Input types ─────────────────────────────────────────────────────────────

/** Corps envoyé au backend — POST /api/admin/contracts */
export interface CreateContractInput {
  driverId: string;
  vehicleId: string;
  dateDebut: string;
  dureeMois: number;
  /** Caution de garantie en XOF — obligatoire */
  montantCaution: number;
  /** Défaut backend : MENSUEL */
  frequenceEcheances?: PaymentFrequency;
  /** Marge en % (ex: 20 pour 20%). Backend calcule montantTotal = purchasePrice * (1 + marginPct/100) */
  marginPct?: number;
  notes?: string;
  /** Défaut ECHEANCIER si omis. */
  modeRemboursement?: ModeRemboursement;
  /** Fraction 0.05–1. N'envoyer QUE si modeRemboursement = PAR_REVENU — exige la permission
   * contract.modify_terms (SUPER_ADMIN) en plus de contract.create, sinon 403. */
  tauxPrelevementRevenu?: number;
}

export interface BreakContractInput {
  reason: string;
}

/**
 * Mode de paiement pour un paiement manuel admin (Lot D §3bis).
 * Deux valeurs exactement — pas de virement pour l'instant.
 */
export type ManualPaymentMethod = "ESPECES" | "MOBILE_MONEY";

export const MANUAL_PAYMENT_METHOD_LABELS: Record<ManualPaymentMethod, string> = {
  ESPECES:      "Espèces",
  MOBILE_MONEY: "Mobile Money",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatXof(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function driverFullName(driver: ContractDriver): string {
  return `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.trim() || driver.driverId;
}

export function vehicleLabel(vehicle: ContractVehicle): string {
  const parts = [vehicle.make, vehicle.model, vehicle.licensePlate].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : vehicle.vehicleId;
}

// ─── Rapport quotidien de collecte ────────────────────────────────────────────

/** Source du paiement d'une échéance, déterminée via le journal d'audit. */
export type PaymentSource = "MANUEL" | "AUTOMATIQUE" | "INCONNU";

export interface DailyCollectionLine {
  contractId: string;
  installmentId: string;
  installmentNumero: number;
  dateEcheance: string;
  /** Date effective d'imputation/paiement (null si non encore payé). */
  datePaiement: string | null;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleLicensePlate?: string;
  /** Montant dû (montant nominal de l'échéance) */
  montant: number;
  /** Montant imputé sur wallet EARNINGS */
  montantPaye: number;
  /** Montant effectivement encaissé en cash */
  montantRecouvre: number;
  /** montantPaye − montantRecouvre : encaissé via découvert, recouvrement en cours */
  cashShortfall: number;
  statut: InstallmentStatus;
  retardJours?: number;
  /** Source du paiement — dérivée du journal d'audit (MANUAL_PAYMENT_RECORDED). */
  paymentSource: PaymentSource;
}

export interface DailyCollectionReport {
  dateFrom: string;
  dateTo: string;
  contractsScanned: number;
  totalLines: number;
  totalDue: number;
  totalImputed: number;
  totalCashCollected: number;
  totalCashShortfall: number;
  byStatus: Partial<Record<InstallmentStatus, number>>;
  lines: DailyCollectionLine[];
}
