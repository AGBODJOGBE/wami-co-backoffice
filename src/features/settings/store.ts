"use client";

import { create } from "zustand";

// Legacy mock-only role taxonomy. The real RBAC comes from the backend
// (see GET /api/admin/roles). Kept here so the settings demo screen keeps
// working without touching the auth domain entity.
export type AdminRole =
  | "SUPER_ADMIN"
  | "OPS_MANAGER"
  | "FINANCE"
  | "SUPPORT_N1";

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super-admin",
  OPS_MANAGER: "Manager opérations",
  FINANCE: "Finance",
  SUPPORT_N1: "Support N1",
};

export interface AdminRow {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastLoginAgo: string;
  isActive: boolean;
}

export interface PermissionMatrix {
  permission: string;
  module: string;
  roles: Record<AdminRole, boolean>;
}

export interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastDelivery: { ago: string; status: "OK" | "FAILED" };
}

export interface AuditRow {
  id: string;
  actor: string;
  actorRole: AdminRole;
  action: string;
  target: string;
  ago: string;
  ip: string;
}

export interface CityRow {
  name: string;
  drivers: number;
  status: "Actif" | "Pilote" | "Planifié";
}

export interface PlatformConfig {
  legalName: string;
  ifu: string;
  supportEmail: string;
  supportPhone: string;
  passengerMinVersion: string;
  driverMinVersion: string;
  passengerObsoleteAt: string;
  driverObsoleteAt: string;
  mfaRequired: boolean;
  ipWhitelist: boolean;
  autoLogout: boolean;
  auditExport: boolean;
}

const adminsSeed: AdminRow[] = [
  {
    id: "admin-1",
    name: "Paméla",
    email: "pamela@4u-foryou.com",
    role: "SUPER_ADMIN",
    lastLoginAgo: "il y a 4 min",
    isActive: true,
  },
  {
    id: "admin-2",
    name: "Aïda Sodjihoun",
    email: "aida.sodjihoun@4u-foryou.com",
    role: "OPS_MANAGER",
    lastLoginAgo: "il y a 1 h",
    isActive: true,
  },
  {
    id: "admin-3",
    name: "Christophe Akplogan",
    email: "christophe.a@4u-foryou.com",
    role: "FINANCE",
    lastLoginAgo: "il y a 1 j",
    isActive: true,
  },
  {
    id: "admin-4",
    name: "Marina Tossou",
    email: "marina.t@4u-foryou.com",
    role: "SUPPORT_N1",
    lastLoginAgo: "il y a 14 min",
    isActive: true,
  },
  {
    id: "admin-5",
    name: "Stagiaire Q1 2026",
    email: "stagiaire@4u-foryou.com",
    role: "SUPPORT_N1",
    lastLoginAgo: "il y a 2 sem",
    isActive: false,
  },
];

const permissionsSeed: PermissionMatrix[] = [
  {
    permission: "Lire les courses VTC",
    module: "VTC",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: true, FINANCE: true, SUPPORT_N1: true },
  },
  {
    permission: "Annuler / rembourser une course",
    module: "VTC",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: true, FINANCE: false, SUPPORT_N1: false },
  },
  {
    permission: "Approuver un driver (KYC)",
    module: "VTC",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: true, FINANCE: false, SUPPORT_N1: false },
  },
  {
    permission: "Modifier les tarifs / surge",
    module: "VTC",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: false, FINANCE: false, SUPPORT_N1: false },
  },
  {
    permission: "Gérer les codes promo",
    module: "Marketing",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: true, FINANCE: false, SUPPORT_N1: false },
  },
  {
    permission: "Envoyer un push broadcast",
    module: "Marketing",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: true, FINANCE: false, SUPPORT_N1: false },
  },
  {
    permission: "Approuver un retrait driver",
    module: "Finance",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: false, FINANCE: true, SUPPORT_N1: false },
  },
  {
    permission: "Crédit / débit manuel wallet",
    module: "Finance",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: false, FINANCE: true, SUPPORT_N1: false },
  },
  {
    permission: "Suspendre un passager",
    module: "Système",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: true, FINANCE: false, SUPPORT_N1: true },
  },
  {
    permission: "Gérer les comptes admin",
    module: "Système",
    roles: { SUPER_ADMIN: true, OPS_MANAGER: false, FINANCE: false, SUPPORT_N1: false },
  },
];

const webhooksSeed: WebhookRow[] = [
  {
    id: "wh-1",
    url: "https://hooks.fedapay.com/4u-foryou/incoming",
    events: ["payment.success", "payment.failed", "withdraw.completed"],
    isActive: true,
    lastDelivery: { ago: "il y a 2 min", status: "OK" },
  },
  {
    id: "wh-2",
    url: "https://reporting.4u-foryou.com/internal/events",
    events: ["ride.completed", "delivery.completed", "wallet.transfer"],
    isActive: true,
    lastDelivery: { ago: "il y a 8 min", status: "OK" },
  },
  {
    id: "wh-3",
    url: "https://crm.partner-pharma.bj/foryou-deliveries",
    events: ["delivery.completed", "delivery.failed"],
    isActive: false,
    lastDelivery: { ago: "il y a 3 j", status: "FAILED" },
  },
];

const auditSeed: AuditRow[] = [
  {
    id: "audit-1",
    actor: "Aïda Sodjihoun",
    actorRole: "OPS_MANAGER",
    action: "Course annulée + remboursement complet",
    target: "FY-RD-1KP9JEXR",
    ago: "il y a 47 min",
    ip: "41.158.x.x",
  },
  {
    id: "audit-2",
    actor: "Paméla",
    actorRole: "SUPER_ADMIN",
    action: "Crédit manuel wallet",
    target: "+5 000 FCFA → driver Sandra Adoumon",
    ago: "il y a 1 h",
    ip: "41.158.x.x",
  },
  {
    id: "audit-3",
    actor: "Aïda Sodjihoun",
    actorRole: "OPS_MANAGER",
    action: "Driver suspendu",
    target: "Jean Kpadonou (motif : no-show)",
    ago: "il y a 3 h",
    ip: "41.158.x.x",
  },
  {
    id: "audit-4",
    actor: "Christophe Akplogan",
    actorRole: "FINANCE",
    action: "Retrait approuvé",
    target: "Marc Tossou — 25 000 FCFA via MoMo",
    ago: "il y a 1 j",
    ip: "41.158.x.x",
  },
  {
    id: "audit-5",
    actor: "Paméla",
    actorRole: "SUPER_ADMIN",
    action: "Surge multiplier ajouté",
    target: "Aéroport — ×1,6 — 00:00→05:00",
    ago: "il y a 2 j",
    ip: "41.158.x.x",
  },
];

const citiesSeed: CityRow[] = [
  { name: "Cotonou", drivers: 89, status: "Actif" },
  { name: "Calavi", drivers: 24, status: "Actif" },
  { name: "Porto-Novo", drivers: 12, status: "Actif" },
  { name: "Ouidah", drivers: 7, status: "Pilote" },
  { name: "Parakou", drivers: 0, status: "Planifié" },
];

const platformSeed: PlatformConfig = {
  legalName: "4U / ForYou SARL",
  ifu: "3201924881",
  supportEmail: "support@4u-foryou.com",
  supportPhone: "+229 0190 00 00 00",
  passengerMinVersion: "2.4.0",
  driverMinVersion: "3.1.2",
  passengerObsoleteAt: "2026-05-20",
  driverObsoleteAt: "2026-06-15",
  mfaRequired: true,
  ipWhitelist: false,
  autoLogout: true,
  auditExport: true,
};

export interface NewAdminInput {
  name: string;
  email: string;
  role: AdminRole;
}

export interface NewWebhookInput {
  url: string;
  events: string[];
}

interface SettingsStore {
  admins: AdminRow[];
  permissions: PermissionMatrix[];
  webhooks: WebhookRow[];
  auditLogs: AuditRow[];
  cities: CityRow[];
  platform: PlatformConfig;

  inviteAdmin: (input: NewAdminInput) => string;
  updateAdmin: (id: string, partial: Partial<AdminRow>) => void;
  toggleAdmin: (id: string) => void;
  removeAdmin: (id: string) => void;

  togglePermission: (permission: string, role: AdminRole) => void;

  createWebhook: (input: NewWebhookInput) => string;
  updateWebhook: (id: string, partial: Partial<WebhookRow>) => void;
  toggleWebhook: (id: string) => void;
  removeWebhook: (id: string) => void;
  testWebhook: (id: string) => void;

  updatePlatform: (partial: Partial<PlatformConfig>) => void;
  togglePlatformOption: (key: keyof PlatformConfig) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  admins: adminsSeed,
  permissions: permissionsSeed,
  webhooks: webhooksSeed,
  auditLogs: auditSeed,
  cities: citiesSeed,
  platform: platformSeed,

  inviteAdmin: (input) => {
    const id = `admin-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      admins: [
        {
          id,
          name: input.name,
          email: input.email,
          role: input.role,
          lastLoginAgo: "—",
          isActive: true,
        },
        ...s.admins,
      ],
    }));
    return id;
  },
  updateAdmin: (id, partial) =>
    set((s) => ({
      admins: s.admins.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    })),
  toggleAdmin: (id) =>
    set((s) => ({
      admins: s.admins.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive } : a,
      ),
    })),
  removeAdmin: (id) =>
    set((s) => ({ admins: s.admins.filter((a) => a.id !== id) })),

  togglePermission: (permission, role) =>
    set((s) => ({
      permissions: s.permissions.map((p) =>
        p.permission === permission
          ? { ...p, roles: { ...p.roles, [role]: !p.roles[role] } }
          : p,
      ),
    })),

  createWebhook: (input) => {
    const id = `wh-${Math.random().toString(36).slice(2, 5)}`;
    set((s) => ({
      webhooks: [
        {
          id,
          url: input.url,
          events: input.events,
          isActive: true,
          lastDelivery: { ago: "—", status: "OK" },
        },
        ...s.webhooks,
      ],
    }));
    return id;
  },
  updateWebhook: (id, partial) =>
    set((s) => ({
      webhooks: s.webhooks.map((w) => (w.id === id ? { ...w, ...partial } : w)),
    })),
  toggleWebhook: (id) =>
    set((s) => ({
      webhooks: s.webhooks.map((w) =>
        w.id === id ? { ...w, isActive: !w.isActive } : w,
      ),
    })),
  removeWebhook: (id) =>
    set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),
  testWebhook: (id) =>
    set((s) => ({
      webhooks: s.webhooks.map((w) =>
        w.id === id
          ? { ...w, lastDelivery: { ago: "à l'instant", status: "OK" } }
          : w,
      ),
    })),

  updatePlatform: (partial) =>
    set((s) => ({ platform: { ...s.platform, ...partial } })),
  togglePlatformOption: (key) =>
    set((s) => ({
      platform: { ...s.platform, [key]: !s.platform[key] },
    })),
}));

