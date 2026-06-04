export type DeliveryStatus =
  | "PENDING_MATCH"
  | "DRIVER_ASSIGNED"
  | "PICKUP_ARRIVED"
  | "PICKED_UP"
  | "DELIVERY_ARRIVED"
  | "OTP_VALIDATED"
  | "DELIVERED"
  | "PICKUP_FAILED"
  | "DELIVERY_FAILED"
  | "CANCELLED";

export type ParcelType =
  | "DOCUMENT"
  | "SMALL_PARCEL"
  | "FOOD"
  | "MEDIUM_PARCEL"
  | "FRAGILE"
  | "LARGE_PARCEL";

export interface DeliveryOrderRow {
  orderId: string;
  orderNumber: string;
  status: DeliveryStatus;
  parcelType: ParcelType;
  vehicleType: "MOTO" | "TRICYCLE" | "STANDARD" | "VAN";
  passengerName: string;
  passengerPhone: string;
  driverName: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  estimatedPrice: number;
  finalPrice: number | null;
  hasPickupPhoto: boolean;
  hasDeliveryPhoto: boolean;
  isOtpValidated: boolean;
  createdAt: string;
  ago: string;
}

export const DELIVERY_STATUS_META: Record<
  DeliveryStatus,
  { label: string; tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info" }
> = {
  PENDING_MATCH: { label: "En attente", tone: "warning" },
  DRIVER_ASSIGNED: { label: "Driver assigné", tone: "info" },
  PICKUP_ARRIVED: { label: "Pickup arrivé", tone: "info" },
  PICKED_UP: { label: "Colis collecté", tone: "primary" },
  DELIVERY_ARRIVED: { label: "Arrivé chez destinataire", tone: "primary" },
  OTP_VALIDATED: { label: "OTP validé", tone: "primary" },
  DELIVERED: { label: "Livré", tone: "success" },
  PICKUP_FAILED: { label: "Échec collecte", tone: "danger" },
  DELIVERY_FAILED: { label: "Échec livraison", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "danger" },
};

export const PARCEL_TYPE_META: Record<
  ParcelType,
  { label: string; emoji: string; maxKg: number; defaultVehicle: string }
> = {
  DOCUMENT: { label: "Document", emoji: "📄", maxKg: 1, defaultVehicle: "MOTO" },
  SMALL_PARCEL: { label: "Petit colis", emoji: "📦", maxKg: 5, defaultVehicle: "MOTO" },
  FOOD: { label: "Repas / Food", emoji: "🍱", maxKg: 5, defaultVehicle: "MOTO" },
  MEDIUM_PARCEL: { label: "Moyen colis", emoji: "📦", maxKg: 15, defaultVehicle: "STANDARD" },
  FRAGILE: { label: "Fragile", emoji: "🧊", maxKg: 15, defaultVehicle: "STANDARD" },
  LARGE_PARCEL: { label: "Gros colis", emoji: "🛋️", maxKg: 50, defaultVehicle: "VAN" },
};
