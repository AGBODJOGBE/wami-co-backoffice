"use client";

import { create } from "zustand";
import { mockDrivers } from "./domain/mock";
import type { DriverRow, DriverStatus } from "./domain/driver";

export interface NewDriverInput {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  category: DriverRow["category"];
  vehicle: string;
  plate: string;
}

interface DriversStore {
  drivers: DriverRow[];
  create: (input: NewDriverInput) => string;
  update: (driverId: string, partial: Partial<DriverRow>) => void;
  approve: (driverId: string) => void;
  requestMissingDocs: (driverId: string, docs: string[]) => void;
  reject: (driverId: string) => void;
  suspend: (driverId: string) => void;
  reactivate: (driverId: string) => void;
  remove: (driverId: string) => void;
  setOnline: (driverId: string, isOnline: boolean) => void;
}

function nextId(): string {
  return `0625b6e0-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`;
}

export const useDriversStore = create<DriversStore>((set) => ({
  drivers: mockDrivers,

  create: (input) => {
    const newDriver: DriverRow = {
      driverId: nextId(),
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      city: input.city,
      category: input.category,
      vehicle: input.vehicle,
      plate: input.plate,
      rating: 0,
      totalRides: 0,
      status: "PENDING",
      isOnline: false,
      missingDocuments: [],
      registeredAt: new Date().toISOString(),
      registeredAgo: "à l'instant",
    };
    set((s) => ({ drivers: [newDriver, ...s.drivers] }));
    return newDriver.driverId;
  },

  update: (driverId, partial) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.driverId === driverId ? { ...d, ...partial } : d,
      ),
    })),

  approve: (driverId) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.driverId === driverId
          ? { ...d, status: "APPROVED" as DriverStatus, missingDocuments: [] }
          : d,
      ),
    })),

  requestMissingDocs: (driverId, docs) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.driverId === driverId ? { ...d, missingDocuments: docs } : d,
      ),
    })),

  reject: (driverId) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.driverId === driverId
          ? { ...d, status: "REJECTED" as DriverStatus }
          : d,
      ),
    })),

  suspend: (driverId) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.driverId === driverId
          ? { ...d, status: "SUSPENDED" as DriverStatus, isOnline: false }
          : d,
      ),
    })),

  reactivate: (driverId) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.driverId === driverId
          ? { ...d, status: "APPROVED" as DriverStatus }
          : d,
      ),
    })),

  remove: (driverId) =>
    set((s) => ({
      drivers: s.drivers.filter((d) => d.driverId !== driverId),
    })),

  setOnline: (driverId, isOnline) =>
    set((s) => ({
      drivers: s.drivers.map((d) =>
        d.driverId === driverId ? { ...d, isOnline } : d,
      ),
    })),
}));
