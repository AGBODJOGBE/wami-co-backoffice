/**
 * Admin-side view of a B2C delivery order — mirror of the swagger
 * `AdminDeliveryOrder` / `AdminDeliveryOrderDetail` payloads.
 *
 * Endpoints:
 *   GET /api/admin/delivery               → AdminDelivery[]
 *   GET /api/admin/delivery/{orderId}     → AdminDeliveryDetail
 *
 * Status enum and labels are inferred from the swagger example
 * ("IN_TRANSIT") plus the standard B2C lifecycle. New values surfaced
 * by the backend fall through `deliveryStatusMeta()` with a neutral
 * tone, so they don't break the UI.
 */

export type DeliveryStatus =
  | "PENDING"
  | "DRIVER_ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

export type DeliveryType = "INSTANT" | "SCHEDULED";

export type DeliveryVehicleType = "MOTO" | "TRICYCLE" | "VOITURE";

export type DeliveryPaymentMethod = "CASH" | "MOBILE_MONEY" | "CARD";

export interface DeliveryPassengerRef {
  passengerId: string;
  name: string;
  phone: string;
}

export interface DeliveryDriverRef {
  driverId: string;
  name: string;
  photo?: string | null;
  phone: string;
  rating: number;
  totalRides: number;
  vehicle?: {
    make: string;
    model: string;
    color: string;
    licensePlate: string;
    category: string;
  } | null;
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  address: string;
  contactName?: string | null;
  contactPhone?: string | null;
  landmark?: string | null;
}

export interface DeliveryParcel {
  type: string;
  description: string;
  estimatedWeightKg: number;
  requiresRefrigeration: boolean;
  specialInstructions?: string | null;
}

export interface DeliveryRecipient {
  name: string;
  phone: string;
}

/** Light shape returned by GET /api/admin/delivery (list view). */
export interface AdminDelivery {
  id: string;
  orderNumber: string;
  status: DeliveryStatus | string;
  deliveryType: DeliveryType | string;
  vehicleType: DeliveryVehicleType | string;
  paymentMethod: DeliveryPaymentMethod | string;
  passenger?: DeliveryPassengerRef | null;
  driver?: DeliveryDriverRef | null;
  estimatedPrice: number;
  finalPrice: number;
  createdAt: string;
  updatedAt: string;
}

/** Full enriched shape returned by GET /api/admin/delivery/{orderId}. */
export interface AdminDeliveryDetail extends AdminDelivery {
  pickup: DeliveryLocation;
  dropoff: DeliveryLocation;
  parcel: DeliveryParcel;
  recipient: DeliveryRecipient;
  pickupPhoto?: string | null;
  deliveryPhoto?: string | null;
  otpVerifiedAt?: string | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
}

export interface AdminDeliveriesResult {
  deliveries: AdminDelivery[];
  total: number;
}

export const DELIVERY_STATUS_META: Record<
  DeliveryStatus,
  {
    label: string;
    tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  }
> = {
  PENDING: { label: "En attente", tone: "warning" },
  DRIVER_ASSIGNED: { label: "Driver assigné", tone: "info" },
  PICKED_UP: { label: "Collecté", tone: "primary" },
  IN_TRANSIT: { label: "En transit", tone: "primary" },
  DELIVERED: { label: "Livré", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
  FAILED: { label: "Échec", tone: "danger" },
};

export function deliveryStatusMeta(status: string) {
  return (
    DELIVERY_STATUS_META[status as DeliveryStatus] ?? {
      label: status,
      tone: "neutral" as const,
    }
  );
}

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  INSTANT: "Instantanée",
  SCHEDULED: "Programmée",
};

export const DELIVERY_VEHICLE_LABELS: Record<DeliveryVehicleType, string> = {
  MOTO: "Moto",
  TRICYCLE: "Tricycle",
  VOITURE: "Voiture",
};

export const DELIVERY_PAYMENT_LABELS: Record<DeliveryPaymentMethod, string> = {
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Carte bancaire",
};

/** Lifecycle statuses considered « commande en cours » — used for the
 *  dashboard KPI "dont X en cours" and the in-transit StatCard. */
export const IN_FLIGHT_DELIVERY_STATUSES: ReadonlySet<string> = new Set([
  "PENDING",
  "DRIVER_ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
]);

export const REVENUE_DELIVERY_STATUSES: ReadonlySet<string> = new Set([
  "DELIVERED",
]);
