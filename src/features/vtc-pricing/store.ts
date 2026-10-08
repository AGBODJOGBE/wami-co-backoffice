"use client";

import { create } from "zustand";
import type { VehicleType } from "@/features/rides/domain/ride";

export interface PricingTier {
  vehicleType: VehicleType;
  basePrice: number;
  pricePerKm: number;
  pricePerMin: number;
  minimumPrice: number;
  waitingFeePerMin: number;
  cancellationFee: number;
  platformCommissionPct: number;
  isActive: boolean;
}

export interface SurgeRule {
  id: string;
  zone: string;
  timeRange: string;
  multiplier: number;
  weekDays: string;
  isActive: boolean;
}

const tiersSeed: PricingTier[] = [
  {
    vehicleType: "MOTO",
    basePrice: 500,
    pricePerKm: 150,
    pricePerMin: 30,
    minimumPrice: 800,
    waitingFeePerMin: 25,
    cancellationFee: 500,
    platformCommissionPct: 15,
    isActive: true,
  },
  {
    vehicleType: "TRICYCLE",
    basePrice: 600,
    pricePerKm: 180,
    pricePerMin: 35,
    minimumPrice: 1000,
    waitingFeePerMin: 30,
    cancellationFee: 700,
    platformCommissionPct: 15,
    isActive: true,
  },
  {
    vehicleType: "STANDARD",
    basePrice: 1000,
    pricePerKm: 250,
    pricePerMin: 50,
    minimumPrice: 1500,
    waitingFeePerMin: 50,
    cancellationFee: 1000,
    platformCommissionPct: 18,
    isActive: true,
  },
  {
    vehicleType: "CONFORT",
    basePrice: 1500,
    pricePerKm: 350,
    pricePerMin: 70,
    minimumPrice: 2200,
    waitingFeePerMin: 75,
    cancellationFee: 1500,
    platformCommissionPct: 18,
    isActive: true,
  },
  {
    vehicleType: "VIP",
    basePrice: 3000,
    pricePerKm: 600,
    pricePerMin: 120,
    minimumPrice: 5000,
    waitingFeePerMin: 150,
    cancellationFee: 3000,
    platformCommissionPct: 20,
    isActive: true,
  },
];

const rulesSeed: SurgeRule[] = [
  {
    id: "surge-1",
    zone: "Cotonou centre + Akpakpa",
    timeRange: "07:00 → 09:30",
    multiplier: 1.4,
    weekDays: "Lun → Ven",
    isActive: true,
  },
  {
    id: "surge-2",
    zone: "Calavi axe Akassato",
    timeRange: "17:00 → 19:30",
    multiplier: 1.5,
    weekDays: "Lun → Ven",
    isActive: true,
  },
  {
    id: "surge-3",
    zone: "Aéroport Cardinal Bernardin",
    timeRange: "00:00 → 05:00",
    multiplier: 1.6,
    weekDays: "Tous les jours",
    isActive: true,
  },
  {
    id: "surge-4",
    zone: "Sortie de match Stade GMK",
    timeRange: "Événementiel",
    multiplier: 2,
    weekDays: "Sur déclenchement",
    isActive: false,
  },
];

export type NewSurgeInput = Omit<SurgeRule, "id" | "isActive">;

interface VtcPricingStore {
  tiers: PricingTier[];
  surgeRules: SurgeRule[];
  updateTier: (vehicleType: VehicleType, partial: Partial<PricingTier>) => void;
  toggleTier: (vehicleType: VehicleType) => void;
  createSurge: (input: NewSurgeInput) => string;
  updateSurge: (id: string, partial: Partial<SurgeRule>) => void;
  toggleSurge: (id: string) => void;
  removeSurge: (id: string) => void;
}

export const useVtcPricingStore = create<VtcPricingStore>((set) => ({
  tiers: tiersSeed,
  surgeRules: rulesSeed,
  updateTier: (vehicleType, partial) =>
    set((s) => ({
      tiers: s.tiers.map((t) =>
        t.vehicleType === vehicleType ? { ...t, ...partial } : t,
      ),
    })),
  toggleTier: (vehicleType) =>
    set((s) => ({
      tiers: s.tiers.map((t) =>
        t.vehicleType === vehicleType ? { ...t, isActive: !t.isActive } : t,
      ),
    })),
  createSurge: (input) => {
    const id = `surge-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`;
    set((s) => ({
      surgeRules: [{ id, isActive: true, ...input }, ...s.surgeRules],
    }));
    return id;
  },
  updateSurge: (id, partial) =>
    set((s) => ({
      surgeRules: s.surgeRules.map((r) => (r.id === id ? { ...r, ...partial } : r)),
    })),
  toggleSurge: (id) =>
    set((s) => ({
      surgeRules: s.surgeRules.map((r) =>
        r.id === id ? { ...r, isActive: !r.isActive } : r,
      ),
    })),
  removeSurge: (id) =>
    set((s) => ({ surgeRules: s.surgeRules.filter((r) => r.id !== id) })),
}));
