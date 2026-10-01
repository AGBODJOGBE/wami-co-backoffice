"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import { getDriverCommissionDebtDetail, getDriverDailyConnectionTime, listDriverSessions } from "./api";
import type {
  DriverCommissionDebtDetail,
  DriverConnectionTimeByDayResponse,
  DriverSessionsResult,
  DriverStatusChangeResult,
  DriverType,
  UpdateDriverInfoInput,
  UpdateDriverTypeResponse,
} from "../domain/admin-driver";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function refresh(driverId?: string) {
  revalidatePath("/vtc/drivers");
  if (driverId) revalidatePath(`/vtc/drivers/${driverId}`);
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, message: error.message || fallback };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

export async function updateDriverInfoAction(
  driverId: string,
  input: UpdateDriverInfoInput,
): Promise<ActionResult> {
  try {
    await apiFetch(API_ROUTES.adminDrivers.updateInfo(driverId), {
      method: "PATCH",
      body: input,
    });
    refresh(driverId);
    return { ok: true, message: "Informations mises à jour." };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

export async function fetchDriverSessionsAction(
  driverId: string,
  params: { page?: number; limit?: number; from?: string; to?: string } = {},
): Promise<DriverSessionsResult> {
  return listDriverSessions(driverId, params);
}

export async function fetchDriverDailyConnectionTimeAction(
  driverId: string,
  params: { from: string; to: string },
): Promise<DriverConnectionTimeByDayResponse | null> {
  return getDriverDailyConnectionTime(driverId, params);
}

export async function fetchDriverCommissionDebtPageAction(
  driverId: string,
  params: { page: number; limit: number },
): Promise<DriverCommissionDebtDetail | null> {
  return getDriverCommissionDebtDetail(driverId, params);
}

export async function updateDriverTypeAction(
  driverId: string,
  driverType: DriverType,
): Promise<ActionResult<UpdateDriverTypeResponse>> {
  try {
    const data = await apiFetch<UpdateDriverTypeResponse>(
      API_ROUTES.adminDrivers.updateDriverType(driverId),
      { method: "PATCH", body: { driverType } },
    );
    refresh(driverId);
    return { ok: true, message: data.message ?? "Type de service mis à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

const DRIVER_CATEGORIES = ["STANDARD", "PREMIUM", "VIP"] as const;
export type DriverCategory = (typeof DRIVER_CATEGORIES)[number];

/** PATCH /api/users/:userId/driver-category — catégorie tarifaire/bonus du
 * chauffeur (STANDARD | PREMIUM | VIP). Distincte de la catégorie du véhicule
 * affecté. Note : cette route est scopée par USER id, pas par driver profile
 * id (contrairement à `updateDriverTypeAction` ci-dessus) — `driverId` n'est
 * utilisé ici que pour revalider la bonne page de détail. */
export async function updateDriverCategoryAction(
  userId: string,
  category: DriverCategory,
  driverId?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminUsers.updateDriverCategory(userId), {
      method: "PATCH",
      body: { category },
    });
    refresh(driverId);
    return { ok: true, message: "Catégorie tarifaire mise à jour." };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

export async function approveDriverAction(
  driverId: string,
): Promise<ActionResult<DriverStatusChangeResult>> {
  try {
    const data = await apiFetch<DriverStatusChangeResult>(
      API_ROUTES.adminDrivers.approve(driverId),
      { method: "PATCH" },
    );
    refresh(driverId);
    return { ok: true, message: data.message ?? "Driver approuvé.", data };
  } catch (e) {
    return fail(e, "Approbation impossible.");
  }
}

export async function suspendDriverAction(
  driverId: string,
  reason: string,
): Promise<ActionResult<DriverStatusChangeResult>> {
  try {
    const data = await apiFetch<DriverStatusChangeResult>(
      API_ROUTES.adminDrivers.suspend(driverId),
      { method: "PATCH", body: { reason } },
    );
    refresh(driverId);
    return { ok: true, message: data.message ?? "Driver suspendu.", data };
  } catch (e) {
    return fail(e, "Suspension impossible.");
  }
}

export async function reactivateDriverAction(
  driverId: string,
): Promise<ActionResult<DriverStatusChangeResult>> {
  try {
    const data = await apiFetch<DriverStatusChangeResult>(
      API_ROUTES.adminDrivers.reactivate(driverId),
      { method: "PATCH" },
    );
    refresh(driverId);
    return { ok: true, message: data.message ?? "Driver réactivé.", data };
  } catch (e) {
    return fail(e, "Réactivation impossible.");
  }
}
