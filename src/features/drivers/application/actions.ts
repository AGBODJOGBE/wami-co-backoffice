"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import { listDriverSessions } from "./api";
import type { DriverSessionsResult, DriverStatusChangeResult, UpdateDriverInfoInput } from "../domain/admin-driver";

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
