"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/features/auth/presentation/use-permissions";

interface CanViewProps {
  children: ReactNode;
  /** Hide unless admin holds this single permission. */
  permission?: string;
  /** Hide unless admin holds at least one of these permissions. */
  anyOf?: string[];
  /** Hide unless admin holds ALL of these permissions. */
  allOf?: string[];
  /** Rendered instead of children when access is denied. Defaults to null. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current admin's permissions.
 * SUPER_ADMIN always passes through.
 *
 * @example
 * <CanView permission="driver.approve">
 *   <Button>Approuver</Button>
 * </CanView>
 *
 * <CanView anyOf={["vehicle.manage", "vehicle.verify"]}>
 *   <VehicleActions />
 * </CanView>
 */
export function CanView({ children, permission, anyOf, allOf, fallback = null }: CanViewProps) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = true;
  if (permission) allowed = can(permission);
  else if (anyOf) allowed = canAny(anyOf);
  else if (allOf) allowed = canAll(allOf);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
