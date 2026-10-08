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
  | "RATED"
  | "NO_SHOW_PASSENGER";

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
  /** Instant d'affectation du chauffeur courant — réécrit à chaque réaffectation. */
  driverAssignedAt?: string | null;
  /** Instant d'entrée en DRIVER_EN_ROUTE (départ auto pour une réservation, pas une acceptation humaine). */
  acceptedAt?: string | null;
  driverAssignmentSource?: DriverAssignmentSource | null;
  /** Instant du passage à NO_DRIVER_FOUND. */
  noDriverFoundAt?: string | null;
}

/** src/modules/ride/domain/value-objects/DriverAssignmentSource.ts */
export type DriverAssignmentSource =
  | "DRIVER_ACCEPTED"
  | "THIRD_PARTY_ASSIGNED"
  | "PICKUP_DECLARED"
  | "SCHEDULED_PRE_ASSIGNED";

export const DRIVER_ASSIGNMENT_SOURCE_LABELS: Record<DriverAssignmentSource, string> = {
  DRIVER_ACCEPTED: "Accepté par le chauffeur",
  THIRD_PARTY_ASSIGNED: "Affecté par un tiers",
  PICKUP_DECLARED: "Déclaré (pickup)",
  SCHEDULED_PRE_ASSIGNED: "Pré-affecté (réservation)",
};

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
  /** Toujours présent, INSTANT pour les anciennes courses. */
  scheduleType: "INSTANT" | "SCHEDULED";
  /** Résumé léger (montant gelé + taux) — absent côté pilote, null si course INSTANT.
   * ⚠️ `status` est toujours null via cette route (guaranteeStatusReader non câblé côté
   * admin) : pour le détail réel du règlement, utiliser GET .../guarantee-settlement. */
  guarantee?: { amount: number; rate: number | null; status: "HELD" | "CAPTURED" | "RELEASED" | "IMPUTED" | null } | null;

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
  /** Statut terminal lecture seule — jamais settable par l'admin
   * (Ride.adminOverrideStatus n'autorise que CANCELLED_SYSTEM/COMPLETED/RATED comme cibles). */
  NO_SHOW_PASSENGER: { label: "No-show passager", tone: "danger" },
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

// ─── Résumé de la recherche chauffeur (matching) ───────────────────────────
// GET /api/admin/rides/:rideId/matching — aucun driverId ni localisation,
// uniquement des compteurs. Voir ai-docs/data/ride-traceability-fields.md.

export type MatchingTrigger = "INITIAL" | "ESCALATION" | "SURGE_RETRY" | "FALLBACK_VEHICLE";
export type MatchingOutcome = "SOLICITED" | "NO_CANDIDATE_IN_RADIUS" | "ALL_EXCLUDED_BALANCE" | "EXHAUSTED";
export type MatchingMilestoneCode =
  | "SURGE_ACTIVATED"
  | "FALLBACK_PROPOSED"
  | "FALLBACK_ACCEPTED"
  | "FALLBACK_EXPIRED"
  | "ATTEMPTS_CAP_REACHED"
  | "RADIUS_STEPS_EXHAUSTED";
export type MatchingFailureReason =
  | "NO_CANDIDATE_IN_RADIUS"
  | "ALL_EXCLUDED_BALANCE"
  | "ALL_IGNORED_OR_REJECTED"
  | "FALLBACK_NO_CANDIDATE"
  | "SURGE_EXPIRED"
  | "STUCK_SWEEP"
  | "LEGACY_NO_DRIVER_JOB"
  | "SCHEDULED_DECLARED";

export const MATCHING_TRIGGER_LABELS: Record<MatchingTrigger, string> = {
  INITIAL: "Recherche initiale",
  ESCALATION: "Escalade de rayon",
  SURGE_RETRY: "Relance (surge)",
  FALLBACK_VEHICLE: "Repli véhicule",
};

export const MATCHING_OUTCOME_LABELS: Record<MatchingOutcome, string> = {
  SOLICITED: "Chauffeurs sollicités",
  NO_CANDIDATE_IN_RADIUS: "Aucun candidat dans le rayon",
  ALL_EXCLUDED_BALANCE: "Tous exclus (solde)",
  EXHAUSTED: "Épuisé",
};

export const MATCHING_MILESTONE_LABELS: Record<MatchingMilestoneCode, string> = {
  SURGE_ACTIVATED: "Surge activé",
  FALLBACK_PROPOSED: "Repli proposé",
  FALLBACK_ACCEPTED: "Repli accepté",
  FALLBACK_EXPIRED: "Repli expiré",
  ATTEMPTS_CAP_REACHED: "Plafond de tentatives atteint",
  RADIUS_STEPS_EXHAUSTED: "Paliers de rayon épuisés",
};

export const MATCHING_FAILURE_REASON_LABELS: Record<MatchingFailureReason, string> = {
  NO_CANDIDATE_IN_RADIUS: "Aucun candidat dans le rayon",
  ALL_EXCLUDED_BALANCE: "Tous les candidats exclus (solde)",
  ALL_IGNORED_OR_REJECTED: "Tous ignoré/refusé",
  FALLBACK_NO_CANDIDATE: "Repli sans candidat",
  SURGE_EXPIRED: "Expiré en surge",
  STUCK_SWEEP: "Nettoyage (bloqué)",
  LEGACY_NO_DRIVER_JOB: "Job legacy sans driver",
  SCHEDULED_DECLARED: "Réservation déclarée sans dispatch",
};

export interface MatchingCycleStep {
  radiusKm: number;
  /** Plafonné à 20 par le backend (= "≥20"). */
  found: number;
  excludedBalance: number;
  alreadyContacted: number;
  eligible: number;
}

export interface MatchingCycle {
  at: string;
  trigger: MatchingTrigger;
  vehicleType: string;
  steps: MatchingCycleStep[];
  outcome: MatchingOutcome;
  presence?: {
    radiusKm: number;
    onlineAnyCategoryInRadius: number;
    onlineFreeAnyCategoryInRadius: number;
    onlineTotal: number;
  };
}

export interface MatchingMilestone {
  at: string;
  code: MatchingMilestoneCode;
  detail?: string;
}

export interface RideMatchingSummary {
  version: number;
  firstSolicitedAt?: string;
  lastSolicitedAt?: string;
  solicitedCount: number;
  /** Agrège timeouts (30s) ET refus explicites — pas de distinction. */
  ignoredCount: number;
  /** 1er cycle INITIAL, jamais évincé de la fenêtre glissante. */
  firstCycle?: MatchingCycle;
  /** 30 derniers cycles (fenêtre glissante). */
  cycles: MatchingCycle[];
  /** 20 derniers jalons. */
  milestones: MatchingMilestone[];
  /** Posé UNIQUEMENT sur échec. */
  finalReason?: MatchingFailureReason;
  finalAt?: string;
}

/** available:false = course jamais tracée (200, PAS "0 chauffeur trouvé"). */
export type RideMatchingResponse =
  | { rideId: string; rideNumber: string; status: string; available: false; reason: "NOT_TRACED" }
  | { rideId: string; rideNumber: string; status: string; available: true; summary: RideMatchingSummary };
