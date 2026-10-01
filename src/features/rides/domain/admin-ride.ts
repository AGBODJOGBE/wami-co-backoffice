/**
 * Admin-side ride domain. Mirrors:
 *   GET   /api/admin/rides
 *   PATCH /api/admin/rides/{rideId}/status (force admin transition)
 */

export type RideStatus =
  | "REQUESTED"
  | "MATCHED"
  | "ACCEPTED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED_PASSENGER"
  | "CANCELLED_DRIVER"
  | "CANCELLED_SYSTEM"
  | "DISPUTED"
  | "RATED";

export interface RidePartyRef {
  passengerId?: string;
  driverId?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  photo?: string | null;
  rating?: number;
  totalRides?: number;
}

export interface RideVehicleRef {
  vehicleId: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  type: string;
  category: string | null;
}

export interface RideLocation {
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface RidePricing {
  estimatedPrice: number;
  finalPrice: number | null;
  baseFare: number;
  surgeMultiplier: number;
  driverShareRate: number;
  commissionRate: number;
  waitingFee: number;
  pauseFee: number | null;
  /** Frais d'approche chauffeur → passager (FCFA). */
  approachFee: number;
  driverEarnings: number | null;
  platformCommission: number | null;
  discountAmount: number | null;
  promoCodeId: string | null;
  walletAmountPaid: number | null;
  cashAmountPaid: number | null;
  cancellationFee: number;
}

export interface AdminRide {
  rideId: string;
  rideNumber: string;
  status: RideStatus | string;
  rideType: string;
  pricingType?: string;
  vehicleType: string;
  paymentMethod: string;
  passenger?: RidePartyRef | null;
  driver?: RidePartyRef | null;
  vehicle?: RideVehicleRef | null;
  pickup?: RideLocation;
  dropoff?: RideLocation;
  pricing: RidePricing;
  distance?: { estimatedMeters: number; actualMeters: number | null; approachBilledMeters: number | null };
  duration?: { estimatedSeconds: number; actualSeconds: number | null };
  dispute?: { isDisputed: boolean; reason: string | null };
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  scheduledAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminRidesResult {
  rides: AdminRide[];
  total: number;
  page?: number;
  limit?: number;
}

/** Full enriched ride returned by GET /api/admin/rides/:rideId (GetRideUseCase). */
export interface RideDetail {
  rideId: string;
  rideNumber: string;
  status: RideStatus | string;
  rideType: string;
  vehicleType: string;
  paymentMethod: string;

  passenger: {
    passengerId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    photoUrl: string | null;
  };

  driver: {
    driverId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    photoUrl: string | null;
    rating: number;
    totalRides: number;
  } | null;

  vehicle: {
    vehicleId: string;
    make: string;
    model: string;
    color: string;
    licensePlate: string;
    type: string;
    category: string | null;
  } | null;

  pickup: { latitude: number; longitude: number; address: string | null };
  dropoff: { latitude: number; longitude: number; address: string | null };

  estimatedPrice: number;
  finalPrice: number | null;
  driverEarnings?: number | null;
  surgeMultiplier: number;
  discountAmount: number | null;

  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  actualDistanceMeters: number | null;
  actualDurationSeconds: number | null;
  actualPickup: { latitude: number; longitude: number } | null;
  actualDropoff: { latitude: number; longitude: number } | null;
  driverLocationEnRoute: { lat: number; lng: number } | null;

  scheduledAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;

  waitingDurationSeconds: number;
  freeWaitingMinutes: number;
  waitingFeeFcfa: number;

  totalPausedSeconds: number;
  pausesCount: number;
  pauseHistory: Array<{
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number | null;
  }>;
  pauseFeeFcfa: number;

  /** Distance d'approche (chauffeur → point de prise en charge) retenue après plafonnement GPS/OSRM, en mètres. null = pas de mesure. */
  approachDistanceMeters: number | null;
  /** Frais d'approche facturés au passager (FCFA), calculés depuis approachDistanceMeters — 0 si sous la franchise ou si RIDE_APPROACH_FEE_ENABLED est coupé. */
  approachFeeFcfa: number;

  noShowMinutes: number | null;
  noShowFee: number | null;

  promoCodeId: string | null;
  platformCommission: number | null;
  walletAmountPaid: number | null;
  cashAmountPaid: number | null;

  cancelledBy: "PASSENGER" | "DRIVER" | "SYSTEM" | null;
  cancelReason: string | null;
  cancellationFeeAmount: number;

  passengerRating: number | null;
  driverRating: number | null;
  passengerComment: string | null;
  driverComment: string | null;
  isFirstRideForPassenger: boolean;
}

export interface AdminRidesQuery {
  status?: string;
  vehicleType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export const RIDE_STATUS_META: Record<
  string,
  {
    label: string;
    tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  }
> = {
  REQUESTED: { label: "Demandée", tone: "warning" },
  MATCHED: { label: "Matchée", tone: "info" },
  ACCEPTED: { label: "Acceptée", tone: "info" },
  ARRIVED: { label: "Arrivé au pickup", tone: "primary" },
  IN_PROGRESS: { label: "En cours", tone: "primary" },
  PAUSED: { label: "En pause", tone: "warning" },
  COMPLETED: { label: "Terminée", tone: "success" },
  RATED: { label: "Notée", tone: "success" },
  DISPUTED: { label: "Litigieuse", tone: "danger" },
  CANCELLED_PASSENGER: { label: "Annulée (passager)", tone: "neutral" },
  CANCELLED_DRIVER: { label: "Annulée (driver)", tone: "neutral" },
  CANCELLED_SYSTEM: { label: "Annulée (système)", tone: "danger" },
  NO_DRIVER_FOUND: { label: "Aucun driver trouvé", tone: "warning" },
};

export function rideStatusMeta(status: string) {
  return (
    RIDE_STATUS_META[status] ?? { label: status, tone: "neutral" as const }
  );
}

/**
 * Détecte une course sans passager app réel — "Walk-in" ou compte fantôme.
 *
 * Critères (ordre de certitude décroissant) :
 *   1. passenger absent ou null → aucun passager rattaché
 *   2. passenger sans passengerId → référence orpheline sans compte réel
 *   3. passenger sans nom → profil vide (compte test)
 *   4. nom contenant "walk-in" (insensible à la casse) → client de rue
 *   5. téléphone placeholder bénino-style ("+229" + chiffres identiques / zéros)
 *      ex. +22900000000, +22911111111, +22999999999
 */
export function isGhostRide(r: AdminRide): boolean {
  if (!r.passenger) return true;
  if (!r.passenger.passengerId) return true;

  const name = `${r.passenger.firstName ?? ""} ${r.passenger.lastName ?? ""}`.trim();
  if (!name) return true;
  if (/walk[\s-]?in/i.test(name)) return true;

  const phone = (r.passenger.phoneNumber ?? "").replace(/\s/g, "");
  // Numéro placeholder : +229 suivi de 8 chiffres identiques ou tous zéros
  if (/^\+229(\d)\1{7}$/.test(phone)) return true;

  return false;
}

/** Texte court affiché dans les cellules pour un ride ghost. */
export function ghostRideLabel(r: AdminRide): string {
  if (!r.passenger) return "Aucun passager";
  if (!r.passenger.passengerId) return "Profil sans compte";
  const name = `${r.passenger.firstName ?? ""} ${r.passenger.lastName ?? ""}`.trim();
  if (!name) return "Profil vide";
  if (/walk[\s-]?in/i.test(name)) return "Walk-in (rue)";
  return "Placeholder";
}

export function fullParty(p: RidePartyRef | null | undefined): string {
  if (!p) return "—";
  const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return name || "—";
}
