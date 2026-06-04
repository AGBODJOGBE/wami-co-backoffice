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
}

export interface AdminRide {
  rideId: string;
  rideNumber: string;
  status: RideStatus | string;
  rideType: string;
  vehicleType: string;
  paymentMethod: string;
  passenger?: RidePartyRef | null;
  driver?: RidePartyRef | null;
  estimatedPrice: number;
  finalPrice: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface AdminRidesResult {
  rides: AdminRide[];
  total: number;
}

export interface AdminRidesQuery {
  status?: string;
  vehicleType?: string;
  fromDate?: string;
  toDate?: string;
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
};

export function rideStatusMeta(status: string) {
  return (
    RIDE_STATUS_META[status] ?? { label: status, tone: "neutral" as const }
  );
}

export function fullParty(p: RidePartyRef | null | undefined): string {
  if (!p) return "—";
  const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return name || "—";
}
