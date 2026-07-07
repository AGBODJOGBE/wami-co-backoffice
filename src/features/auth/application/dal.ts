import "server-only";

import { redirect } from "next/navigation";
import type { AdminProfile } from "@/features/auth/domain/entity/admin";
import { getCurrentAdmin } from "./session";

/**
 * Verifies that an admin is currently logged in and returns the profile.
 * Redirects to /login otherwise. Use this in protected Server Components,
 * Server Actions and Route Handlers — never trust the proxy alone.
 */
export async function requireAdmin(): Promise<AdminProfile> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  return admin;
}

export async function hasPermission(code: string): Promise<boolean> {
  const admin = await getCurrentAdmin();
  if (!admin) return false;
  if (admin.role.name === "SUPER_ADMIN") return true;
  return admin.permissions.includes(code);
}

export async function hasAnyPermission(codes: string[]): Promise<boolean> {
  const admin = await getCurrentAdmin();
  if (!admin) return false;
  if (admin.role.name === "SUPER_ADMIN") return true;
  return codes.some((c) => admin.permissions.includes(c));
}

/**
 * Guards a Server Component route. Redirects to /403 if the current admin
 * does not hold the required permission. SUPER_ADMIN always passes.
 */
export async function requirePermission(code: string): Promise<void> {
  const allowed = await hasPermission(code);
  if (!allowed) redirect("/403");
}

export async function requireAnyPermission(codes: string[]): Promise<void> {
  const allowed = await hasAnyPermission(codes);
  if (!allowed) redirect("/403");
}
