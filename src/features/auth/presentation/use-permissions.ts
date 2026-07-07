"use client";

import { usePermissionsCtx } from "./permissions-context";

export interface PermissionsHandle {
  can: (code: string) => boolean;
  canAny: (codes: string[]) => boolean;
  canAll: (codes: string[]) => boolean;
  isSuperAdmin: boolean;
  roleName: string;
  permissions: readonly string[];
}

export function usePermissions(): PermissionsHandle {
  const { permissions, roleName } = usePermissionsCtx();
  const isSuperAdmin = roleName === "SUPER_ADMIN";

  return {
    can: (code) => isSuperAdmin || permissions.includes(code),
    canAny: (codes) => isSuperAdmin || codes.some((c) => permissions.includes(c)),
    canAll: (codes) => isSuperAdmin || codes.every((c) => permissions.includes(c)),
    isSuperAdmin,
    roleName,
    permissions,
  };
}
