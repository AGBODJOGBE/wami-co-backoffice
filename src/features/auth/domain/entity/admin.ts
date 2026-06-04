export type AdminStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export interface AdminRoleSummary {
  id: string;
  name: string;
  displayName: string;
}

export interface AdminProfile {
  userId: string;
  adminId: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: AdminRoleSummary;
  permissions: readonly string[];
  department?: string;
  status: AdminStatus;
}

export interface LoginPayload {
  token: string;
  admin: AdminProfile;
}

export const fullName = (admin: Pick<AdminProfile, "firstName" | "lastName">) =>
  `${admin.firstName} ${admin.lastName}`.trim();
