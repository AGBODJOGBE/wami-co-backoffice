"use client";

import { create } from "zustand";

export type PartnerType = "RESTAURANT" | "PHARMACY" | "RETAIL" | "ENTERPRISE";
export type PartnerStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export interface PartnerRow {
  partnerId: string;
  name: string;
  type: PartnerType;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: PartnerStatus;
  ordersThisMonth: number;
  warehouseCount: number;
  joinedAgo: string;
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  RESTAURANT: "Restaurant",
  PHARMACY: "Pharmacie",
  RETAIL: "Commerce",
  ENTERPRISE: "Entreprise",
};

const seed: PartnerRow[] = [
  {
    partnerId: "partner-0001",
    name: "Pharmacie Étoile Rouge",
    type: "PHARMACY",
    city: "Cotonou",
    contactName: "Dr. Mireille Sodjihoun",
    contactPhone: "+229 0190 12 33 47",
    contactEmail: "etoile.rouge@pharmas.bj",
    status: "APPROVED",
    ordersThisMonth: 142,
    warehouseCount: 1,
    joinedAgo: "il y a 2 ans",
  },
  {
    partnerId: "partner-0002",
    name: "Restaurant Le Médicis",
    type: "RESTAURANT",
    city: "Cotonou",
    contactName: "Chef Akplogan",
    contactPhone: "+229 0162 84 51 09",
    contactEmail: "lemedicis@food.bj",
    status: "APPROVED",
    ordersThisMonth: 487,
    warehouseCount: 1,
    joinedAgo: "il y a 14 mois",
  },
  {
    partnerId: "partner-0003",
    name: "Showroom Décoration Plus",
    type: "RETAIL",
    city: "Cotonou",
    contactName: "Mme Tossou",
    contactPhone: "+229 0177 22 14 88",
    contactEmail: "decoplus@retail.bj",
    status: "APPROVED",
    ordersThisMonth: 23,
    warehouseCount: 2,
    joinedAgo: "il y a 8 mois",
  },
  {
    partnerId: "partner-0004",
    name: "Pizzeria Roma",
    type: "RESTAURANT",
    city: "Cotonou",
    contactName: "Marco Bianchi",
    contactPhone: "+229 0188 04 81 22",
    contactEmail: "roma@food.bj",
    status: "PENDING",
    ordersThisMonth: 0,
    warehouseCount: 1,
    joinedAgo: "il y a 4 j",
  },
  {
    partnerId: "partner-0005",
    name: "Cabinet d'avocats Aïhou",
    type: "ENTERPRISE",
    city: "Cotonou",
    contactName: "Maître Aïhou",
    contactPhone: "+229 0190 11 22 03",
    contactEmail: "secretariat@aihou-avocats.bj",
    status: "APPROVED",
    ordersThisMonth: 38,
    warehouseCount: 1,
    joinedAgo: "il y a 11 mois",
  },
  {
    partnerId: "partner-0006",
    name: "Pharmacie Centrale Porto-Novo",
    type: "PHARMACY",
    city: "Porto-Novo",
    contactName: "Dr. Bognon",
    contactPhone: "+229 0166 22 81 00",
    contactEmail: "centrale.pn@pharmas.bj",
    status: "SUSPENDED",
    ordersThisMonth: 0,
    warehouseCount: 1,
    joinedAgo: "il y a 6 mois",
  },
];

export interface NewPartnerInput {
  name: string;
  type: PartnerType;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  warehouseCount: number;
}

interface PartnersStore {
  partners: PartnerRow[];
  create: (input: NewPartnerInput) => string;
  update: (id: string, partial: Partial<PartnerRow>) => void;
  approve: (id: string) => void;
  suspend: (id: string) => void;
  reactivate: (id: string) => void;
  remove: (id: string) => void;
}

export const usePartnersStore = create<PartnersStore>((set) => ({
  partners: seed,
  create: (input) => {
    const partner: PartnerRow = {
      partnerId: `partner-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`,
      ...input,
      status: "PENDING",
      ordersThisMonth: 0,
      joinedAgo: "à l'instant",
    };
    set((s) => ({ partners: [partner, ...s.partners] }));
    return partner.partnerId;
  },
  update: (id, partial) =>
    set((s) => ({
      partners: s.partners.map((p) =>
        p.partnerId === id ? { ...p, ...partial } : p,
      ),
    })),
  approve: (id) =>
    set((s) => ({
      partners: s.partners.map((p) =>
        p.partnerId === id ? { ...p, status: "APPROVED" } : p,
      ),
    })),
  suspend: (id) =>
    set((s) => ({
      partners: s.partners.map((p) =>
        p.partnerId === id ? { ...p, status: "SUSPENDED" } : p,
      ),
    })),
  reactivate: (id) =>
    set((s) => ({
      partners: s.partners.map((p) =>
        p.partnerId === id ? { ...p, status: "APPROVED" } : p,
      ),
    })),
  remove: (id) =>
    set((s) => ({ partners: s.partners.filter((p) => p.partnerId !== id) })),
}));
