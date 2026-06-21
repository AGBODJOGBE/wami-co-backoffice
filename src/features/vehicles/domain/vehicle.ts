export type VehicleType = "MOTO" | "TRICYCLE" | "CAR";

export type VehicleCategory = "ECO" | "STANDARD" | "PREMIUM" | "VIP";

export type VehicleStatus =
  | "PENDING"
  | "AVAILABLE"
  | "ASSIGNED"
  | "MAINTENANCE"
  | "RETIRED"
  | "REJECTED";

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
  MAINTENANCE: { label: "Maintenance", tone: "info" },
  RETIRED: { label: "Retiré", tone: "neutral" },
  REJECTED: { label: "Rejeté", tone: "danger" },
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
  createdAt: string;
  updatedAt: string;
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
  vehicleId: string; // UUID v4 — backend requires explicit ID (Mongoose schema uses UUID, not ObjectId)
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
