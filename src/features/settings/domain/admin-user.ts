/** Admin user as returned by GET /api/admin/users?isAdmin=true */
export interface AdminUser {
  userId: string;
  /** Backend admin profile ID — needed for PATCH /admins/:id/role etc. Only known for the current user or newly created admins. */
  adminId?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserListResult {
  users: AdminUser[];
  total: number;
}

/** Shape returned by POST /api/admin/register */
export interface RegisterAdminResult {
  adminId: string;
  userId: string;
  roleName: string;
  message?: string;
}

export interface CreateAdminInput {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

/** Admin as returned by GET /api/admin/admins (dedicated admin profile endpoint). */
export interface AdminListItem {
  adminId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string;
  roleId: string;
  roleName: string;
  status: "ACTIVE" | "INACTIVE";
  createdBy: string | null;
  createdAt: string;
}

export interface AdminListResult {
  admins: AdminListItem[];
  total: number;
  page: number;
  limit: number;
}

/** App version config as returned by GET /api/app-config */
export interface AppVersionConfig {
  id: string;
  appType: "DRIVER" | "PASSENGER";
  platform: "ANDROID" | "IOS";
  latestVersion: string;
  minSupportedVersion: string;
  downloadUrl: string;
  releaseNotes: string | null;
  updatedAt: string;
}
