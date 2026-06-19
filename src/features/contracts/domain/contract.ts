// ─── Contract statuses ────────────────────────────────────────────────────────

export type ContractStatus =
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "BROKEN"
  | "TERMINATED";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
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
  COMPLETED: "info",
  BROKEN: "danger",
  TERMINATED: "neutral",
};

// ─── Installment ──────────────────────────────────────────────────────────────

export type InstallmentStatus = "PENDING" | "PAID" | "LATE" | "WAIVED";

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING: "À payer",
  PAID: "Payée",
  LATE: "En retard",
  WAIVED: "Annulée",
};

export const INSTALLMENT_STATUS_TONES: Record<
  InstallmentStatus,
  "neutral" | "primary" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "neutral",
  PAID: "success",
  LATE: "danger",
  WAIVED: "info",
};

export interface ContractInstallment {
  installmentId: string;
  contractId: string;
  numero: number;
  montant: number;
  dateEcheance: string;
  datePaiement: string | null;
  status: InstallmentStatus;
  retardJours?: number;
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
  montantTotal: number;
  apport: number;
  tauxInteret: number;
  frequencePaiement: PaymentFrequency;
  montantMensuel?: number;
  montantRestant?: number;
  echeancesTotal?: number;
  echeancesPayees?: number;
  createdAt: string;
  updatedAt: string;
  breakReason?: string | null;
}

// ─── Payment frequency ────────────────────────────────────────────────────────

export type PaymentFrequency = "WEEKLY" | "MONTHLY" | "QUARTERLY";

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
};

export const PAYMENT_FREQUENCY_OPTIONS = (
  Object.keys(PAYMENT_FREQUENCY_LABELS) as PaymentFrequency[]
).map((k) => ({ value: k, label: PAYMENT_FREQUENCY_LABELS[k] }));

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateContractInput {
  driverId: string;
  vehicleId: string;
  dateDebut: string;
  dureeMois: number;
  montantTotal: number;
  apport: number;
  tauxInteret: number;
  frequencePaiement: PaymentFrequency;
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
