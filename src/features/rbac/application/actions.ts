"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";

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

export async function grantPermissionAction(
  adminId: string,
  permissionCode: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.admin.grantPermission(adminId), {
      method: "POST",
      body: { permissionCode },
    });
    revalidatePath("/settings");
    return { ok: true, message: "Permission accordée." };
  } catch (e) {
    return fail(e, "Octroi impossible.");
  }
}
