/** Admin user as returned by GET /api/admin/users?isAdmin=true */
export interface AdminUser {
  userId: string;
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
