"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, LogOut, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  canSeeNavEntry,
  navSections,
  type NavItem,
  type NavLeaf,
} from "@/shared/config/navigation";
import { logoutAction } from "@/features/auth/application/actions";
import type { DataSource } from "@/shared/ui/data-source-badge";
import { Logo } from "./logo";

const STATUS_DOT: Record<DataSource, { className: string; title: string }> = {
  live: {
    className: "bg-emerald-400",
    title: "Live — branché sur l'API en temps réel",
  },
  partial: {
    className: "bg-amber-400",
    title: "Partiel — quelques bouts sont mockés",
  },
  mock: {
    className: "bg-rose-400",
    title: "Mock — données de démo, pas encore branché à l'API",
  },
};

function StatusDot({ source }: { source?: DataSource }) {
  if (!source) return null;
  const meta = STATUS_DOT[source];
  return (
    <span
      title={meta.title}
      aria-label={meta.title}
      className={cn(
        "ml-auto size-1.5 shrink-0 rounded-full ring-2 ring-white/15",
        meta.className,
      )}
    />
  );
}

/**
 * `pathname` "is under" `target` when one of:
 *   - they're equal,
 *   - `pathname` starts with `target` + "/" (we never want substring matches
 *     across path segments, e.g. /vtc-2 must NOT match /vtc).
 * The root "/" is a special case — only an exact match counts, otherwise it
 * would falsely match every page.
 */
function matchesAt(pathname: string, target: string): boolean {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

/**
 * Among every leaf href known to the sidebar, pick the LONGEST one that
 * matches the current pathname. That's the only entry that should light up
 * — solves the issue where /delivery-b2b/shipments would simultaneously
 * activate /delivery-b2b ("Tableau de bord") AND /delivery-b2b/shipments
 * ("Livraisons") because both prefix-match.
 */
function bestMatchHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const h of hrefs) {
    if (!matchesAt(pathname, h)) continue;
    if (best === null || h.length > best.length) best = h;
  }
  return best;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  adminRoleName?: string;
  adminPermissions?: readonly string[];
  pendingDriversCount?: number;
}

export function Sidebar({
  isOpen,
  onClose,
  adminRoleName = "",
  adminPermissions = [],
  pendingDriversCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const ctx = { roleName: adminRoleName, permissions: adminPermissions };

  // Filter sections + items + leaves according to required permissions.
  const filteredSections = useMemo(() => {
    return navSections
      .map((section) => {
        const items = section.items
          .map((item) => {
            if (!canSeeNavEntry(item.requiredPermissions, ctx)) return null;
            if (item.children) {
              const visibleChildren = item.children.filter((c) =>
                canSeeNavEntry(c.requiredPermissions, ctx),
              );
              if (visibleChildren.length === 0) return null;
              return { ...item, children: visibleChildren };
            }
            return item;
          })
          .filter((x): x is NavItem => x !== null);
        return { ...section, items };
      })
      .filter((s) => s.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminRoleName, adminPermissions.join(",")]);

  // Collect every leaf href across the filtered nav, then pick the single
  // best match for the current pathname. All "active" decisions below
  // derive from this one value.
  const activeHref = useMemo(() => {
    const allHrefs: string[] = [];
    for (const section of filteredSections) {
      for (const item of section.items) {
        if (item.children) {
          for (const child of item.children) allHrefs.push(child.href);
        } else if (item.href) {
          allHrefs.push(item.href);
        }
      }
    }
    return bestMatchHref(pathname, allHrefs);
  }, [pathname, filteredSections]);

  // Default: only the VTC group is open. Everything else stays collapsed
  // so the nav reste compacte au premier paint. L'utilisateur peut ouvrir
  // les autres au besoin.
  const initialOpenGroups = useMemo(() => {
    const open: Record<string, boolean> = {};
    for (const section of filteredSections) {
      for (const item of section.items) {
        if (item.children) open[item.label] = item.label === "VTC";
      }
    }
    return open;
  }, [filteredSections]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroups);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[color:var(--primary)] text-white transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo variant="dark" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                {section.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;

                  if (item.children) {
                    const groupActive = item.children.some(
                      (child) => child.href === activeHref,
                    );
                    const isExpanded = openGroups[item.label] ?? false;
                    return (
                      <li key={item.label}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.label)}
                          aria-expanded={isExpanded}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                            groupActive
                              ? "text-white"
                              : "text-white/75 hover:bg-white/10 hover:text-white",
                          )}
                        >
                          <ItemIcon
                            className={cn(
                              "size-4 shrink-0",
                              groupActive
                                ? "text-[color:var(--secondary)]"
                                : "text-white/60",
                            )}
                          />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 text-white/50 transition-transform",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>
                        {isExpanded ? (
                          <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                            {item.children.map((child) => (
                              <SidebarLeafLink
                                key={child.href}
                                child={child}
                                isActive={child.href === activeHref}
                                onClick={onClose}
                                badge={
                                  child.href === "/vtc/drivers" && pendingDriversCount > 0
                                    ? pendingDriversCount
                                    : undefined
                                }
                              />
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  }

                  if (!item.href) return null;
                  const active = item.href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                          active
                            ? "bg-white/15 text-white shadow-inner"
                            : "text-white/75 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <ItemIcon
                          className={cn(
                            "size-4 shrink-0",
                            active
                              ? "text-[color:var(--secondary)]"
                              : "text-white/60",
                          )}
                        />
                        <span>{item.label}</span>
                        <StatusDot source={item.dataSource} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Partiel
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-400" />
              Mock
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

function SidebarLeafLink({
  child,
  isActive,
  onClick,
  badge,
}: {
  child: NavLeaf;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  const active = isActive;
  const LeafIcon = child.icon;
  return (
    <li>
      <Link
        href={child.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition",
          active
            ? "bg-white/15 font-medium text-white"
            : "text-white/65 hover:bg-white/10 hover:text-white",
        )}
      >
        {LeafIcon ? (
          <LeafIcon
            className={cn(
              "size-3.5 shrink-0",
              active ? "text-[color:var(--secondary)]" : "text-white/50",
            )}
          />
        ) : null}
        <span className="flex-1">{child.label}</span>
        {badge !== undefined ? (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : (
          <StatusDot source={child.dataSource} />
        )}
      </Link>
    </li>
  );
}
