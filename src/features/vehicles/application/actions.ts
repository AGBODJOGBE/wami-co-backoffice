"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { env } from "@/shared/config/env";
import { ApiError, extractFailureMessage, type ApiResponse } from "@/shared/lib/api/types";
import { SESSION_COOKIE } from "@/features/auth/application/session-cookie";
import type {
  AdminAddDriverVehicleInput,
  AdminAddVehicleResult,
  AddThirdPartyVehicleInput,
  AddThirdPartyVehicleResult,
  AdminUploadVehicleDocumentsInput,
  AdminUploadVehicleDocumentsResult,
  CreatePlatformVehicleInput,
  UpdateVehicleInput,
  SetActiveCategoriesResult,
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

// ─── Onboarding admin (multipart) ────────────────────────────────────────────
// Raw fetch — apiFetch stringifie toujours le body, incompatible avec le
// boundary multipart. Même doctrine que uploadDocumentAction (documents).

async function postMultipart<T>(path: string, fd: FormData): Promise<T> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) throw new ApiError("Session expirée.", 401);

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    body: fd,
    // multipart : ne JAMAIS fixer Content-Type — le runtime ajoute le boundary.
  });

  const rawText = await res.text();
  let payload: ApiResponse<T> | null = null;
  try { payload = JSON.parse(rawText) as ApiResponse<T>; } catch { /* not JSON */ }

  if (!res.ok || !payload || payload.success === false) {
    const message =
      (payload && payload.success === false ? extractFailureMessage(payload) : null) ||
      rawText.slice(0, 300).trim() ||
      `Échec (HTTP ${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return payload.data;
}

/** POST /api/vehicles/admin/driver/:driverId/add — véhicule + documents en un appel. */
export async function adminAddDriverVehicleAction(
  input: AdminAddDriverVehicleInput,
): Promise<ActionResult<AdminAddVehicleResult>> {
  try {
    const fd = new FormData();
    fd.set("type", input.type);
    fd.set("make", input.make);
    fd.set("model", input.model);
    fd.set("year", String(input.year));
    fd.set("color", input.color);
    fd.set("licensePlate", input.licensePlate);
    fd.set("seats", String(input.seats));
    if (input.insuranceExpiryDate) fd.set("insuranceExpiryDate", input.insuranceExpiryDate);
    fd.set("insurance", input.insuranceFile);
    if (input.registrationCardFile) fd.set("registrationCard", input.registrationCardFile);

    const data = await postMultipart<AdminAddVehicleResult>(
      API_ROUTES.vehicles.addForDriver(input.driverId),
      fd,
    );
    refresh();
    revalidatePath(`/vtc/drivers/${input.driverId}`);
    return { ok: true, message: "Véhicule ajouté pour le chauffeur.", data };
  } catch (e) {
    return fail(e, "Ajout impossible.");
  }
}

/** POST /api/vehicles/admin/third-party/add — véhicule tiers, sans chauffeur. */
export async function addThirdPartyVehicleAction(
  input: AddThirdPartyVehicleInput,
): Promise<ActionResult<AddThirdPartyVehicleResult>> {
  try {
    const fd = new FormData();
    fd.set("type", input.type);
    fd.set("make", input.make);
    fd.set("model", input.model);
    fd.set("year", String(input.year));
    fd.set("color", input.color);
    fd.set("licensePlate", input.licensePlate);
    fd.set("seats", String(input.seats));
    if (input.category) fd.set("category", input.category);
    if (input.insuranceExpiryDate) fd.set("insuranceExpiryDate", input.insuranceExpiryDate);
    if (input.ownerName) fd.set("ownerName", input.ownerName);
    if (input.ownerPhone) fd.set("ownerPhone", input.ownerPhone);
    if (input.ownerNote) fd.set("ownerNote", input.ownerNote);
    if (input.insuranceFile) fd.set("insurance", input.insuranceFile);
    if (input.registrationCardFile) fd.set("registrationCard", input.registrationCardFile);

    const data = await postMultipart<AddThirdPartyVehicleResult>(
      API_ROUTES.vehicles.addThirdParty(),
      fd,
    );
    refresh();
    return { ok: true, message: "Véhicule tiers créé.", data };
  } catch (e) {
    return fail(e, "Création impossible.");
  }
}

/** POST /api/vehicles/admin/:id/documents — ajoute/complète les documents d'un véhicule existant. */
export async function adminUploadVehicleDocumentsAction(
  input: AdminUploadVehicleDocumentsInput,
): Promise<ActionResult<AdminUploadVehicleDocumentsResult>> {
  if (!input.insuranceFile && !input.registrationCardFile) {
    return { ok: false, message: "Au moins un fichier (assurance ou carte grise) est requis." };
  }
  try {
    const fd = new FormData();
    if (input.insuranceFile) fd.set("insurance", input.insuranceFile);
    if (input.registrationCardFile) fd.set("registrationCard", input.registrationCardFile);
    if (input.insuranceExpiryDate) fd.set("insuranceExpiryDate", input.insuranceExpiryDate);

    const data = await postMultipart<AdminUploadVehicleDocumentsResult>(
      API_ROUTES.vehicles.uploadDocuments(input.vehicleId),
      fd,
    );
    refresh(input.vehicleId);
    return { ok: true, message: "Documents ajoutés.", data };
  } catch (e) {
    return fail(e, "Envoi des documents impossible.");
  }
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

export async function setVehicleActiveCategoriesAction(
  id: string,
  categories: VehicleCategory[],
): Promise<ActionResult<SetActiveCategoriesResult>> {
  try {
    const data = await apiFetch<SetActiveCategoriesResult>(
      API_ROUTES.vehicles.setActiveCategories(id),
      { method: "PATCH", body: { categories } },
    );
    refresh(id);
    return { ok: true, message: "Catégories actives mises à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour des catégories impossible.");
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
