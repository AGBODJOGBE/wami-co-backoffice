"use client";

import { create } from "zustand";
import type { ParcelType } from "@/features/delivery/domain/delivery";

export interface Zone {
  id: string;
  label: string;
  range: string;
  basePrice: number;
  pricePerKm: number;
}

export interface ParcelMultiplier {
  parcelType: ParcelType;
  multiplier: number;
}

export interface ExpressRule {
  id: string;
  label: string;
  description: string;
  multiplier: number;
  isActive: boolean;
}

const zonesSeed: Zone[] = [
  { id: "z1", label: "Zone 1", range: "≤ 5 km", basePrice: 1000, pricePerKm: 100 },
  { id: "z2", label: "Zone 2", range: "5 → 12 km", basePrice: 1500, pricePerKm: 130 },
  { id: "z3", label: "Zone 3", range: "12 → 25 km", basePrice: 2200, pricePerKm: 180 },
  { id: "z4", label: "Zone 4", range: "> 25 km", basePrice: 3500, pricePerKm: 250 },
];

const multipliersSeed: ParcelMultiplier[] = [
  { parcelType: "DOCUMENT", multiplier: 1 },
  { parcelType: "SMALL_PARCEL", multiplier: 1.1 },
  { parcelType: "FOOD", multiplier: 1.05 },
  { parcelType: "MEDIUM_PARCEL", multiplier: 1.4 },
  { parcelType: "FRAGILE", multiplier: 1.6 },
  { parcelType: "LARGE_PARCEL", multiplier: 2.2 },
];

const rulesSeed: ExpressRule[] = [
  {
    id: "express-1",
    label: "Livraison express ≤ 30 min",
    description: "Pickup + delivery en moins de 30 minutes",
    multiplier: 1.5,
    isActive: true,
  },
  {
    id: "express-2",
    label: "Livraison nuit (22 h → 06 h)",
    description: "Surcharge horaire pour les livraisons nocturnes",
    multiplier: 1.3,
    isActive: true,
  },
  {
    id: "express-3",
    label: "Inter-villes Cotonou ↔ Porto-Novo",
    description: "Trajets longue distance avec gestion ferry / pont",
    multiplier: 1.2,
    isActive: true,
  },
];

export type NewExpressRuleInput = Omit<ExpressRule, "id" | "isActive">;
export type NewZoneInput = Omit<Zone, "id">;

interface DeliveryPricingStore {
  zones: Zone[];
  multipliers: ParcelMultiplier[];
  rules: ExpressRule[];
  updateZone: (id: string, partial: Partial<Zone>) => void;
  createZone: (input: NewZoneInput) => string;
  removeZone: (id: string) => void;
  updateMultiplier: (parcelType: ParcelType, multiplier: number) => void;
  createRule: (input: NewExpressRuleInput) => string;
  updateRule: (id: string, partial: Partial<ExpressRule>) => void;
  toggleRule: (id: string) => void;
  removeRule: (id: string) => void;
}

export const useDeliveryPricingStore = create<DeliveryPricingStore>((set) => ({
  zones: zonesSeed,
  multipliers: multipliersSeed,
  rules: rulesSeed,
  updateZone: (id, partial) =>
    set((s) => ({
      zones: s.zones.map((z) => (z.id === id ? { ...z, ...partial } : z)),
    })),
  createZone: (input) => {
    const id = `z-${Math.random().toString(36).slice(2, 5)}`;
    set((s) => ({ zones: [...s.zones, { id, ...input }] }));
    return id;
  },
  removeZone: (id) =>
    set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),
  updateMultiplier: (parcelType, multiplier) =>
    set((s) => ({
      multipliers: s.multipliers.map((m) =>
        m.parcelType === parcelType ? { ...m, multiplier } : m,
      ),
    })),
  createRule: (input) => {
    const id = `express-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      rules: [{ id, isActive: true, ...input }, ...s.rules],
    }));
    return id;
  },
  updateRule: (id, partial) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, ...partial } : r)),
    })),
  toggleRule: (id) =>
    set((s) => ({
      rules: s.rules.map((r) =>
        r.id === id ? { ...r, isActive: !r.isActive } : r,
      ),
    })),
  removeRule: (id) =>
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
}));
