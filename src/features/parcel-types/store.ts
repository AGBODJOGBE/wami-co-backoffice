"use client";

import { create } from "zustand";
import type { ParcelType } from "@/features/delivery/domain/delivery";

export interface ParcelCategoryRow {
  type: ParcelType;
  description: string;
  basePrice: number;
  pricePerKm: number;
  isActive: boolean;
  ordersThisMonth: number;
  successRate: number;
}

const seed: ParcelCategoryRow[] = [
  {
    type: "DOCUMENT",
    description: "Plis administratifs, contrats, factures",
    basePrice: 800,
    pricePerKm: 120,
    isActive: true,
    ordersThisMonth: 412,
    successRate: 96.4,
  },
  {
    type: "SMALL_PARCEL",
    description: "Petits colis du quotidien (< 5 kg)",
    basePrice: 1000,
    pricePerKm: 150,
    isActive: true,
    ordersThisMonth: 287,
    successRate: 94.1,
  },
  {
    type: "FOOD",
    description: "Repas chauds, plats préparés, glacières isothermes",
    basePrice: 700,
    pricePerKm: 130,
    isActive: true,
    ordersThisMonth: 1124,
    successRate: 92.0,
  },
  {
    type: "MEDIUM_PARCEL",
    description: "Cartons & sacs jusqu'à 15 kg",
    basePrice: 1500,
    pricePerKm: 220,
    isActive: true,
    ordersThisMonth: 142,
    successRate: 90.3,
  },
  {
    type: "FRAGILE",
    description: "Verre, électronique, instruments — manutention soignée",
    basePrice: 1800,
    pricePerKm: 250,
    isActive: true,
    ordersThisMonth: 38,
    successRate: 88.7,
  },
  {
    type: "LARGE_PARCEL",
    description: "Mobilier, électroménager — uniquement en van",
    basePrice: 4000,
    pricePerKm: 400,
    isActive: false,
    ordersThisMonth: 7,
    successRate: 100,
  },
];

interface ParcelTypesStore {
  categories: ParcelCategoryRow[];
  update: (type: ParcelType, partial: Partial<ParcelCategoryRow>) => void;
  toggleActive: (type: ParcelType) => void;
}

export const useParcelTypesStore = create<ParcelTypesStore>((set) => ({
  categories: seed,
  update: (type, partial) =>
    set((s) => ({
      categories: s.categories.map((c) =>
        c.type === type ? { ...c, ...partial } : c,
      ),
    })),
  toggleActive: (type) =>
    set((s) => ({
      categories: s.categories.map((c) =>
        c.type === type ? { ...c, isActive: !c.isActive } : c,
      ),
    })),
}));
