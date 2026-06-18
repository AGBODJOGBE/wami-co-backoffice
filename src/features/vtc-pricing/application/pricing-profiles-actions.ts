"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import type {
  CreatePricingProfileInput,
  PatchPricingProfileInput,
  PricingProfile,
} from "../domain/pricing-profile";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
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

export async function createPricingProfileAction(
  input: CreatePricingProfileInput,
): Promise<ActionResult<PricingProfile>> {
  try {
    const data = await apiFetch<PricingProfile>(
      API_ROUTES.adminPricingProfiles.create(),
      { method: "POST", body: input },
    );
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Profil de tarification créé.", data };
  } catch (e) {
    return fail(e, "Création du profil impossible.");
  }
}

export async function updatePricingProfileAction(
  id: string,
  patch: PatchPricingProfileInput,
): Promise<ActionResult<PricingProfile>> {
  try {
    const data = await apiFetch<PricingProfile>(
      API_ROUTES.adminPricingProfiles.update(id),
      { method: "PATCH", body: patch },
    );
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Profil mis à jour.", data };
  } catch (e) {
    return fail(e, "Mise à jour du profil impossible.");
  }
}

export async function deletePricingProfileAction(
  id: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminPricingProfiles.remove(id), {
      method: "DELETE",
    });
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Profil supprimé." };
  } catch (e) {
    return fail(e, "Suppression du profil impossible.");
  }
}

export async function activatePricingProfileAction(
  id: string,
): Promise<ActionResult<PricingProfile>> {
  try {
    const data = await apiFetch<PricingProfile>(
      API_ROUTES.adminPricingProfiles.activate(id),
      { method: "POST" },
    );
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Profil activé.", data };
  } catch (e) {
    return fail(e, "Activation du profil impossible.");
  }
}

export async function deactivatePricingProfileAction(
  id: string,
): Promise<ActionResult<PricingProfile>> {
  try {
    const data = await apiFetch<PricingProfile>(
      API_ROUTES.adminPricingProfiles.deactivate(id),
      { method: "POST" },
    );
    revalidatePath("/vtc/pricing");
    return { ok: true, message: "Profil désactivé.", data };
  } catch (e) {
    return fail(e, "Désactivation du profil impossible.");
  }
}
