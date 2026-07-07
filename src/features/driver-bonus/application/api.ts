import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  DriverBonusTierConfig,
  DriverBonusAward,
  DriverBonusAwardsResult,
  DriverBonusVehicleCategory,
} from "../domain/driver-bonus";

function parseConfig(raw: unknown): DriverBonusTierConfig {
  const o = raw as Record<string, unknown>;
  return {
    id:              String(o.id ?? ""),
    name:            String(o.name ?? ""),
    description:     (o.description as string | null) ?? null,
    vehicleCategory: (o.vehicleCategory as DriverBonusVehicleCategory) ?? "ALL",
    tiers:           Array.isArray(o.tiers) ? (o.tiers as { ridesThreshold: number; bonusAmount: number }[]) : [],
    isActive:        Boolean(o.isActive),
    isDeleted:       Boolean(o.isDeleted),
    createdBy:       (o.createdBy as string | null) ?? null,
    updatedBy:       (o.updatedBy as string | null) ?? null,
    createdAt:       String(o.createdAt ?? ""),
    updatedAt:       String(o.updatedAt ?? ""),
    activatedAt:     (o.activatedAt as string | null) ?? null,
    deactivatedAt:   (o.deactivatedAt as string | null) ?? null,
    deletedAt:       (o.deletedAt as string | null) ?? null,
  };
}

export async function listDriverBonusConfigs(filters?: {
  vehicleCategory?: DriverBonusVehicleCategory;
  isActive?: boolean;
}): Promise<DriverBonusTierConfig[]> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.configs(), {
      query: filters as Record<string, string | number | boolean>,
      silent: true,
    });
    const arr = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown>)?.configs)
        ? ((raw as Record<string, unknown>).configs as unknown[])
        : [];
    return arr.map(parseConfig);
  } catch {
    return [];
  }
}

export async function getDriverBonusConfig(id: string): Promise<DriverBonusTierConfig | null> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.config(id), { silent: true });
    if (!raw) return null;
    const obj = raw as Record<string, unknown>;
    const data = obj.config ? (obj.config as unknown) : raw;
    return parseConfig(data);
  } catch {
    return null;
  }
}

export async function listDriverBonusAwards(filters?: {
  driverId?: string;
  vehicleCategory?: DriverBonusVehicleCategory;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<DriverBonusAwardsResult> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.awards(), {
      query: filters as Record<string, string | number>,
      silent: true,
    });
    const obj = raw as Record<string, unknown>;
    const awards = (Array.isArray(obj?.awards) ? obj.awards : Array.isArray(raw) ? raw : []) as DriverBonusAward[];
    return {
      awards,
      total: (obj?.total as number) ?? awards.length,
      page:  (obj?.page  as number) ?? 1,
      limit: (obj?.limit as number) ?? 20,
    };
  } catch {
    return { awards: [], total: 0, page: 1, limit: 20 };
  }
}
