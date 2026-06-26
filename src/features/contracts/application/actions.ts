"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type { Contract, CreateContractInput } from "../domain/contract";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

function fail<T = undefined>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, message: error.message || fallback };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createContractAction(
  input: CreateContractInput,
): Promise<ActionResult<Contract>> {
  try {
    const raw = await apiFetch<unknown>(API_ROUTES.adminContracts.create(), {
      method: "POST",
      body: input,
    });
    // Unwrap envelope
    const data =
      raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
        ? (raw as Record<string, unknown>).data
        : raw;
    revalidatePath("/contracts");
    return {
      ok: true,
      message: "Contrat de location-vente créé avec succès.",
      data: data as Contract,
    };
  } catch (e) {
    return fail<Contract>(e, "Impossible de créer le contrat.");
  }
}

// ─── Manual payment ───────────────────────────────────────────────────────────

export async function recordManualPaymentAction(
  installmentId: string,
  contractId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.manualPayment(installmentId), {
      method: "POST",
    });
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, message: "Paiement manuel enregistré avec succès." };
  } catch (e) {
    return fail(e, "Impossible d'enregistrer le paiement.");
  }
}

// ─── Unblock driver ───────────────────────────────────────────────────────────

export async function unblockDriverAction(
  driverId: string,
  contractId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.unblockDriver(driverId), {
      method: "POST",
    });
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, message: "Chauffeur débloqué avec succès." };
  } catch (e) {
    return fail(e, "Impossible de débloquer le chauffeur.");
  }
}

// ─── Break / résiliation ─────────────────────────────────────────────────────

/**
 * Résilie un contrat puis force le désassignement du véhicule en best-effort.
 *
 * Pourquoi le best-effort ? Le backend (BreakContractUseCase) sauvegarde
 * le contrat comme ROMPU AVANT d'appeler unassignVehicle. Si l'unassign
 * échoue côté backend (statut inattendu, etc.), le contrat reste ROMPU mais
 * le véhicule reste ASSIGNED. On corrige ça en appelant explicitement
 * POST /api/vehicles/admin/:vehicleId/unassign après la résiliation réussie.
 */
export async function breakContractAction(
  contractId: string,
  reason: string,
  vehicleId?: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.break(contractId), {
      method: "POST",
      body: { reason },
    });

    // Best-effort : libère le véhicule même si le backend a échoué en interne.
    // On ignore l'erreur si le véhicule est déjà libéré (idempotent).
    if (vehicleId) {
      try {
        await apiFetch<unknown>(API_ROUTES.vehicles.unassign(vehicleId), {
          method: "POST",
        });
      } catch {
        // Silencieux — le véhicule est peut-être déjà AVAILABLE, c'est OK.
      }
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/vtc/vehicles");
    return { ok: true, message: "Contrat résilié. Véhicule remis à disposition." };
  } catch (e) {
    return fail(e, "Impossible de résilier le contrat.");
  }
}
