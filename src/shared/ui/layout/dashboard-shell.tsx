"use client";

import { Suspense, useState, type ReactNode } from "react";
import { PermissionsProvider } from "@/features/auth/presentation/permissions-context";
import { NavProgress } from "./nav-progress";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export interface DashboardShellProps {
  children: ReactNode;
  adminName: string;
  adminRole: string;
  adminRoleName: string;
  adminPermissions: readonly string[];
  pendingDriversCount?: number;
}

export function DashboardShell({
  children,
  adminName,
  adminRole,
  adminRoleName,
  adminPermissions,
  pendingDriversCount = 0,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PermissionsProvider permissions={adminPermissions} roleName={adminRoleName}>
      <div className="min-h-dvh">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          adminRoleName={adminRoleName}
          adminPermissions={adminPermissions}
          pendingDriversCount={pendingDriversCount}
        />
        <div className="flex min-h-dvh flex-col lg:pl-72">
          <Topbar
            onMenuToggle={() => setSidebarOpen((v) => !v)}
            adminName={adminName}
            adminRole={adminRole}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
