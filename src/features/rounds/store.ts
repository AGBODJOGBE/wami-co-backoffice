"use client";

import { create } from "zustand";

export type StopStatus = "DONE" | "IN_PROGRESS" | "NEXT" | "PENDING" | "FAILED";
export type RoundStatus = "ACTIVE" | "COMPLETED" | "DELAYED" | "PLANNED" | "CANCELLED";

export interface RoundStop {
  label: string;
  address: string;
  status: StopStatus;
  eta?: string;
}

export interface Round {
  roundId: string;
  roundNumber: string;
  status: RoundStatus;
  driverName: string;
  vehicle: string;
  zone: string;
  startedAt: string;
  expectedEndAt: string;
  totalKm: number;
  stops: RoundStop[];
}

const seed: Round[] = [
  {
    roundId: "round-0001",
    roundNumber: "FY-RND-PKL27",
    status: "ACTIVE",
    driverName: "Honoré Kpogan",
    vehicle: "Bajaj Boxer 150 · MT 4488 RB",
    zone: "Cotonou centre",
    startedAt: "08:42",
    expectedEndAt: "11:15",
    totalKm: 18.4,
    stops: [
      { label: "Pickup 1", address: "Pharmacie Étoile Rouge", status: "DONE" },
      { label: "Pickup 2", address: "Cabinet d'avocats Aïhou", status: "DONE" },
      { label: "Drop 1", address: "Tribunal de 1ère instance", status: "IN_PROGRESS", eta: "9 min" },
      { label: "Drop 2", address: "Clinique des Pères", status: "NEXT", eta: "21 min" },
      { label: "Drop 3", address: "Banque BNB Vodjè", status: "PENDING", eta: "34 min" },
    ],
  },
  {
    roundId: "round-0002",
    roundNumber: "FY-RND-7VK8L",
    status: "DELAYED",
    driverName: "Bertrand Akoï",
    vehicle: "Bajaj RE 4S · TR 0142 RB",
    zone: "Cotonou — Akpakpa",
    startedAt: "07:30",
    expectedEndAt: "10:00",
    totalKm: 11.2,
    stops: [
      { label: "Pickup", address: "Restaurant Le Médicis", status: "DONE" },
      { label: "Drop 1", address: "Cadjehoun rue 12", status: "DONE" },
      { label: "Drop 2", address: "Saint Michel — appart 4B", status: "FAILED" },
      { label: "Drop 3", address: "Akpakpa Centre", status: "IN_PROGRESS", eta: "+25 min retard" },
    ],
  },
  {
    roundId: "round-0003",
    roundNumber: "FY-RND-3MQVP",
    status: "COMPLETED",
    driverName: "Robert Fagnon",
    vehicle: "Hyundai Elantra · AD 1233 RB",
    zone: "Cotonou → Calavi",
    startedAt: "06:15",
    expectedEndAt: "08:45",
    totalKm: 42.7,
    stops: [
      { label: "Pickup", address: "Showroom Décoration Plus", status: "DONE" },
      { label: "Drop 1", address: "Résidence Akassato", status: "DONE" },
      { label: "Drop 2", address: "Calavi — Awansori", status: "DONE" },
      { label: "Drop 3", address: "Calavi — IITA", status: "DONE" },
    ],
  },
  {
    roundId: "round-0004",
    roundNumber: "FY-RND-PLAN9",
    status: "PLANNED",
    driverName: "Jean Kpadonou",
    vehicle: "Kia Rio · AF 4421 RB",
    zone: "Porto-Novo → Cotonou",
    startedAt: "12:00 (prévu)",
    expectedEndAt: "14:30 (prévu)",
    totalKm: 35.0,
    stops: [
      { label: "Pickup 1", address: "Marché Ouando", status: "PENDING" },
      { label: "Pickup 2", address: "Pharmacie Centrale Porto-Novo", status: "PENDING" },
      { label: "Drop 1", address: "Cotonou — Ganhi", status: "PENDING" },
      { label: "Drop 2", address: "Cotonou — Cadjehoun", status: "PENDING" },
    ],
  },
];

export interface NewRoundInput {
  driverName: string;
  vehicle: string;
  zone: string;
  startedAt: string;
  expectedEndAt: string;
  totalKm: number;
  stops: { label: string; address: string }[];
}

interface RoundsStore {
  rounds: Round[];
  create: (input: NewRoundInput) => string;
  cancel: (id: string) => void;
  markCompleted: (id: string) => void;
  remove: (id: string) => void;
}

export const useRoundsStore = create<RoundsStore>((set) => ({
  rounds: seed,
  create: (input) => {
    const idx = Math.random().toString(36).slice(2, 7).toUpperCase();
    const round: Round = {
      roundId: `round-${idx}`,
      roundNumber: `FY-RND-${idx}`,
      status: "PLANNED",
      driverName: input.driverName,
      vehicle: input.vehicle,
      zone: input.zone,
      startedAt: `${input.startedAt} (prévu)`,
      expectedEndAt: `${input.expectedEndAt} (prévu)`,
      totalKm: input.totalKm,
      stops: input.stops.map((stop) => ({
        label: stop.label,
        address: stop.address,
        status: "PENDING" as StopStatus,
      })),
    };
    set((s) => ({ rounds: [round, ...s.rounds] }));
    return round.roundId;
  },
  cancel: (id) =>
    set((s) => ({
      rounds: s.rounds.map((r) =>
        r.roundId === id ? { ...r, status: "CANCELLED" } : r,
      ),
    })),
  markCompleted: (id) =>
    set((s) => ({
      rounds: s.rounds.map((r) =>
        r.roundId === id
          ? {
              ...r,
              status: "COMPLETED",
              stops: r.stops.map((stop) =>
                stop.status === "FAILED" ? stop : { ...stop, status: "DONE" },
              ),
            }
          : r,
      ),
    })),
  remove: (id) =>
    set((s) => ({ rounds: s.rounds.filter((r) => r.roundId !== id) })),
}));
