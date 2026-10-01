import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type { AdminListResult, AdminUserListResult, AppVersionConfig } from "../domain/admin-user";

export async function listAdmins(): Promise<AdminListResult> {
  const raw = await apiFetch<AdminListResult>(API_ROUTES.admin.listAdmins(), {
    query: { limit: 100 },
  });
  return { admins: raw.admins ?? [], total: raw.total ?? 0, page: raw.page ?? 1, limit: raw.limit ?? 100 };
}

/** @deprecated Use listAdmins() — this hits the generic /users endpoint with a fragile filter. */
export async function listAdminUsers(): Promise<AdminUserListResult> {
  const raw = await apiFetch<AdminUserListResult>(API_ROUTES.adminUsers.list(), {
    query: { isAdmin: true, limit: 100 },
  });
  const users = (raw.users ?? []).filter((u) => u.role !== "PASSENGER" && u.role !== "DRIVER");
  return { users, total: users.length };
}

export function listAppConfigs(): Promise<AppVersionConfig[]> {
  return apiFetch<AppVersionConfig[]>(API_ROUTES.appConfig.list());
}

export interface SystemConfigEntry {
  id?: string;
  key: string;
  value: string;
  type: string;
  description?: string;
  updatedBy?: string;
  version?: number;
  updatedAt?: string;
  /** true si cette clé a une SystemConfigSpec côté backend (verrou de validation actif). */
  hasSpec?: boolean;
  /** true si la valeur actuelle a été écrite en dérogation explicite au verrou. */
  forcedOutOfBounds?: boolean;
  // Champs suivants : présents uniquement si hasSpec === true.
  /** Regroupement backend — un seul niveau ('ride', 'contract', 'pricing', 'promo-code'…). */
  module?: string;
  /** Libellé admin-friendly fourni par le backend — à préférer à la clé technique. */
  label?: string;
  /** Code d'unité fermé (FCFA, MINUTES, PERCENT_0_100…). */
  unit?: string;
  /** Valeur affichée dans l'unité humaine (déjà convertie depuis le stockage). */
  displayValue?: string;
  min?: number;
  max?: number;
  allowedValues?: string[];
  mustDivide?: number;
  /** true si la valeur stockée respecte les bornes ACTUELLES de la spec. */
  withinBounds?: boolean;
}

export interface WelcomeBonusCampaign {
  bonusAmountFcfa: number;
  maxEligibleDrivers: number;
  consumedCount: number;
  remainingSlots: number;
  isActive: boolean;
  updatedAt: string;
}

/** Lit la config de la campagne bonus de bienvenue driver (singleton). */
export async function getWelcomeBonusCampaign(): Promise<WelcomeBonusCampaign | null> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.driverWelcomeBonus.get(), { silent: true });
    if (!raw || typeof raw !== "object") return null;
    return raw as WelcomeBonusCampaign;
  } catch {
    return null;
  }
}

// ─── Wallet config ────────────────────────────────────────────────────────────

export interface WalletConfig {
  consolidationEnabled:      boolean;
  /** Ratio (0–1). Afficher ×100 en %. */
  consolidationFeeRate:      number;
  /** XOF centimes. */
  consolidationMinAmount:    number;
  p2pTransferEnabled:        boolean;
  /** Ratio (0–1). Afficher ×100 en %. */
  p2pTransferFeeRate:        number;
  /** XOF centimes. */
  p2pMinimumAmount:          number;
  /** XOF centimes. */
  withdrawalMinMobileMoney:  number;
  /** XOF centimes. */
  withdrawalMinBankTransfer: number;
  updatedBy:                 string;
  updatedAt:                 string;
}

/** GET /api/admin/wallet-config — lit la configuration wallet (singleton). */
export async function getWalletConfig(): Promise<WalletConfig | null> {
  try {
    const raw = await apiFetch<WalletConfig>(API_ROUTES.adminWalletConfig.get(), { silent: true });
    if (!raw || typeof raw !== "object") return null;
    return raw as WalletConfig;
  } catch {
    return null;
  }
}

/** Retourne toutes les clés de configuration système. */
export async function listSystemConfigs(): Promise<SystemConfigEntry[]> {
  try {
    const raw = await apiFetch<SystemConfigEntry[]>(API_ROUTES.systemConfig.list(), {
      silent: true,
    });
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** Lit une clé de config système et la retourne parsée en nombre (fallback si erreur). */
export async function getSystemConfigNumber(key: string, fallback: number): Promise<number> {
  try {
    const raw = await apiFetch<{ key: string; value: string; type: string }>(
      API_ROUTES.systemConfig.get(key),
      { silent: true },
    );
    const parsed = parseInt(raw?.value ?? "", 10);
    return isNaN(parsed) ? fallback : parsed;
  } catch {
    return fallback;
  }
}
