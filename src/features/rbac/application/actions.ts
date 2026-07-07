"use server";

import { revalidatePath } from "next/cache";
import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import { ApiError } from "@/shared/lib/api/types";
import {
  MISSING_PERMISSIONS,
  type SyncPermissionDetail,
  type SyncPermissionsResult,
} from "./permissions-catalog";

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

export interface CreateRoleInput {
  name: string;
  displayName: string;
  permissionIds: string[];
}

export interface CreatedRole {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
  isActive: boolean;
}

export async function createRoleAction(
  input: CreateRoleInput,
): Promise<ActionResult<CreatedRole>> {
  try {
    const data = await apiFetch<CreatedRole>(
      API_ROUTES.admin.roles(),
      { method: "POST", body: input },
    );
    revalidatePath("/settings");
    return { ok: true, message: `Rôle '${input.displayName}' créé.`, data };
  } catch (e) {
    return fail(e, "Création du rôle impossible.");
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

// ─── Permissions manquantes à synchroniser ────────────────────────────────────

export async function syncMissingPermissionsAction(): Promise<ActionResult<SyncPermissionsResult>> {
  const details: SyncPermissionDetail[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const perm of MISSING_PERMISSIONS) {
    try {
      await apiFetch<unknown>(API_ROUTES.admin.createPermission(), {
        method: "POST",
        body: perm,
      });
      details.push({ code: perm.code, name: perm.name, module: perm.module, status: "created" });
      created++;
    } catch (e) {
      const isAlreadyExists =
        e instanceof ApiError &&
        (e.status === 409 ||
          (e.message ?? "").toLowerCase().includes("exist") ||
          (e.message ?? "").toLowerCase().includes("already") ||
          (e.message ?? "").toLowerCase().includes("déjà") ||
          (e.message ?? "").toLowerCase().includes("duplicate"));
      if (isAlreadyExists) {
        details.push({ code: perm.code, name: perm.name, module: perm.module, status: "skipped" });
        skipped++;
      } else {
        const errorMsg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erreur inconnue";
        details.push({ code: perm.code, name: perm.name, module: perm.module, status: "failed", error: errorMsg });
        failed++;
      }
    }
  }

  revalidatePath("/settings");
  return {
    ok: failed === 0,
    message: `Synchronisation : ${created} créée(s), ${skipped} déjà présente(s), ${failed} échec(s).`,
    data: { created, skipped, failed, details },
  };
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
