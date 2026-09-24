import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bike,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Car,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FileText,
  Gauge,
  Gift,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Package,
  PackageOpen,
  Radio,
  Route as RouteIcon,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Handshake,
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
        requiredPermissions: ["ride.view_all", "driver.view_all", "passenger.view_all", "vehicle.view_all", "fleet.monitor"],
        children: [
          {
            href: "/vtc/rides",
            label: "Courses",
            icon: ListChecks,
            dataSource: "live",
            requiredPermissions: ["ride.view_all"],
          },
          {
            href: "/vtc/rides/scheduled",
            label: "Réservations à affecter",
            icon: CalendarClock,
            dataSource: "live",
            requiredPermissions: ["ride.scheduled.assign.view"],
          },
          {
            href: "/vtc/drivers",
            label: "Pilotes",
            icon: UserCheck,
            dataSource: "live",
            requiredPermissions: ["driver.view_all"],
          },
          {
            href: "/vtc/passengers",
            label: "Clients passagers",
            icon: Users,
            dataSource: "mock",
            requiredPermissions: ["passenger.view_all"],
          },
          {
            href: "/vtc/vehicles",
            label: "Véhicules",
            icon: Car,
            dataSource: "live",
            requiredPermissions: ["vehicle.view_all"],
          },
          {
            href: "/vtc/fleet",
            label: "Suivi flotte",
            icon: Radio,
            dataSource: "live",
            requiredPermissions: ["fleet.monitor"],
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
        requiredPermissions: ["delivery_b2c.view_all", "delivery_b2c.manage"],
        children: [
          {
            href: "/delivery-b2b",
            label: "Tableau de bord",
            icon: LayoutDashboard,
            dataSource: "mock",
            requiredPermissions: ["delivery_b2c.view_all"],
          },
          {
            href: "/delivery-b2b/shipments",
            label: "Livraisons",
            icon: ClipboardList,
            dataSource: "live",
            requiredPermissions: ["delivery_b2c.view_all"],
          },
          {
            href: "/delivery-b2b/couriers",
            label: "Livreurs",
            icon: Bike,
            dataSource: "mock",
            requiredPermissions: ["delivery_b2c.view_all"],
          },
          {
            href: "/delivery-b2b/senders",
            label: "Clients expéditeurs",
            icon: BriefcaseBusiness,
            dataSource: "mock",
            requiredPermissions: ["delivery_b2c.view_all"],
          },
          {
            href: "/delivery-b2b/planning",
            label: "Planning du jour",
            icon: RouteIcon,
            dataSource: "mock",
            requiredPermissions: ["delivery_b2c.view_all"],
          },
          {
            href: "/delivery-b2b/pricing",
            label: "Tarifs",
            icon: Banknote,
            dataSource: "mock",
            requiredPermissions: ["delivery_b2c.view_all"],
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
        requiredPermissions: ["promo.view"],
      },
      {
        label: "Parrainage",
        icon: Gift,
        requiredPermissions: ["referral.view_all", "referral.config.view"],
        children: [
          {
            href: "/referrals",
            label: "Tous les parrainages",
            icon: Users,
            dataSource: "live",
            requiredPermissions: ["referral.view_all"],
          },
          {
            href: "/referrals/parrains",
            label: "Parrains",
            icon: UserCheck,
            dataSource: "live",
            requiredPermissions: ["referral.view_all"],
          },
          {
            href: "/referrals/filleuls",
            label: "Filleuls",
            icon: UserPlus,
            dataSource: "live",
            requiredPermissions: ["referral.view_all"],
          },
          {
            href: "/referrals/config",
            label: "Configuration",
            icon: Settings,
            dataSource: "live",
            requiredPermissions: ["referral.config.view"],
          },
        ],
      },
      {
        label: "Affiliés",
        icon: Handshake,
        requiredPermissions: ["affiliate.view", "affiliate.manage", "affiliate.config.manage"],
        children: [
          {
            href: "/affiliate",
            label: "Tous les affiliés",
            icon: Users,
            dataSource: "live",
            requiredPermissions: ["affiliate.view"],
          },
          {
            href: "/affiliate/commission-skips",
            label: "Usages sans commission",
            icon: ShieldAlert,
            dataSource: "live",
            requiredPermissions: ["affiliate.view"],
          },
          {
            href: "/affiliate/config",
            label: "Configuration",
            icon: Settings,
            dataSource: "live",
            requiredPermissions: ["affiliate.config.manage"],
          },
        ],
      },
      {
        href: "/vtc/driver-bonus",
        label: "Bonus pilotes",
        icon: Star,
        dataSource: "live",
        requiredPermissions: ["driver_bonus.config.view", "driver_bonus.awards.view"],
      },
      {
        href: "/notifications",
        label: "Notifications",
        icon: Megaphone,
        dataSource: "live",
        requiredPermissions: ["notification.send"],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        href: "/vtc/pricing",
        label: "Tarifs & surge",
        icon: TrendingUp,
        dataSource: "live",
        requiredPermissions: ["pricing.grid.configure"],
      },
      {
        label: "Contrats location-vente",
        icon: FileText,
        requiredPermissions: ["contract.view_all"],
        children: [
          {
            href: "/contracts",
            label: "Tous les contrats",
            icon: ListChecks,
            dataSource: "live",
            requiredPermissions: ["contract.view_all"],
          },
          {
            href: "/contracts/recovery",
            label: "Recouvrements en cours",
            icon: TrendingDown,
            dataSource: "live",
            requiredPermissions: ["contract.view_all"],
          },
          {
            href: "/contracts/rapport-quotidien",
            label: "Rapport de collecte",
            icon: FileBarChart2,
            dataSource: "live",
            requiredPermissions: ["contract.view_all"],
          },
          {
            href: "/contracts/pilotes-actifs",
            label: "Pilotes en contrat",
            icon: Users,
            dataSource: "live",
            requiredPermissions: ["contract.view_all"],
          },
          {
            href: "/finance/receivables",
            label: "Vue créances",
            icon: TrendingDown,
            dataSource: "live",
            requiredPermissions: ["contract.view_all"],
          },
        ],
      },
      {
        label: "Wallet & transactions",
        icon: CreditCard,
        requiredPermissions: ["wallet.view_all", "transaction.view_all", "wallet.grant.view", "wallet.grant.request"],
        children: [
          {
            href: "/wallet",
            label: "Wallets",
            icon: Wallet,
            dataSource: "live",
            requiredPermissions: ["wallet.view_all"],
          },
          {
            href: "/wallet/transactions",
            label: "Transactions",
            icon: TrendingUp,
            dataSource: "live",
            requiredPermissions: ["wallet.view_all", "transaction.view_all"],
          },
          {
            href: "/wallet/grants",
            label: "Campagnes de crédit",
            icon: Gift,
            dataSource: "live",
            requiredPermissions: ["wallet.grant.view", "wallet.grant.request"],
          },
        ],
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
        requiredPermissions: ["admin.view_all", "app_config.manage"],
      },
    ],
  },
];
