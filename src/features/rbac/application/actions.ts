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
    const msg = error.message || fallback;
    if (msg.includes("Admin not found")) {
      return { ok: false, message: "Profil admin introuvable. Le backend nécessite un adminId (pas un userId). Demandez à l'équipe backend d'ajouter adminId dans /api/admin/users." };
    }
    return { ok: false, message: msg };
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
    return { ok: true, message: `Permission '${permissionCode}' accordée.` };
  } catch (e) {
    return fail(e, "Octroi impossible.");
  }
}

export interface CreatePermissionInput {
  code: string;
  name: string;
  module: string;
  category: string;
}

export interface CreatedPermission {
  id: string;
  code: string;
  name: string;
  module: string;
  category: string;
}

export async function createPermissionAction(
  input: CreatePermissionInput,
): Promise<ActionResult<CreatedPermission>> {
  try {
    const data = await apiFetch<CreatedPermission>(
      API_ROUTES.admin.createPermission(),
      { method: "POST", body: input },
    );
    revalidatePath("/settings");
    return { ok: true, message: `Permission '${input.code}' créée.`, data };
  } catch (e) {
    return fail(e, "Création de la permission impossible.");
  }
}

export interface UpdateRolePermissionsResult {
  roleId: string;
  roleName: string;
  added: string[];
  removed: string[];
  totalPermissions: number;
}

export async function updateRolePermissionsAction(
  roleId: string,
  add: string[],
  remove: string[],
): Promise<ActionResult<UpdateRolePermissionsResult>> {
  try {
    const data = await apiFetch<UpdateRolePermissionsResult>(
      API_ROUTES.admin.updateRolePermissions(roleId),
      { method: "PATCH", body: { add, remove } },
    );
    revalidatePath("/settings");
    const parts: string[] = [];
    if (data.added.length) parts.push(`+${data.added.length} ajoutée(s)`);
    if (data.removed.length) parts.push(`−${data.removed.length} retirée(s)`);
    return {
      ok: true,
      message: `${data.roleName} : ${parts.join(", ")}. Total : ${data.totalPermissions} permissions.`,
      data,
    };
  } catch (e) {
    return fail(e, "Mise à jour des permissions du rôle impossible.");
  }
}

export async function changeAdminRoleAction(
  adminId: string,
  roleId: string,
): Promise<ActionResult> {
  try {
    await apiFetch<unknown>(API_ROUTES.admin.updateAdminRole(adminId), {
      method: "PATCH",
      body: { roleId },
    });
    revalidatePath("/settings");
    return { ok: true, message: "Rôle mis à jour." };
  } catch (e) {
    return fail(e, "Changement de rôle impossible.");
  }
}
