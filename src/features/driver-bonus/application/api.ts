import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  DriverBonusTierConfig,
  DriverBonusAward,
  DriverBonusAwardsResult,
  DriverBonusVehicleCategory,
  DriverBonusActivityConfig,
  DriverBonusActivityDailyLedger,
  DriverBonusActivityPayout,
  PaginatedResult,
  DriverBonusQualityConfig,
  DriverBonusQualityMonthlyLedger,
  DriverBonusRunConfig,
  BonusRunFrequency,
  ActivityTier,
  QualityTier,
} from "../domain/driver-bonus";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string { return String(v ?? ""); }
function strOrNull(v: unknown): string | null { return v != null ? String(v) : null; }
function bool(v: unknown): boolean { return Boolean(v); }
function num(v: unknown, def = 0): number { return typeof v === "number" ? v : def; }

function unwrapData(raw: unknown): unknown {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if ("data" in obj) return obj.data;
  }
  return raw;
}

function parseMeta(obj: Record<string, unknown>) {
  const meta = (obj.meta ?? {}) as Record<string, unknown>;
  return {
    total:      num(obj.total ?? meta.total, 0),
    page:       num(obj.page  ?? meta.page,  1),
    totalPages: num(obj.totalPages ?? meta.totalPages, 1),
  };
}

// ─── Système C — Paliers / Bienvenue ─────────────────────────────────────────

function parseConfig(raw: unknown): DriverBonusTierConfig {
  const o = raw as Record<string, unknown>;
  return {
    id:              str(o.id),
    name:            str(o.name),
    description:     strOrNull(o.description),
    vehicleCategory: (o.vehicleCategory as DriverBonusVehicleCategory) ?? "ALL",
    tiers:           Array.isArray(o.tiers) ? (o.tiers as { ridesThreshold: number; bonusAmount: number }[]) : [],
    isActive:        bool(o.isActive),
    isDeleted:       bool(o.isDeleted),
    createdBy:       strOrNull(o.createdBy),
    updatedBy:       strOrNull(o.updatedBy),
    createdAt:       str(o.createdAt),
    updatedAt:       str(o.updatedAt),
    activatedAt:     strOrNull(o.activatedAt),
    deactivatedAt:   strOrNull(o.deactivatedAt),
    deletedAt:       strOrNull(o.deletedAt),
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
    const data = unwrapData(raw);
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.configs)
        ? ((data as Record<string, unknown>).configs as unknown[])
        : [];
    return arr.map(parseConfig);
  } catch {
    return [];
  }
}

export async function getDriverBonusConfig(id: string): Promise<DriverBonusTierConfig | null> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.config(id), { silent: true });
    const data = unwrapData(raw);
    if (!data) return null;
    const obj = data as Record<string, unknown>;
    return parseConfig(obj.config ? (obj.config as unknown) : data);
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
    const data = unwrapData(raw) ?? raw;
    const obj = data as Record<string, unknown>;
    const awards = (Array.isArray(obj?.awards) ? obj.awards : Array.isArray(data) ? data : []) as DriverBonusAward[];
    return {
      awards,
      total: num(obj?.total, awards.length),
      page:  num(obj?.page,  1),
      limit: num(obj?.limit, 20),
    };
  } catch {
    return { awards: [], total: 0, page: 1, limit: 20 };
  }
}

// ─── Système A — Activité quotidienne ────────────────────────────────────────

function parseActivityConfig(raw: unknown): DriverBonusActivityConfig {
  const o = raw as Record<string, unknown>;
  return {
    id:              str(o.id),
    name:            str(o.name),
    description:     strOrNull(o.description),
    vehicleCategory: (o.vehicleCategory as DriverBonusVehicleCategory) ?? "ALL",
    tiers:           Array.isArray(o.tiers) ? (o.tiers as ActivityTier[]) : [],
    isActive:        bool(o.isActive),
    isDeleted:       bool(o.isDeleted),
    createdBy:       strOrNull(o.createdBy),
    updatedBy:       strOrNull(o.updatedBy),
    createdAt:       str(o.createdAt),
    updatedAt:       str(o.updatedAt),
    activatedAt:     strOrNull(o.activatedAt),
    deactivatedAt:   strOrNull(o.deactivatedAt),
    deletedAt:       strOrNull(o.deletedAt),
  };
}

export async function listActivityConfigs(filters?: {
  vehicleCategory?: DriverBonusVehicleCategory;
  isActive?: boolean;
  includeDeleted?: boolean;
}): Promise<DriverBonusActivityConfig[]> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.activityConfigs(), {
      query: filters as Record<string, string | number | boolean>,
      silent: true,
    });
    const data = unwrapData(raw);
    const arr = Array.isArray(data) ? data : [];
    return arr.map(parseActivityConfig);
  } catch {
    return [];
  }
}

export async function listActivityLedger(filters?: {
  driverId?: string;
  vehicleCategory?: DriverBonusVehicleCategory;
  from?: string;
  to?: string;
  paid?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<DriverBonusActivityDailyLedger>> {
  const empty = { items: [], total: 0, page: 1, totalPages: 0 };
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.activityLedger(), {
      query: filters as Record<string, string | number | boolean>,
      silent: true,
    });
    const data = (unwrapData(raw) ?? raw) as Record<string, unknown>;
    const items = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []) as DriverBonusActivityDailyLedger[];
    return { items, ...parseMeta(Array.isArray(data) ? { total: items.length } : data) };
  } catch {
    return empty;
  }
}

export async function listActivityPayouts(filters?: {
  driverId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<DriverBonusActivityPayout>> {
  const empty = { items: [], total: 0, page: 1, totalPages: 0 };
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.activityPayouts(), {
      query: filters as Record<string, string | number>,
      silent: true,
    });
    const data = (unwrapData(raw) ?? raw) as Record<string, unknown>;
    const items = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []) as DriverBonusActivityPayout[];
    return { items, ...parseMeta(Array.isArray(data) ? { total: items.length } : data) };
  } catch {
    return empty;
  }
}

// ─── Système B — Qualité mensuelle ───────────────────────────────────────────

function parseQualityConfig(raw: unknown): DriverBonusQualityConfig {
  const o = raw as Record<string, unknown>;
  return {
    id:               str(o.id),
    name:             str(o.name),
    description:      strOrNull(o.description),
    vehicleCategory:  (o.vehicleCategory as DriverBonusVehicleCategory) ?? "ALL",
    minRidesPerMonth: num(o.minRidesPerMonth, 50),
    tiers:            Array.isArray(o.tiers) ? (o.tiers as QualityTier[]) : [],
    isActive:         bool(o.isActive),
    isDeleted:        bool(o.isDeleted),
    createdBy:        strOrNull(o.createdBy),
    updatedBy:        strOrNull(o.updatedBy),
    createdAt:        str(o.createdAt),
    updatedAt:        str(o.updatedAt),
    activatedAt:      strOrNull(o.activatedAt),
    deactivatedAt:    strOrNull(o.deactivatedAt),
    deletedAt:        strOrNull(o.deletedAt),
  };
}

export async function listQualityConfigs(filters?: {
  vehicleCategory?: DriverBonusVehicleCategory;
  isActive?: boolean;
  includeDeleted?: boolean;
}): Promise<DriverBonusQualityConfig[]> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.qualityConfigs(), {
      query: filters as Record<string, string | number | boolean>,
      silent: true,
    });
    const data = unwrapData(raw);
    const arr = Array.isArray(data) ? data : [];
    return arr.map(parseQualityConfig);
  } catch {
    return [];
  }
}

export async function listQualityLedger(filters?: {
  driverId?: string;
  vehicleCategory?: DriverBonusVehicleCategory;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<DriverBonusQualityMonthlyLedger>> {
  const empty = { items: [], total: 0, page: 1, totalPages: 0 };
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.qualityLedger(), {
      query: filters as Record<string, string | number>,
      silent: true,
    });
    const data = (unwrapData(raw) ?? raw) as Record<string, unknown>;
    const items = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []) as DriverBonusQualityMonthlyLedger[];
    return { items, ...parseMeta(Array.isArray(data) ? { total: items.length } : data) };
  } catch {
    return empty;
  }
}

// ─── RunConfig ────────────────────────────────────────────────────────────────

const RUN_CONFIG_DEFAULTS: DriverBonusRunConfig = {
  welcomeBonusEnabled:      true,
  activityBonusEnabled:     false,
  activityJournalCronHour:  23,
  activityPayoutFrequency:  "DAILY",
  activityPayoutCronHour:   6,
  activityPayoutWeeklyDay:  1,
  activityPayoutMonthlyDay: 1,
  qualityBonusEnabled:      false,
  qualityBonusCronDay:      1,
  qualityBonusCronHour:     7,
  updatedBy:  null,
  updatedAt:  null,
};

export async function getRunConfig(): Promise<DriverBonusRunConfig> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminDriverBonus.runConfig(), { silent: true });
    const data = (unwrapData(raw) ?? raw) as Record<string, unknown>;
    return {
      welcomeBonusEnabled:      bool(data.welcomeBonusEnabled ?? RUN_CONFIG_DEFAULTS.welcomeBonusEnabled),
      activityBonusEnabled:     bool(data.activityBonusEnabled),
      activityJournalCronHour:  num(data.activityJournalCronHour,  RUN_CONFIG_DEFAULTS.activityJournalCronHour),
      activityPayoutFrequency:  (data.activityPayoutFrequency as BonusRunFrequency) ?? "DAILY",
      activityPayoutCronHour:   num(data.activityPayoutCronHour,   RUN_CONFIG_DEFAULTS.activityPayoutCronHour),
      activityPayoutWeeklyDay:  num(data.activityPayoutWeeklyDay,  RUN_CONFIG_DEFAULTS.activityPayoutWeeklyDay),
      activityPayoutMonthlyDay: num(data.activityPayoutMonthlyDay, RUN_CONFIG_DEFAULTS.activityPayoutMonthlyDay),
      qualityBonusEnabled:      bool(data.qualityBonusEnabled),
      qualityBonusCronDay:      num(data.qualityBonusCronDay,  RUN_CONFIG_DEFAULTS.qualityBonusCronDay),
      qualityBonusCronHour:     num(data.qualityBonusCronHour, RUN_CONFIG_DEFAULTS.qualityBonusCronHour),
      updatedBy:  strOrNull(data.updatedBy),
      updatedAt:  strOrNull(data.updatedAt),
    };
  } catch {
    return RUN_CONFIG_DEFAULTS;
  }
}
