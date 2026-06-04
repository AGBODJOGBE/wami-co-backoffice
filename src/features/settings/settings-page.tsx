"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  Globe2,
  Lock,
  Pencil,
  Play,
  Plus,
  PowerOff,
  ShieldCheck,
  Trash2,
  Webhook,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmModal } from "@/shared/ui/confirm-modal";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";
import { ROLE_LABELS, type AdminRole } from "./store";
import {
  useSettingsStore,
  type AdminRow,
  type NewAdminInput,
  type NewWebhookInput,
  type PlatformConfig,
  type WebhookRow,
} from "./store";

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super-admin", description: "Tous les droits" },
  { value: "OPS_MANAGER", label: "Manager opérations", description: "VTC + Livraison + KYC" },
  { value: "FINANCE", label: "Finance", description: "Wallet + retraits + crédit/débit" },
  { value: "SUPPORT_N1", label: "Support N1", description: "Lecture + suspendre passagers" },
];

const ROLE_TONE: Record<AdminRole, "primary" | "warning" | "info" | "neutral"> = {
  SUPER_ADMIN: "primary",
  OPS_MANAGER: "info",
  FINANCE: "warning",
  SUPPORT_N1: "neutral",
};

function AdminFormModal({
  open,
  mode,
  admin,
  onClose,
}: {
  open: boolean;
  mode: "invite" | "edit";
  admin?: AdminRow;
  onClose: () => void;
}) {
  const invite = useSettingsStore((s) => s.inviteAdmin);
  const update = useSettingsStore((s) => s.updateAdmin);
  const empty: NewAdminInput = { name: "", email: "", role: "SUPPORT_N1" };
  const [form, setForm] = useState<NewAdminInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && admin) {
      setForm({ name: admin.name, email: admin.email, role: admin.role });
    } else {
      setForm(empty);
    }
  }, [open, mode, admin]);

  function set<K extends keyof NewAdminInput>(key: K, value: NewAdminInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name || !form.email) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "Nom et email obligatoires.",
      });
      return;
    }
    if (mode === "invite") {
      invite(form);
      toast({
        kind: "success",
        title: "Invitation envoyée",
        description: `${form.email} recevra un lien d'activation.`,
      });
    } else if (admin) {
      update(admin.id, form);
      toast({ kind: "success", title: "Admin mis à jour", description: form.name });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "invite" ? "Inviter un admin" : "Modifier l'admin"}
      description={
        mode === "invite"
          ? "Un email d'activation sera envoyé. Le compte est actif après création du mot de passe."
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "invite" ? "Envoyer l'invitation" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input
          label="Nom complet"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Combobox
          label="Rôle"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={(v) => set("role", v as AdminRole)}
          required
        />
      </div>
    </Modal>
  );
}

function WebhookFormModal({
  open,
  mode,
  webhook,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  webhook?: WebhookRow;
  onClose: () => void;
}) {
  const create = useSettingsStore((s) => s.createWebhook);
  const update = useSettingsStore((s) => s.updateWebhook);
  const empty: NewWebhookInput = { url: "", events: [] };
  const [form, setForm] = useState<NewWebhookInput>(empty);
  const [eventsRaw, setEventsRaw] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && webhook) {
      setForm({ url: webhook.url, events: webhook.events });
      setEventsRaw(webhook.events.join("\n"));
    } else {
      setForm(empty);
      setEventsRaw("");
    }
  }, [open, mode, webhook]);

  function handleSubmit() {
    const events = eventsRaw
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (!form.url || events.length === 0) {
      toast({
        kind: "error",
        title: "Champs manquants",
        description: "URL et au moins un event sont requis.",
      });
      return;
    }
    if (mode === "create") {
      create({ url: form.url, events });
      toast({ kind: "success", title: "Webhook créé", description: form.url });
    } else if (webhook) {
      update(webhook.id, { url: form.url, events });
      toast({
        kind: "success",
        title: "Webhook mis à jour",
        description: form.url,
      });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={mode === "create" ? "Nouveau webhook" : "Modifier le webhook"}
      description="Le backend POSTera sur cet endpoint à chaque event souscrit."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Créer" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input
          label="URL du webhook"
          required
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://reporting.4u-foryou.com/internal/events"
        />
        <Textarea
          label="Events souscrits"
          value={eventsRaw}
          onChange={(e) => setEventsRaw(e.target.value)}
          placeholder="ride.completed&#10;delivery.completed&#10;wallet.transfer"
          rows={5}
          hint="Un event par ligne (ou séparés par virgule)."
        />
      </div>
    </Modal>
  );
}

function AdminsTab() {
  const admins = useSettingsStore((s) => s.admins);
  const toggleAdmin = useSettingsStore((s) => s.toggleAdmin);
  const removeAdmin = useSettingsStore((s) => s.removeAdmin);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"invite" | "edit">("invite");
  const [formTarget, setFormTarget] = useState<AdminRow | undefined>(undefined);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: "toggle" | "delete";
    target: AdminRow | null;
  }>({ open: false, action: "delete", target: null });

  function openInvite() {
    setFormMode("invite");
    setFormTarget(undefined);
    setFormOpen(true);
  }
  function openEdit(a: AdminRow) {
    setFormMode("edit");
    setFormTarget(a);
    setFormOpen(true);
  }

  function runConfirm() {
    if (!confirm.target) return;
    if (confirm.action === "toggle") {
      toggleAdmin(confirm.target.id);
      toast({
        kind: "info",
        title: confirm.target.isActive ? "Admin désactivé" : "Admin réactivé",
        description: confirm.target.name,
      });
    } else {
      removeAdmin(confirm.target.id);
      toast({
        kind: "info",
        title: "Admin supprimé",
        description: confirm.target.name,
      });
    }
    setConfirm((c) => ({ ...c, open: false, target: null }));
  }

  return (
    <Card className="p-0">
      <CardHeader className="flex-row items-end justify-between">
        <div>
          <CardTitle>Comptes administrateurs</CardTitle>
          <CardDescription>
            {admins.filter((a) => a.isActive).length} actifs · accès gated par RBAC.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openInvite}>
          <Plus className="size-4" />
          Inviter un admin
        </Button>
      </CardHeader>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
            <th className="px-5 py-2.5 font-medium">Administrateur</th>
            <th className="px-5 py-2.5 font-medium">Rôle</th>
            <th className="px-5 py-2.5 font-medium">Dernière connexion</th>
            <th className="px-5 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-5 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {admins.map((row) => (
            <tr key={row.id}>
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={row.name} />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium text-[color:var(--foreground)]">
                      {row.name}
                    </span>
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      {row.email}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                <Badge tone={ROLE_TONE[row.role]}>{ROLE_LABELS[row.role]}</Badge>
              </td>
              <td className="px-5 py-3 text-xs text-[color:var(--muted-foreground)]">
                {row.lastLoginAgo}
              </td>
              <td className="px-5 py-3">
                {row.isActive ? (
                  <Badge tone="success">Actif</Badge>
                ) : (
                  <Badge tone="neutral">Désactivé</Badge>
                )}
              </td>
              <td className="px-5 py-3 text-right">
                <DropdownMenu
                  groups={[
                    {
                      label: "Cas d'usage",
                      items: [
                        {
                          label: "Modifier (rôle, infos)",
                          icon: Pencil,
                          onSelect: () => openEdit(row),
                        },
                        {
                          label: row.isActive ? "Désactiver" : "Réactiver",
                          icon: PowerOff,
                          onSelect: () =>
                            setConfirm({ open: true, action: "toggle", target: row }),
                          danger: row.isActive,
                        },
                      ],
                    },
                    {
                      items: [
                        {
                          label: "Supprimer",
                          icon: Trash2,
                          onSelect: () =>
                            setConfirm({ open: true, action: "delete", target: row }),
                          danger: true,
                        },
                      ],
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdminFormModal
        open={formOpen}
        mode={formMode}
        admin={formTarget}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          confirm.action === "toggle"
            ? confirm.target?.isActive
              ? "Désactiver cet admin ?"
              : "Réactiver cet admin ?"
            : "Supprimer cet admin ?"
        }
        description={
          confirm.target ? (
            <p>
              <span className="font-medium">{confirm.target.name}</span> ·{" "}
              {confirm.target.email}
            </p>
          ) : null
        }
        confirmLabel={
          confirm.action === "toggle"
            ? confirm.target?.isActive
              ? "Désactiver"
              : "Réactiver"
            : "Supprimer définitivement"
        }
        tone={
          confirm.action === "delete" ||
          (confirm.action === "toggle" && confirm.target?.isActive)
            ? "danger"
            : "primary"
        }
      />
    </Card>
  );
}

function RbacTab() {
  const permissions = useSettingsStore((s) => s.permissions);
  const togglePermission = useSettingsStore((s) => s.togglePermission);
  const roles: AdminRole[] = ["SUPER_ADMIN", "OPS_MANAGER", "FINANCE", "SUPPORT_N1"];

  return (
    <Card className="p-0">
      <CardHeader>
        <CardTitle>Matrice de permissions</CardTitle>
        <CardDescription>
          Cliquez une cellule pour activer / désactiver la permission par rôle. Le
          super-admin reste read-only verrouillé.
        </CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[color:var(--border)] text-left text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              <th className="px-5 py-2.5 font-medium">Permission</th>
              {roles.map((role) => (
                <th key={role} className="px-5 py-2.5 text-center font-medium">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {permissions.map((row) => (
              <tr key={row.permission}>
                <td className="px-5 py-3">
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium text-[color:var(--foreground)]">
                      {row.permission}
                    </span>
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      Module {row.module}
                    </span>
                  </div>
                </td>
                {roles.map((role) => {
                  const isOn = row.roles[role];
                  const isLocked = role === "SUPER_ADMIN";
                  return (
                    <td key={role} className="px-5 py-3 text-center">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          togglePermission(row.permission, role);
                          toast({
                            kind: "success",
                            title: isOn
                              ? "Permission retirée"
                              : "Permission ajoutée",
                            description: `${ROLE_LABELS[role]} · ${row.permission}`,
                            duration: 2000,
                          });
                        }}
                        className={`mx-auto inline-flex size-7 items-center justify-center rounded-full transition ${
                          isLocked
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:scale-105"
                        } ${
                          isOn
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
                        }`}
                        aria-label={isOn ? "Retirer" : "Ajouter"}
                      >
                        {isOn ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function WebhooksTab() {
  const webhooks = useSettingsStore((s) => s.webhooks);
  const toggleWebhook = useSettingsStore((s) => s.toggleWebhook);
  const removeWebhook = useSettingsStore((s) => s.removeWebhook);
  const testWebhook = useSettingsStore((s) => s.testWebhook);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formTarget, setFormTarget] = useState<WebhookRow | undefined>(undefined);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    action: "toggle" | "delete";
    target: WebhookRow | null;
  }>({ open: false, action: "delete", target: null });

  function openCreate() {
    setFormMode("create");
    setFormTarget(undefined);
    setFormOpen(true);
  }
  function openEdit(w: WebhookRow) {
    setFormMode("edit");
    setFormTarget(w);
    setFormOpen(true);
  }

  function runConfirm() {
    if (!confirm.target) return;
    if (confirm.action === "toggle") {
      toggleWebhook(confirm.target.id);
      toast({
        kind: "info",
        title: confirm.target.isActive ? "Webhook désactivé" : "Webhook activé",
        description: confirm.target.url,
      });
    } else {
      removeWebhook(confirm.target.id);
      toast({
        kind: "info",
        title: "Webhook supprimé",
        description: confirm.target.url,
      });
    }
    setConfirm((c) => ({ ...c, open: false, target: null }));
  }

  return (
    <Card className="p-0">
      <CardHeader className="flex-row items-end justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="size-4 text-[color:var(--primary)]" />
            Webhooks sortants
          </CardTitle>
          <CardDescription>
            Endpoints externes notifiés en temps réel par le backend.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Nouveau webhook
        </Button>
      </CardHeader>
      <ul className="flex flex-col">
        {webhooks.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            Aucun webhook configuré.
          </li>
        ) : (
          webhooks.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] px-5 py-4 first:border-t-0 hover:bg-[color:var(--muted)]/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                <Globe2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-sm text-[color:var(--foreground)]">
                  {row.url}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {row.events.map((evt) => (
                    <Badge key={evt} tone="neutral">
                      {evt}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={row.isActive ? "success" : "neutral"}>
                  {row.isActive ? "Actif" : "Désactivé"}
                </Badge>
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    row.lastDelivery.status === "OK"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {row.lastDelivery.status === "OK" ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {row.lastDelivery.ago}
                </span>
              </div>
              <DropdownMenu
                groups={[
                  {
                    label: "Cas d'usage",
                    items: [
                      {
                        label: "Modifier (URL, events)",
                        icon: Pencil,
                        onSelect: () => openEdit(row),
                      },
                      {
                        label: "Tester la livraison",
                        icon: Play,
                        onSelect: () => {
                          testWebhook(row.id);
                          toast({
                            kind: "success",
                            title: "Ping envoyé",
                            description: row.url,
                          });
                        },
                      },
                      {
                        label: row.isActive ? "Désactiver" : "Activer",
                        icon: PowerOff,
                        onSelect: () =>
                          setConfirm({ open: true, action: "toggle", target: row }),
                        danger: row.isActive,
                      },
                    ],
                  },
                  {
                    items: [
                      {
                        label: "Supprimer",
                        icon: Trash2,
                        onSelect: () =>
                          setConfirm({ open: true, action: "delete", target: row }),
                        danger: true,
                      },
                    ],
                  },
                ]}
              />
            </li>
          ))
        )}
      </ul>

      <WebhookFormModal
        open={formOpen}
        mode={formMode}
        webhook={formTarget}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={runConfirm}
        title={
          confirm.action === "toggle"
            ? confirm.target?.isActive
              ? "Désactiver ce webhook ?"
              : "Activer ce webhook ?"
            : "Supprimer ce webhook ?"
        }
        description={
          confirm.target ? (
            <p className="break-all font-mono text-xs">{confirm.target.url}</p>
          ) : null
        }
        confirmLabel={
          confirm.action === "toggle"
            ? confirm.target?.isActive
              ? "Désactiver"
              : "Activer"
            : "Supprimer"
        }
        tone={
          confirm.action === "delete" ||
          (confirm.action === "toggle" && confirm.target?.isActive)
            ? "danger"
            : "primary"
        }
      />
    </Card>
  );
}

function AuditTab() {
  const auditLogs = useSettingsStore((s) => s.auditLogs);
  return (
    <Card className="p-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-[color:var(--primary)]" />
          Journal des actions admin (30 j)
        </CardTitle>
        <CardDescription>
          Toute action sensible (suspension, modif tarif, crédit/débit) est tracée ici.
        </CardDescription>
      </CardHeader>
      <ul className="flex flex-col">
        {auditLogs.map((log) => (
          <li
            key={log.id}
            className="flex flex-wrap items-start gap-3 border-t border-[color:var(--border)] px-5 py-4 first:border-t-0"
          >
            <Avatar name={log.actor} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[color:var(--foreground)]">
                <span className="font-medium">{log.actor}</span>{" "}
                <span className="text-[color:var(--muted-foreground)]">
                  ({ROLE_LABELS[log.actorRole]})
                </span>
              </p>
              <p className="mt-0.5 text-sm text-[color:var(--foreground)]">
                {log.action}
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Cible : <span className="font-mono">{log.target}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-[color:var(--muted-foreground)]">
              <span>{log.ago}</span>
              <span className="font-mono">{log.ip}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PlatformTab() {
  const platform = useSettingsStore((s) => s.platform);
  const cities = useSettingsStore((s) => s.cities);
  const updatePlatform = useSettingsStore((s) => s.updatePlatform);
  const togglePlatformOption = useSettingsStore((s) => s.togglePlatformOption);

  function set<K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) {
    updatePlatform({ [key]: value } as Partial<PlatformConfig>);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <CardTitle>Identité plateforme</CardTitle>
        <CardDescription className="mt-1">
          Paramètres affichés dans les apps et reçus.
        </CardDescription>
        <div className="mt-5 flex flex-col gap-4">
          <Input
            label="Nom légal"
            value={platform.legalName}
            onChange={(e) => set("legalName", e.target.value)}
          />
          <Input
            label="IFU"
            value={platform.ifu}
            onChange={(e) => set("ifu", e.target.value)}
          />
          <Input
            label="Email support"
            type="email"
            value={platform.supportEmail}
            onChange={(e) => set("supportEmail", e.target.value)}
          />
          <Input
            label="Téléphone support"
            value={platform.supportPhone}
            onChange={(e) => set("supportPhone", e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast({
                kind: "success",
                title: "Identité enregistrée",
                description: platform.legalName,
              })
            }
          >
            Sauvegarder
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <CardTitle>Versions minimales mobiles</CardTitle>
        <CardDescription className="mt-1">
          En-deçà de ces versions, les apps forcent la mise à jour.
        </CardDescription>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Input
            label="App passager — min"
            value={platform.passengerMinVersion}
            onChange={(e) => set("passengerMinVersion", e.target.value)}
          />
          <Input
            label="App driver — min"
            value={platform.driverMinVersion}
            onChange={(e) => set("driverMinVersion", e.target.value)}
          />
          <Input
            label="Date d'obsolescence passager"
            type="date"
            value={platform.passengerObsoleteAt}
            onChange={(e) => set("passengerObsoleteAt", e.target.value)}
          />
          <Input
            label="Date d'obsolescence driver"
            type="date"
            value={platform.driverObsoleteAt}
            onChange={(e) => set("driverObsoleteAt", e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-5"
          onClick={() =>
            toast({
              kind: "success",
              title: "Versions enregistrées",
              description: `passager ≥ ${platform.passengerMinVersion} · driver ≥ ${platform.driverMinVersion}`,
            })
          }
        >
          Sauvegarder
        </Button>
      </Card>

      <Card className="p-6">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-[color:var(--primary)]" />
          Sécurité & politique
        </CardTitle>
        <ul className="mt-5 flex flex-col">
          {(
            [
              { key: "mfaRequired", label: "MFA obligatoire pour les super-admins" },
              { key: "ipWhitelist", label: "Verrou IP whitelist (ops + finance)" },
              { key: "autoLogout", label: "Logout auto après 30 min d'inactivité" },
              { key: "auditExport", label: "Audit log envoyé en archive S3 quotidienne" },
            ] as const
          ).map((opt) => {
            const isOn = platform[opt.key] as boolean;
            return (
              <li
                key={opt.key}
                className="flex items-center justify-between border-t border-[color:var(--border)] py-3 first:border-t-0 first:pt-0"
              >
                <span className="text-sm text-[color:var(--foreground)]">
                  {opt.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    togglePlatformOption(opt.key);
                    toast({
                      kind: "info",
                      title: isOn ? "Option désactivée" : "Option activée",
                      description: opt.label,
                      duration: 2000,
                    });
                  }}
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                    isOn ? "bg-[color:var(--primary)]" : "bg-[color:var(--muted)]"
                  }`}
                  aria-pressed={isOn}
                >
                  <span
                    className={`size-5 rounded-full bg-white shadow transition ${
                      isOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-6">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-4 text-[color:var(--primary)]" />
          Multi-villes
        </CardTitle>
        <CardDescription className="mt-1">
          Périmètre opérationnel — ajout d&apos;une ville déclenche un setup tarifaire.
        </CardDescription>
        <ul className="mt-5 flex flex-col">
          {cities.map((city) => (
            <li
              key={city.name}
              className="flex items-center justify-between border-t border-[color:var(--border)] py-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center gap-2">
                <Lock className="size-3.5 text-[color:var(--muted-foreground)]" />
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  {city.name}
                </span>
                <span className="text-xs text-[color:var(--muted-foreground)]">
                  · {city.drivers} drivers
                </span>
              </div>
              <Badge
                tone={
                  city.status === "Actif"
                    ? "success"
                    : city.status === "Pilote"
                      ? "warning"
                      : "neutral"
                }
              >
                {city.status}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  const admins = useSettingsStore((s) => s.admins);
  const webhooks = useSettingsStore((s) => s.webhooks);
  const auditLogs = useSettingsStore((s) => s.auditLogs);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        defaultValue="admins"
        tabs={[
          {
            value: "admins",
            label: "Admins",
            badge: { count: admins.filter((a) => a.isActive).length, tone: "primary" },
            content: <AdminsTab />,
          },
          { value: "rbac", label: "Rôles & permissions", content: <RbacTab /> },
          {
            value: "webhooks",
            label: "Webhooks",
            badge: {
              count: webhooks.filter((w) => w.isActive).length,
              tone: "primary",
            },
            content: <WebhooksTab />,
          },
          {
            value: "audit",
            label: "Audit log",
            badge: { count: auditLogs.length, tone: "neutral" },
            content: <AuditTab />,
          },
          { value: "platform", label: "Plateforme", content: <PlatformTab /> },
        ]}
      />
    </div>
  );
}
