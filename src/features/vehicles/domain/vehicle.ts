export type VehicleType = "MOTO" | "TRICYCLE" | "CAR";

export interface MaintenanceRecord {
  reason: string;
  startedAt: string;
  completedAt: string;
  estimatedCost?: number;
  actualCost?: number;
}

export interface CurrentMaintenance {
  reason: string;
  startedAt: string;
  estimatedCost?: number;
}

export type VehicleCategory = "ECO" | "STANDARD" | "PREMIUM" | "VIP";

export type VehicleStatus =
  | "PENDING"
  | "AVAILABLE"
  | "ASSIGNED"
  | "EN_CONTRAT"
  | "MAINTENANCE"
  | "RETIRED"
  | "REJECTED"
  | "SOLD";

export type VehicleOwnership = "DRIVER" | "PLATFORM";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  MOTO: "Moto",
  TRICYCLE: "Tricycle",
  CAR: "Voiture",
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  ECO: "Éco",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  VIP: "VIP",
};

export const VEHICLE_STATUS_META: Record<
  VehicleStatus,
  { label: string; tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info" }
> = {
  PENDING: { label: "En attente", tone: "warning" },
  AVAILABLE: { label: "Disponible", tone: "success" },
  ASSIGNED: { label: "Assigné", tone: "primary" },
  EN_CONTRAT: { label: "En contrat", tone: "info" },
  MAINTENANCE: { label: "Maintenance", tone: "info" },
  RETIRED: { label: "Retiré", tone: "neutral" },
  REJECTED: { label: "Rejeté", tone: "danger" },
  SOLD: { label: "Vendu", tone: "neutral" },
};

export const VEHICLE_OWNERSHIP_LABELS: Record<VehicleOwnership, string> = {
  DRIVER: "Driver",
  PLATFORM: "Plateforme",
};

/** Matches `VehicleSummary` in the OpenAPI spec. */
export interface VehicleSummary {
  id: string;
  ownership: VehicleOwnership;
  type: VehicleType;
  category: VehicleCategory | null;
  verifiedCategory: VehicleCategory | null;
  status: VehicleStatus;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  registrationCardUrl: string | null;
  insuranceUrl: string | null;
  insuranceExpiryDate: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  /** NOTE: the backend does NOT currently return this field on list or detail
   * responses — always undefined until the API is updated. */
  assignedToDriverId?: string | null;
  assignedAt?: string | null;
  mileage: number | null;
  nextMaintenanceDate: string | null;
  /** Returned by detail endpoint — purchase price at acquisition (FCFA). */
  purchasePrice?: number | null;
  /** Returned by detail endpoint — current book value (FCFA). */
  currentValue?: number | null;
  /** Maintenance en cours (si status === MAINTENANCE). */
  currentMaintenance?: CurrentMaintenance | null;
  /** Historique des maintenances terminées. */
  maintenanceHistory?: MaintenanceRecord[];
  createdAt: string;
  updatedAt: string;
  /** Nombre de contrats location-vente liés à ce véhicule. */
  contractCount?: number;
  /** True si un contrat actif est en cours sur ce véhicule. */
  hasActiveContract?: boolean;
}

export interface VehicleListResult {
  vehicles: VehicleSummary[];
  total: number;
}

export interface VehicleListQuery {
  status?: VehicleStatus;
  ownership?: VehicleOwnership;
  category?: VehicleCategory;
  type?: VehicleType;
  isVerified?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatePlatformVehicleInput {
  type: VehicleType;
  category: VehicleCategory;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  registrationCardUrl: string;
  insuranceUrl: string;
  insuranceExpiryDate: string; // YYYY-MM-DD
  purchaseDate: string; // YYYY-MM-DD
  purchasePrice: number;
}

export interface UpdateVehicleInput {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  seats?: number;
  registrationCardUrl?: string;
  insuranceUrl?: string;
  insuranceExpiryDate?: string;
}

/** Return value from POST /verify. */
export interface VerifyVehicleResult {
  vehicleId: string;
  status: VehicleStatus;
  category: VehicleCategory;
  verifiedCategory: VehicleCategory;
  verifiedAt: string;
  verifiedBy: string;
}

export const SEAT_RANGE: Record<VehicleType, [min: number, max: number]> = {
  MOTO: [1, 2],
  TRICYCLE: [2, 4],
  CAR: [2, 9],
};

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
