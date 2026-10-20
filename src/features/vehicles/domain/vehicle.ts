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

/** Ordre croissant des catégories — sert à trier et à détecter un dépassement du plafond. */
export const VEHICLE_CATEGORY_ORDER: VehicleCategory[] = ["ECO", "STANDARD", "PREMIUM", "VIP"];

/** Réponse de PATCH /api/vehicles/admin/{id}/active-categories. */
export interface SetActiveCategoriesResult {
  vehicleId: string;
  oldCategory: VehicleCategory;
  newCategory: VehicleCategory;
  activeCategories: VehicleCategory[];
  verifiedCategory: VehicleCategory;
  changedAt: string;
}

export type VehicleStatus =
  | "PENDING"
  | "AVAILABLE"
  | "ASSIGNED"
  | "EN_CONTRAT"
  | "MAINTENANCE"
  | "RETIRED"
  | "REJECTED"
  | "SOLD";

export type VehicleOwnership = "DRIVER" | "PLATFORM" | "THIRD_PARTY";

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
  DRIVER: "Pilote",
  PLATFORM: "Plateforme",
  THIRD_PARTY: "Tiers",
};

/** Matches `VehicleSummary` in the OpenAPI spec. */
export interface VehicleSummary {
  id: string;
  ownership: VehicleOwnership;
  type: VehicleType;
  category: VehicleCategory | null;
  verifiedCategory: VehicleCategory | null;
  /** Cases COCHÉES (CAR uniquement). Vaut [category] si jamais choisi ; vide pour MOTO/TRICYCLE. `category` reste la plus haute. */
  activeCategories?: VehicleCategory[];
  /** Cases AFFICHÉES au chauffeur : toutes celles ≤ verifiedCategory. Vide pour MOTO/TRICYCLE. */
  selectableCategories?: VehicleCategory[];
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
  /** Admin-only, PII — jamais exposés au chauffeur. Uniquement significatifs
   * si ownership === "THIRD_PARTY" (null/vide sinon). */
  thirdPartyOwnerName?: string | null;
  thirdPartyOwnerPhone?: string | null;
  thirdPartyNote?: string | null;
  /** GET /admin/driver/:driverId uniquement — true si ce véhicule est
   * actuellement le véhicule actif du chauffeur (driver.assignedVehicleId). */
  isActive?: boolean;
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
  licensePlate?: string;
  seats?: number;
  registrationCardUrl?: string;
  insuranceUrl?: string;
  insuranceExpiryDate?: string;
  type?: VehicleType;
  category?: VehicleCategory;
  status?: VehicleStatus;
  ownership?: VehicleOwnership;
  mileage?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  /** THIRD_PARTY uniquement (422 sinon). null/"" efface le champ, undefined = inchangé. */
  thirdPartyOwnerName?: string | null;
  thirdPartyOwnerPhone?: string | null;
  thirdPartyNote?: string | null;
}

// ─── Onboarding admin (multipart) ────────────────────────────────────────────
// 3 routes multipart/form-data, requireAdmin() seul (aucune permission fine).
// Une assurance qui expire AUJOURD'HUI est valide toute la journée (comparée
// au début du jour UTC, pas à l'instant présent).

/** POST /api/vehicles/admin/driver/:driverId/add — véhicule organique pour un
 * chauffeur (ownership=DRIVER), créé ET ses documents en un seul appel. */
export interface AdminAddDriverVehicleInput {
  driverId: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  insuranceExpiryDate?: string;
  /** Obligatoire côté backend (400 si absent). */
  insuranceFile: File;
  registrationCardFile?: File;
}

export interface AdminAddVehicleResult {
  vehicleId: string;
  driverId: string;
  type: VehicleType;
  status: "PENDING";
  isVerified: false;
  createdAt: string;
}

/** POST /api/vehicles/admin/third-party/add — véhicule sans chauffeur,
 * n'appartenant ni à ForYou ni au chauffeur (partenaire, particulier…). */
export interface AddThirdPartyVehicleInput {
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  category?: VehicleCategory;
  insuranceExpiryDate?: string;
  /** ≤ 100 caractères. */
  ownerName?: string;
  /** 8-15 chiffres (+ et espaces tolérés). */
  ownerPhone?: string;
  /** ≤ 500 caractères. */
  ownerNote?: string;
  insuranceFile?: File;
  registrationCardFile?: File;
}

export interface AddThirdPartyVehicleResult {
  vehicleId: string;
  ownership: "THIRD_PARTY";
  type: VehicleType;
  status: "PENDING";
  isVerified: false;
  createdAt: string;
}

/** POST /api/vehicles/admin/:id/documents — ajoute/complète les documents
 * d'un véhicule EXISTANT (plateforme, chauffeur ou tiers). Au moins un
 * fichier requis ; insuranceExpiryDate refusé si envoyé sans insuranceFile.
 * 409 si un document de ce type existe déjà pour ce véhicule (→ remplacer
 * via la route documents.adminReplace existante). */
export interface AdminUploadVehicleDocumentsInput {
  vehicleId: string;
  insuranceFile?: File;
  registrationCardFile?: File;
  insuranceExpiryDate?: string;
}

export interface AdminUploadVehicleDocumentsResult {
  vehicleId: string;
  insuranceUrl: string | null;
  registrationCardUrl: string | null;
  insuranceExpiryDate: string | null;
  documents: Array<{
    documentId: string;
    type: "INSURANCE" | "REGISTRATION_CARD";
    status: "PENDING";
  }>;
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
