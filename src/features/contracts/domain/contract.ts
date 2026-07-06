// ─── Contract statuses ────────────────────────────────────────────────────────

export type ContractStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "COMPLETED"
  | "BROKEN"
  | "TERMINATED";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  COMPLETED: "Soldé",
  BROKEN: "Résilié",
  TERMINATED: "Terminé",
};

export const CONTRACT_STATUS_TONES: Record<
  ContractStatus,
  "neutral" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  COMPLETED: "info",
  BROKEN: "danger",
  TERMINATED: "neutral",
};

// ─── Installment ──────────────────────────────────────────────────────────────

/** Valeurs retournées par le backend (champ statut) */
export type InstallmentStatus = "EN_ATTENTE" | "PAYEE" | "IMPAYEE" | "PARTIELLE" | "ANNULEE";

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  EN_ATTENTE: "À payer",
  PAYEE: "Payée",
  IMPAYEE: "Impayée",
  PARTIELLE: "Partielle",
  ANNULEE: "Annulée",
};

export const INSTALLMENT_STATUS_TONES: Record<
  InstallmentStatus,
  "neutral" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  EN_ATTENTE: "neutral",
  PAYEE: "success",
  IMPAYEE: "danger",
  PARTIELLE: "warning",
  ANNULEE: "info",
};

export interface ContractInstallment {
  installmentId: string; // mapped from API `id`
  contractId?: string;
  numero: number;
  montant: number;
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
  /** Nombre d'échéances passées en statut IMPAYEE (non réglées dans la fenêtre de tolérance). */
  nbImpayes?: number;
  createdAt: string;
  updatedAt: string;
  breakReason?: string | null;
}

// ─── Payment frequency ────────────────────────────────────────────────────────

/** Valeurs acceptées par le backend (champ frequenceEcheances) */
export type PaymentFrequency = "JOURNALIER" | "HEBDOMADAIRE" | "MENSUEL";

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  JOURNALIER: "Journalier",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUEL: "Mensuel",
};

export const PAYMENT_FREQUENCY_OPTIONS = (
  Object.keys(PAYMENT_FREQUENCY_LABELS) as PaymentFrequency[]
).map((k) => ({ value: k, label: PAYMENT_FREQUENCY_LABELS[k] }));

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface ContractKpis {
  contracts: {
    total: number;
    active: number;
    suspended: number;
    completed: number;
    broken: number;
  };
  financials: {
    totalMontantTotal: number;
    totalMontantPaye: number;
    totalMontantRestant: number;
    totalResidualDebt: number;
  };
  installments: {
    enAttente: number;
    payee: number;
    impayee: number;
    annulee: number;
    overdueCount: number;
  };
  blocking: {
    atRiskCount: number;
    blockedCount: number;
    threshold: number;
  };
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export type AuditLogAction =
  | "CONTRACT_CREATED"
  | "CONTRACT_TERMINATED"
  | "CONTRACT_BROKEN"
  | "INSTALLMENT_PAID"
  | "INSTALLMENT_UNPAID"
  | "DRIVER_BLOCKED"
  | "DRIVER_UNBLOCKED"
  | "MANUAL_PAYMENT_RECORDED";

export const AUDIT_LOG_ACTION_LABELS: Record<AuditLogAction, string> = {
  CONTRACT_CREATED: "Contrat créé",
  CONTRACT_TERMINATED: "Contrat terminé",
  CONTRACT_BROKEN: "Contrat résilié",
  INSTALLMENT_PAID: "Échéance payée",
  INSTALLMENT_UNPAID: "Échéance impayée",
  DRIVER_BLOCKED: "Chauffeur bloqué",
  DRIVER_UNBLOCKED: "Chauffeur débloqué",
  MANUAL_PAYMENT_RECORDED: "Paiement manuel enregistré",
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
}

export interface BreakContractInput {
  reason: string;
}

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
