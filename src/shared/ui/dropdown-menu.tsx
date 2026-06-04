"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownGroup {
  label?: string;
  items: DropdownItem[];
}

export interface DropdownMenuProps {
  groups: DropdownGroup[];
  trigger?: ReactNode;
  align?: "start" | "end";
  ariaLabel?: string;
}

export function DropdownMenu({
  groups,
  trigger,
  align = "end",
  ariaLabel = "Actions",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !panelRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
      >
        {trigger ?? <MoreVertical className="size-4" />}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          className={cn(
            "absolute top-full z-40 mt-1 min-w-56 overflow-hidden rounded-lg border border-[color:var(--border)] bg-white p-1 shadow-xl shadow-black/10 dark:bg-[color:var(--muted)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {groups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 ? (
                <div className="my-1 h-px bg-[color:var(--border)]" />
              ) : null}
              {group.label ? (
                <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  {group.label}
                </div>
              ) : null}
              <ul className="flex flex-col">
                {group.items.map((item, ii) => {
                  const Icon = item.icon;
                  return (
                    <li key={ii}>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => {
                          item.onSelect();
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition disabled:pointer-events-none disabled:opacity-40",
                          item.danger
                            ? "text-[color:var(--danger)] hover:bg-red-50 dark:hover:bg-red-500/10"
                            : "text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/60",
                        )}
                      >
                        {Icon ? <Icon className="size-4 shrink-0" /> : null}
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
