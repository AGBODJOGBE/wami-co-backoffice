export type RideStatus =
  | "PENDING_MATCH"
  | "DRIVER_ASSIGNED"
  | "DRIVER_EN_ROUTE"
  | "DRIVER_ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_DRIVER_FOUND";

export type VehicleType = "MOTO" | "TRICYCLE" | "STANDARD" | "PREMIUM" | "VIP";

export type PaymentMethod = "CASH" | "WALLET" | "MOBILE_MONEY" | "CARD";

export interface RideRow {
  rideId: string;
  rideNumber: string;
  status: RideStatus;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  passengerName: string;
  passengerPhone: string;
  driverName: string | null;
  driverPhone: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMin: number;
  estimatedPrice: number;
  finalPrice: number | null;
  surgeMultiplier: number;
  createdAt: string;
  ago: string;
}

export const RIDE_STATUS_META: Record<
  RideStatus,
  { label: string; tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info" }
> = {
  PENDING_MATCH: { label: "En attente de match", tone: "warning" },
  DRIVER_ASSIGNED: { label: "Driver assigné", tone: "info" },
  DRIVER_EN_ROUTE: { label: "Driver en route", tone: "info" },
  DRIVER_ARRIVED: { label: "Driver arrivé", tone: "primary" },
  IN_PROGRESS: { label: "En cours", tone: "primary" },
  COMPLETED: { label: "Terminée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "danger" },
  NO_DRIVER_FOUND: { label: "Aucun driver", tone: "danger" },
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  MOTO: "Moto",
  TRICYCLE: "Tricycle",
  STANDARD: "Standard",
  PREMIUM: "Premium",
  VIP: "VIP",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  WALLET: "Wallet",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Carte",
};
