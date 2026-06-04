import type { ReactNode } from "react";
import { DashboardShell } from "@/shared/ui/layout/dashboard-shell";
import { requireAdmin } from "@/features/auth/application/dal";
import { fullName } from "@/features/auth/domain/entity/admin";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <DashboardShell
      adminName={fullName(admin)}
      adminRole={admin.role.displayName}
      adminRoleName={admin.role.name}
      adminPermissions={admin.permissions ?? []}
    >
      {children}
    </DashboardShell>
  );
}
