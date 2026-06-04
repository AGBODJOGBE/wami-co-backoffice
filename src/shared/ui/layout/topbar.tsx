"use client";

import { Menu } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { NotificationBell } from "@/features/notifications/presentation/notification-bell";
import { TopbarSearch } from "@/features/search/presentation/topbar-search";

export interface TopbarProps {
  onMenuToggle: () => void;
  adminName?: string;
  adminRole?: string;
}

export function Topbar({
  onMenuToggle,
  adminName = "Admin",
  adminRole = "Super-admin",
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--background)]/80 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuToggle}
        className="rounded-md p-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)] lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </button>

      <TopbarSearch />

      <NotificationBell />

      <div className="flex items-center gap-3 border-l border-[color:var(--border)] pl-3">
        <Avatar name={adminName} />
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            {adminName}
          </p>
          <p className="text-xs text-[color:var(--muted-foreground)]">{adminRole}</p>
        </div>
      </div>
    </header>
  );
}
