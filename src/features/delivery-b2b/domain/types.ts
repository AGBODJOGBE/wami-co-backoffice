/**
 * Pure design / mock module — no backend wired yet.
 * The whole B2B delivery vertical is laid out so that, when the API ships,
 * each list/detail screen has a clear seat to plug into.
 */

export type ShipmentStatus =
  | "DRAFT"
  | "PENDING_PICKUP"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export type ShipmentPriority = "STANDARD" | "EXPRESS" | "URGENT";

export type ParcelCategory =
  | "DOCUMENTS"
  | "ELECTRONIQUE"
  | "ALIMENTAIRE"
  | "MEDICAMENTS"
  | "TEXTILE"
  | "MOBILIER"
  | "AUTRE";

export type CourierVehicle = "MOTO" | "TRICYCLE" | "VOITURE" | "CAMIONNETTE";

export type CourierStatus = "ONLINE" | "BUSY" | "OFFLINE" | "SUSPENDED";

export type SenderTier = "STARTER" | "PRO" | "ENTERPRISE";

export const SHIPMENT_STATUS_META: Record<
  ShipmentStatus,
  {
    label: string;
    tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  }
> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_PICKUP: { label: "En attente collecte", tone: "warning" },
  ASSIGNED: { label: "Livreur assigné", tone: "info" },
  PICKED_UP: { label: "Collecté", tone: "info" },
  IN_TRANSIT: { label: "En transit", tone: "primary" },
  DELIVERED: { label: "Livré", tone: "success" },
  FAILED: { label: "Échec", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const PRIORITY_META: Record<
  ShipmentPriority,
  { label: string; tone: "neutral" | "warning" | "danger" }
> = {
  STANDARD: { label: "Standard", tone: "neutral" },
  EXPRESS: { label: "Express", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};

export const PARCEL_LABELS: Record<ParcelCategory, string> = {
  DOCUMENTS: "Documents",
  ELECTRONIQUE: "Électronique",
  ALIMENTAIRE: "Alimentaire",
  MEDICAMENTS: "Médicaments",
  TEXTILE: "Textile",
  MOBILIER: "Mobilier",
  AUTRE: "Autre",
};

export const VEHICLE_LABELS: Record<CourierVehicle, string> = {
  MOTO: "Moto",
  TRICYCLE: "Tricycle",
  VOITURE: "Voiture",
  CAMIONNETTE: "Camionnette",
};

export const COURIER_STATUS_META: Record<
  CourierStatus,
  { label: string; tone: "success" | "info" | "neutral" | "danger" }
> = {
  ONLINE: { label: "En ligne", tone: "success" },
  BUSY: { label: "En course", tone: "info" },
  OFFLINE: { label: "Hors ligne", tone: "neutral" },
  SUSPENDED: { label: "Suspendu", tone: "danger" },
};

export const SENDER_TIER_META: Record<
  SenderTier,
  { label: string; tone: "neutral" | "primary" | "success" }
> = {
  STARTER: { label: "Starter", tone: "neutral" },
  PRO: { label: "Pro", tone: "primary" },
  ENTERPRISE: { label: "Enterprise", tone: "success" },
};

export interface Address {
  label: string; // ex. "Pharmacie Étoile Rouge"
  city: string;
  district: string;
  contactName: string;
  contactPhone: string;
}

export interface ShipmentTimelineEvent {
  at: string;
  label: string;
  by?: string;
  kind: "info" | "success" | "warning" | "danger";
}

export interface Shipment {
  id: string;
  reference: string; // ex. "B2B-CTN-2026-0489"
  status: ShipmentStatus;
  priority: ShipmentPriority;
  category: ParcelCategory;
  weightKg: number;
  declaredValue: number;
  pickup: Address;
  dropoff: Address;
  distanceKm: number;
  pickupAt: string;
  expectedDropoffAt: string;
  deliveredAt?: string | null;
  senderId: string;
  senderName: string;
  courierId?: string | null;
  courierName?: string | null;
  vehicle?: CourierVehicle | null;
  price: number;
  paymentMethod: "WALLET" | "MOBILE_MONEY" | "INVOICE";
  notes?: string;
  timeline: ShipmentTimelineEvent[];
}

export interface Courier {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  status: CourierStatus;
  vehicles: CourierVehicle[];
  primaryVehicle: CourierVehicle;
  rating: number; // 0-5
  totalDeliveries: number;
  successRate: number; // 0-100
  monthRevenueFcfa: number;
  joinedAt: string;
  lastActiveAgo: string;
  isVerified: boolean;
  zonesCovered: string[];
  walletBalance: number;
  pendingPayouts: number;
}

export interface Sender {
  id: string;
  name: string;
  legalName: string;
  industry: string;
  tier: SenderTier;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  shipmentsThisMonth: number;
  spendThisMonth: number;
  averageBasket: number;
  joinedAgo: string;
  isActive: boolean;
  warehousesCount: number;
}

export interface PricingBracket {
  upToKm: number;
  baseFare: number;
  perKgRate: number;
}

export interface PricingZone {
  id: string;
  name: string;
  baseMultiplier: number;
  brackets: PricingBracket[];
}

export interface PriorityMultiplier {
  priority: ShipmentPriority;
  multiplier: number;
  slaMinutes: number;
}

export interface RoundStop {
  shipmentId: string;
  reference: string;
  type: "PICKUP" | "DROPOFF";
  address: string;
  city: string;
  scheduledAt: string;
  status: "PENDING" | "DONE";
}

export interface PlannedRound {
  id: string;
  name: string;
  courierId: string;
  courierName: string;
  vehicle: CourierVehicle;
  startsAt: string;
  endsAt: string;
  zone: string;
  stops: RoundStop[];
  totalDistanceKm: number;
  estimatedRevenue: number;
}

export interface DashboardKpis {
  todayShipments: number;
  delivered: number;
  inTransit: number;
  pendingPickup: number;
  failed: number;
  onTimeRate: number; // percentage
  averageDeliveryMinutes: number;
  revenueFcfaToday: number;
  revenueDeltaPct: number;
  activeCouriers: number;
  totalCouriers: number;
  topZone: string;
  alerts: number;
}
