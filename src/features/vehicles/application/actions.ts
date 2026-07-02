"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  CreatePlatformVehicleInput,
  UpdateVehicleInput,
  VehicleCategory,
  VehicleSummary,
  VerifyVehicleResult,
} from "../domain/vehicle";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function refresh(id?: string) {
  revalidatePath("/vtc/vehicles");
  if (id) revalidatePath(`/vtc/vehicles/${id}`);
}

function fail<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    const fieldErrors = error.errors
      ? Object.entries(error.errors)
          .map(([f, msgs]) => `${f}: ${msgs.join(", ")}`)
          .join(" | ")
      : null;
    return { ok: false, message: fieldErrors || error.message || fallback };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

export async function createVehicleAction(
  input: CreatePlatformVehicleInput,
): Promise<ActionResult<VehicleSummary>> {
  try {
    const data = await apiFetch<VehicleSummary>(API_ROUTES.vehicles.create(), {
      method: "POST",
      body: input,
    });
    refresh();
    return { ok: true, message: "Véhicule créé.", data };
  } catch (e) {
    return fail(e, "Création impossible.");
  }
}

export async function updateVehicleAction(
  id: string,
  input: UpdateVehicleInput,
): Promise<ActionResult<VehicleSummary>> {
  try {
    const data = await apiFetch<VehicleSummary>(API_ROUTES.vehicles.update(id), {
      method: "PUT",
      body: input,
    });
    refresh(id);
    return { ok: true, message: "Véhicule mis à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour impossible.");
  }
}

export async function deleteVehicleAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.vehicles.remove(id), {
      method: "DELETE",
    });
    refresh();
    return { ok: true, message: "Véhicule supprimé." };
  } catch (e) {
    return fail(e, "Suppression impossible.");
  }
}

export async function verifyVehicleAction(
  id: string,
  category: VehicleCategory,
): Promise<ActionResult<VerifyVehicleResult>> {
  try {
    const data = await apiFetch<VerifyVehicleResult>(
      API_ROUTES.vehicles.verify(id),
      { method: "POST", body: { category } },
    );
    refresh(id);
    return { ok: true, message: "Véhicule vérifié.", data };
  } catch (e) {
    return fail(e, "Vérification impossible.");
  }
}

export async function rejectVehicleAction(
  id: string,
  reason: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.vehicles.reject(id), {
      method: "POST",
      body: { reason },
    });
    refresh(id);
    return { ok: true, message: "Véhicule rejeté." };
  } catch (e) {
    return fail(e, "Rejet impossible.");
  }
}

export async function assignVehicleAction(
  id: string,
  driverId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.vehicles.assign(id), {
      method: "POST",
      body: { driverId },
    });
    refresh(id);
    return { ok: true, message: "Véhicule assigné." };
  } catch (e) {
    return fail(e, "Assignation impossible.");
  }
}

export async function unassignVehicleAction(
  id: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.vehicles.unassign(id), {
      method: "POST",
      body: {},
    });
    refresh(id);
    return { ok: true, message: "Véhicule désassigné." };
  } catch (e) {
    return fail(e, "Désassignation impossible.");
  }
}

export async function setVehicleCategoryAction(
  id: string,
  newCategory: VehicleCategory,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.vehicles.setCategory(id), {
      method: "PATCH",
      body: { newCategory },
    });
    refresh(id);
    return { ok: true, message: "Catégorie mise à jour." };
  } catch (e) {
    return fail(e, "Changement de catégorie impossible.");
  }
}

export async function startMaintenanceAction(
  id: string,
  reason: string,
  estimatedCost?: number,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.vehicles.startMaintenance(id), {
      method: "POST",
      body: { reason, ...(estimatedCost != null ? { estimatedCost } : {}) },
    });
    refresh(id);
    return { ok: true, message: "Maintenance démarrée." };
  } catch (e) {
    return fail(e, "Démarrage maintenance impossible.");
  }
}

interface CompleteMaintenanceData {
  vehicleId: string;
  status: string;
  mileage: number;
  nextMaintenanceDate: string;
}

export async function completeMaintenanceAction(
  id: string,
  mileage: number,
  actualCost?: number,
): Promise<ActionResult<CompleteMaintenanceData>> {
  try {
    const data = await apiFetch<CompleteMaintenanceData>(
      API_ROUTES.vehicles.completeMaintenance(id),
      { method: "POST", body: { mileage, ...(actualCost != null ? { actualCost } : {}) } },
    );
    refresh(id);
    return { ok: true, message: "Maintenance terminée.", data };
  } catch (e) {
    return fail(e, "Clôture maintenance impossible.");
  }
}

export async function retireVehicleAction(
  id: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.vehicles.retire(id), {
      method: "POST",
      body: {},
    });
    refresh(id);
    return { ok: true, message: "Véhicule retiré." };
  } catch (e) {
    return fail(e, "Retrait impossible.");
  }
}
