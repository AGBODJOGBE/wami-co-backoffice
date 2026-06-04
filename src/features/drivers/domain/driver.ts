import type { VehicleType } from "@/features/rides/domain/ride";

export type DriverStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

export interface DriverRow {
  driverId: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  category: VehicleType;
  vehicle: string;
  plate: string;
  rating: number;
  totalRides: number;
  status: DriverStatus;
  isOnline: boolean;
  missingDocuments: string[];
  registeredAt: string;
  registeredAgo: string;
}

export const DRIVER_STATUS_META: Record<
  DriverStatus,
  { label: string; tone: "neutral" | "primary" | "success" | "warning" | "danger" }
> = {
  PENDING: { label: "En attente KYC", tone: "warning" },
  APPROVED: { label: "Approuvé", tone: "success" },
  SUSPENDED: { label: "Suspendu", tone: "danger" },
  REJECTED: { label: "Rejeté", tone: "danger" },
};
