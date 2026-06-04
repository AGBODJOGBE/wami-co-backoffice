"use client";

import { create } from "zustand";

export interface PassengerRow {
  passengerId: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  walletBalance: number;
  totalRides: number;
  rating: number;
  isSuspended: boolean;
  registeredAgo: string;
  lastActivity: string;
}

const seed: PassengerRow[] = [
  {
    passengerId: "18cc4020-0001",
    fullName: "Aline Kouassi",
    phone: "+229 0162 84 51 09",
    email: "aline.kouassi@gmail.com",
    city: "Cotonou",
    walletBalance: 14500,
    totalRides: 47,
    rating: 4.9,
    isSuspended: false,
    registeredAgo: "il y a 8 mois",
    lastActivity: "il y a 4 min",
  },
  {
    passengerId: "18cc4020-0002",
    fullName: "Yann Bognon",
    phone: "+229 0166 33 42 01",
    email: "ybognon@yahoo.fr",
    city: "Calavi",
    walletBalance: 32000,
    totalRides: 112,
    rating: 4.8,
    isSuspended: false,
    registeredAgo: "il y a 14 mois",
    lastActivity: "il y a 7 min",
  },
  {
    passengerId: "18cc4020-0003",
    fullName: "Esther Nlandu",
    phone: "+229 0140 55 91 27",
    email: "esther.n@gmail.com",
    city: "Cotonou",
    walletBalance: 0,
    totalRides: 4,
    rating: 5,
    isSuspended: false,
    registeredAgo: "il y a 3 j",
    lastActivity: "il y a 9 min",
  },
  {
    passengerId: "18cc4020-0004",
    fullName: "David Olatundji",
    phone: "+229 0177 12 88 03",
    email: "d.olatundji@gmail.com",
    city: "Cotonou",
    walletBalance: 87200,
    totalRides: 254,
    rating: 4.7,
    isSuspended: false,
    registeredAgo: "il y a 2 ans",
    lastActivity: "il y a 12 min",
  },
  {
    passengerId: "18cc4020-0005",
    fullName: "Marlène Pognon",
    phone: "+229 0150 02 11 90",
    email: "marlene.p@yahoo.fr",
    city: "Porto-Novo",
    walletBalance: 5400,
    totalRides: 23,
    rating: 3.4,
    isSuspended: true,
    registeredAgo: "il y a 11 mois",
    lastActivity: "il y a 21 min",
  },
  {
    passengerId: "18cc4020-0006",
    fullName: "Patricia Hounsou",
    phone: "+229 0182 91 05 44",
    email: "patricia.h@gmail.com",
    city: "Cotonou",
    walletBalance: 11200,
    totalRides: 68,
    rating: 4.9,
    isSuspended: false,
    registeredAgo: "il y a 6 mois",
    lastActivity: "il y a 32 min",
  },
  {
    passengerId: "18cc4020-0007",
    fullName: "Augustin Hessou",
    phone: "+229 0162 12 47 88",
    email: "a.hessou@gmail.com",
    city: "Cotonou",
    walletBalance: 0,
    totalRides: 91,
    rating: 4.6,
    isSuspended: false,
    registeredAgo: "il y a 1 an",
    lastActivity: "il y a 4 min",
  },
  {
    passengerId: "18cc4020-0008",
    fullName: "Béatrice Atchadé",
    phone: "+229 0166 92 05 71",
    email: "beatrice.a@gmail.com",
    city: "Cotonou",
    walletBalance: 6800,
    totalRides: 34,
    rating: 4.8,
    isSuspended: false,
    registeredAgo: "il y a 5 mois",
    lastActivity: "il y a 57 min",
  },
];

export interface NewPassengerInput {
  fullName: string;
  phone: string;
  email: string;
  city: string;
}

interface PassengersStore {
  passengers: PassengerRow[];
  create: (input: NewPassengerInput) => string;
  update: (id: string, partial: Partial<PassengerRow>) => void;
  suspend: (id: string) => void;
  reactivate: (id: string) => void;
  remove: (id: string) => void;
}

export const usePassengersStore = create<PassengersStore>((set) => ({
  passengers: seed,
  create: (input) => {
    const newPassenger: PassengerRow = {
      passengerId: `18cc4020-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      city: input.city,
      walletBalance: 0,
      totalRides: 0,
      rating: 0,
      isSuspended: false,
      registeredAgo: "à l'instant",
      lastActivity: "à l'instant",
    };
    set((s) => ({ passengers: [newPassenger, ...s.passengers] }));
    return newPassenger.passengerId;
  },
  update: (id, partial) =>
    set((s) => ({
      passengers: s.passengers.map((p) =>
        p.passengerId === id ? { ...p, ...partial } : p,
      ),
    })),
  suspend: (id) =>
    set((s) => ({
      passengers: s.passengers.map((p) =>
        p.passengerId === id ? { ...p, isSuspended: true } : p,
      ),
    })),
  reactivate: (id) =>
    set((s) => ({
      passengers: s.passengers.map((p) =>
        p.passengerId === id ? { ...p, isSuspended: false } : p,
      ),
    })),
  remove: (id) =>
    set((s) => ({
      passengers: s.passengers.filter((p) => p.passengerId !== id),
    })),
}));
