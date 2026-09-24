"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, KeyRound, LogOut, Menu } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { NotificationBell } from "@/features/notifications/presentation/notification-bell";
import { TopbarSearch } from "@/features/search/presentation/topbar-search";
import { ChangePasswordModal } from "@/features/auth/presentation/components/change-password-modal";
import { logoutAction } from "@/features/auth/application/actions";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

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

      <div ref={menuRef} className="relative border-l border-[color:var(--border)] pl-3">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-3 rounded-lg px-1.5 py-1 hover:bg-[color:var(--muted)]"
        >
          <Avatar name={adminName} />
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-sm font-medium text-[color:var(--foreground)]">{adminName}</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">{adminRole}</p>
          </div>
          <ChevronDown className="size-4 text-[color:var(--muted-foreground)]" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setPasswordOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
            >
              <KeyRound className="size-4" />
              Changer mon mot de passe
            </button>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
              >
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </header>
  );
}
