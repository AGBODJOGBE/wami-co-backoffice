import "server-only";

import { API_ROUTES } from "@/shared/config/api-routes";
import { apiFetch } from "@/shared/lib/api/server";
import type {
  MyPermissions,
  PermissionsByModule,
  RbacRole,
} from "../domain/rbac";

export function getMyPermissions(): Promise<MyPermissions> {
  return apiFetch<MyPermissions>(API_ROUTES.admin.myPermissions());
}

export async function listRoles(): Promise<RbacRole[]> {
  const raw = await apiFetch<{ roles?: RbacRole[] } | RbacRole[]>(
    API_ROUTES.admin.roles(),
  );
  if (Array.isArray(raw)) return raw;
  return raw.roles ?? [];
}

export function listPermissionsByModule(): Promise<PermissionsByModule> {
  return apiFetch<PermissionsByModule>(API_ROUTES.admin.permissions());
}
