import type { ReactNode } from "react";
import { DashboardShell } from "@/shared/ui/layout/dashboard-shell";
import { requireAdmin } from "@/features/auth/application/dal";
import { fullName } from "@/features/auth/domain/entity/admin";
import { listPendingDrivers } from "@/features/drivers/application/api";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [admin, pendingDriversCount] = await Promise.all([
    requireAdmin(),
    listPendingDrivers()
      .then((r) => r.drivers.length)
      .catch(() => 0),
  ]);

  return (
    <DashboardShell
      adminName={fullName(admin)}
      adminRole={admin.role.displayName}
      adminRoleName={admin.role.name}
      adminPermissions={admin.permissions ?? []}
      pendingDriversCount={pendingDriversCount}
    >
      {children}
    </DashboardShell>
  );
}
