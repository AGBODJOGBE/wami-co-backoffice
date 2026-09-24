/**
 * Réservations programmées — miroir de
 *   GET  /api/admin/scheduled-rides/manual-assignment       (ride.scheduled.assign.view)
 *   POST /api/admin/scheduled-rides/:rideId/manual-assignment (ride.scheduled.assign)
 *   GET  /api/admin/rides/:rideId/guarantee-settlement       (ride.scheduled.settlement.view)
 *
 * Tous les montants sont des ENTIERS de FCFA — jamais de conversion ×100/÷100.
 */

export interface ScheduledRideCandidate {
  driverId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  rating: number;
  totalRides: number;
  vehicle: {
    vehicleId: string;
    /** Type NATIF du véhicule (sa catégorie la plus haute) — peut être au-dessus de celui de la réservation. */
    vehicleType: string;
    ownership: "PLATFORM" | "DRIVER";
    make: string;
    model: string;
    color: string;
    licensePlate: string;
  };
  isOnline: boolean;
  /** Position COURANTE d'un pilote présent. null pour un pilote hors ligne — aucune dernière position n'est stockée. */
  lastKnownLocation: { latitude: number; longitude: number; at: string } | null;
  /** null dès que lastKnownLocation est null. */
  distanceMeters: number | null;
}

export interface ScheduledRideToAssign {
  rideId: string;
  rideNumber: string;
  passengerId: string;
  scheduledAt: string;
  /** Peut être NÉGATIF : départ dépassé mais pas encore déclaré en échec. */
  minutesUntilDeparture: number;
  vehicleType: string;
  pickup: { latitude: number; longitude: number; address: string | null };
  dropoff: { latitude: number; longitude: number; address: string | null };
  estimatedPrice: number;
  guaranteeAmount: number | null;
  candidates: ScheduledRideCandidate[];
}

export interface ManualAssignmentQueue {
  /** Seuil d'éligibilité EN VIGUEUR (réglage admin) — ne jamais le coder en dur. */
  thresholdMinutes: number;
  total: number;
  rides: ScheduledRideToAssign[];
}

export interface AssignScheduledDriverResult {
  rideId: string;
  rideNumber: string;
  status: string;
  driverId: string;
  /** Résolus côté serveur depuis le véhicule actif du pilote. */
  vehicleId: string;
  vehicleType: string;
  driverWasOnline: boolean;
}

// ─── Règlement de la garantie ─────────────────────────────────────────────────

export type GuaranteeHoldStatus = "HELD" | "RELEASED" | "CAPTURED" | "IMPUTED";

export const GUARANTEE_HOLD_META: Record<
  GuaranteeHoldStatus,
  { label: string; tone: "warning" | "success" | "danger" | "info"; hint: string }
> = {
  HELD: { label: "Gelée", tone: "warning", hint: "Encore bloquée sur le wallet du passager." },
  RELEASED: { label: "Restituée", tone: "success", hint: "Rendue intégralement au passager." },
  CAPTURED: { label: "Saisie", tone: "danger", hint: "Conservée par ForYou (no-show du client)." },
  IMPUTED: { label: "Imputée", tone: "info", hint: "Devenue un acompte sur le prix final de la course." },
};

export interface GuaranteeMovement {
  transactionId: string;
  type: string;
  direction: "DEBIT" | "CREDIT";
  balanceType: string;
  walletId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  /** balanceBefore === balanceAfter : marqueur d'audit, PAS un mouvement d'argent. */
  isMarker: boolean;
}

export interface GuaranteeSettlement {
  rideId: string;
  rideNumber: string;
  status: string;
  scheduleType: string;
  /** null : jamais de gel (course instantanée, ou réservation antérieure au chantier). */
  guarantee: {
    amount: number;
    ratePct: number | null;
    holdStatus: GuaranteeHoldStatus;
    heldAt: string;
    resolvedAt: string | null;
    resolutionTransactionId: string | null;
  } | null;
  movements: GuaranteeMovement[];
  incident: {
    compensationAmount: number;
    penaltyAmount: number;
    /** = pénalité − compensation. PEUT être négatif (ForYou finance l'écart) — ne jamais borner ni masquer le signe. */
    platformNetOnIncident: number;
  };
}

export const GUARANTEE_MOVEMENT_LABELS: Record<string, string> = {
  SCHEDULED_RIDE_GUARANTEE_HOLD: "Gel de la garantie",
  SCHEDULED_RIDE_GUARANTEE_REFUND: "Restitution de la garantie",
  SCHEDULED_RIDE_GUARANTEE_IMPUTATION: "Imputation sur le prix",
  SCHEDULED_RIDE_GUARANTEE_CAPTURE: "Saisie de la garantie",
  SCHEDULED_RIDE_GUARANTEE_CAPTURE_REVENUE: "Revenu de saisie (plateforme)",
  SCHEDULED_RIDE_GUARANTEE_RETENTION: "Retenue sur annulation tardive",
  SCHEDULED_RIDE_GUARANTEE_RETENTION_REVENUE: "Revenu de retenue (plateforme)",
  SCHEDULED_RIDE_CLIENT_COMPENSATION: "Compensation versée au client",
  SCHEDULED_RIDE_CLIENT_COMPENSATION_EXPENSE: "Dépense de compensation (plateforme)",
  SCHEDULED_RIDE_DRIVER_BOOKING_BONUS: "Prime de réservation (pilote)",
  SCHEDULED_RIDE_DRIVER_BOOKING_BONUS_EXPENSE: "Dépense de prime (plateforme)",
  SCHEDULED_RIDE_DRIVER_PENALTY: "Pénalité prélevée (pilote)",
  SCHEDULED_RIDE_DRIVER_PENALTY_REVENUE: "Revenu de pénalité (plateforme)",
};
