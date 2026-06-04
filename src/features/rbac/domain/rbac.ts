/**
 * RBAC domain. Mirrors:
 *   GET  /api/admin/me/permissions
 *   GET  /api/admin/roles
 *   GET  /api/admin/permissions  (grouped by module)
 *   POST /api/admin/admins/{adminId}/grant-permission
 */

export interface RbacPermission {
  id: string;
  code: string;
  name: string;
  module?: string;
  category?: string;
}

export interface RbacRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem?: boolean;
  permissions: RbacPermission[];
}

export interface MyPermissions {
  adminId: string;
  role: { id: string; name: string; displayName: string };
  permissions: RbacPermission[];
  grantedOverrides: RbacPermission[];
  revokedOverrides: RbacPermission[];
}

export interface PermissionsByModule {
  permissions: Record<string, RbacPermission[]>;
  total: number;
}
