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

// ─── Break / résiliation ─────────────────────────────────────────────────────

export async function breakContractAction(
  contractId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminContracts.break(contractId), {
      method: "POST",
      body: { reason },
    });
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, message: "Contrat résilié." };
  } catch (e) {
    return fail(e, "Impossible de résilier le contrat.");
  }
}
