import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bike,
  BriefcaseBusiness,
  Building2,
  Car,
  ClipboardList,
  CreditCard,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Package,
  PackageOpen,
  Route as RouteIcon,
  Settings,
  ShoppingBag,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { DataSource } from "@/shared/ui/data-source-badge";

export interface NavLeaf {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** Wiring status for this screen — surfaced in the sidebar as a small badge. */
  dataSource?: DataSource;
  /** If set, the sidebar hides this entry unless the admin holds at least
   * one of these permission codes (or has the SUPER_ADMIN role). */
  requiredPermissions?: readonly string[];
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavLeaf[];
  /** Used for top-level entries without children (e.g. dashboard, wallet). */
  dataSource?: DataSource;
  /** Same logic as on NavLeaf. */
  requiredPermissions?: readonly string[];
}

/** True when the admin (with given role + permission codes) is allowed to
 * see an entry tagged with the given required permissions. SUPER_ADMIN
 * always passes. Empty `required` always passes. */
export function canSeeNavEntry(
  required: readonly string[] | undefined,
  ctx: { roleName: string; permissions: readonly string[] },
): boolean {
  if (!required || required.length === 0) return true;
  if (ctx.roleName === "SUPER_ADMIN") return true;
  return required.some((code) => ctx.permissions.includes(code));
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { href: "/", label: "Tableau de bord", icon: Gauge, dataSource: "partial" },
    ],
  },
  {
    title: "Opérations",
    items: [
      {
        label: "VTC",
        icon: Car,
        children: [
          {
            href: "/vtc/rides",
            label: "Courses",
            icon: ListChecks,
            dataSource: "live",
          },
          {
            href: "/vtc/drivers",
            label: "Drivers",
            icon: UserCheck,
            dataSource: "live",
          },
          {
            href: "/vtc/passengers",
            label: "Clients passagers",
            icon: Users,
            dataSource: "mock",
          },
          {
            href: "/vtc/vehicles",
            label: "Véhicules",
            icon: Car,
            dataSource: "live",
          },
          {
            href: "/vtc/pricing",
            label: "Tarifs & surge",
            icon: TrendingUp,
            dataSource: "live",
          },
        ],
      },
      // NOTE — héritage : le dossier /app/(dashboard)/delivery-b2b/ porte
      // historiquement le pôle B2C (commandes individuelles depuis l'app
      // passager — GET /api/admin/delivery). Le dossier /app/(dashboard)/
      // delivery/ porte le pôle B2B (partenaires & entrepôts, tournées).
      // Le rename d'URL n'a pas été fait pour limiter le risque ; les
      // libellés ci-dessous reflètent la vraie nature des sections.
      {
        label: "Livraison B2C",
        icon: Package,
        children: [
          {
            href: "/delivery-b2b",
            label: "Tableau de bord",
            icon: LayoutDashboard,
            dataSource: "mock",
          },
          {
            href: "/delivery-b2b/shipments",
            label: "Livraisons",
            icon: ClipboardList,
            dataSource: "live",
          },
          {
            href: "/delivery-b2b/couriers",
            label: "Livreurs",
            icon: Bike,
            dataSource: "mock",
          },
          {
            href: "/delivery-b2b/senders",
            label: "Clients expéditeurs",
            icon: BriefcaseBusiness,
            dataSource: "mock",
          },
          {
            href: "/delivery-b2b/planning",
            label: "Planning du jour",
            icon: RouteIcon,
            dataSource: "mock",
          },
          {
            href: "/delivery-b2b/pricing",
            label: "Tarifs",
            icon: Banknote,
            dataSource: "mock",
          },
        ],
      },
      // ─── Livraison (B2B — partenaires/entrepôts/tournées) ───────────────
      // Mocké à 100 % aujourd'hui — réexposé temporairement pour itérer
      // sur le design. À recommenter dès que les endpoints backend seront
      // disponibles (GET /api/admin/partners, /rounds, /parcel-types, …).
      {
        label: "Livraison",
        icon: PackageOpen,
        children: [
          {
            href: "/delivery/orders",
            label: "Commandes",
            icon: ShoppingBag,
            dataSource: "mock",
          },
          {
            href: "/delivery/rounds",
            label: "Tournées",
            icon: RouteIcon,
            dataSource: "mock",
          },
          {
            href: "/delivery/parcel-types",
            label: "Catégories de colis",
            icon: Package,
            dataSource: "mock",
          },
          {
            href: "/delivery/partners",
            label: "Partenaires & entrepôts",
            icon: Building2,
            dataSource: "mock",
          },
          {
            href: "/delivery/pricing",
            label: "Tarifs livraison",
            icon: Banknote,
            dataSource: "mock",
          },
        ],
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        href: "/promo-codes",
        label: "Codes promo",
        icon: Tag,
        dataSource: "live",
      },
      {
        href: "/notifications",
        label: "Notifications push",
        icon: Megaphone,
        dataSource: "mock",
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        href: "/wallet",
        label: "Wallet & transactions",
        icon: CreditCard,
        dataSource: "mock",
      },
    ],
  },
  {
    title: "Système",
    items: [
      {
        href: "/settings",
        label: "Paramètres",
        icon: Settings,
        dataSource: "partial",
      },
    ],
  },
];
