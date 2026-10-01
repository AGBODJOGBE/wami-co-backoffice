"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

function refresh(passengerId: string) {
  revalidatePath("/vtc/passengers");
  revalidatePath(`/vtc/passengers/${passengerId}`);
}

function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof ApiError) return { ok: false, message: error.message || fallback };
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

/** POST /api/users/:id/deactivate — suspend un compte passager (User). */
export async function deactivatePassengerAction(passengerId: string): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminUsers.deactivate(passengerId), { method: "POST" });
    refresh(passengerId);
    return { ok: true, message: "Compte suspendu." };
  } catch (e) {
    return fail(e, "Suspension impossible.");
  }
}

/** POST /api/users/:id/activate — réactive un compte passager (User). */
export async function activatePassengerAction(passengerId: string): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.adminUsers.activate(passengerId), { method: "POST" });
    refresh(passengerId);
    return { ok: true, message: "Compte réactivé." };
  } catch (e) {
    return fail(e, "Réactivation impossible.");
  }
}
