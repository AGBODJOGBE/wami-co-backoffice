"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import {
  changeAdminRoleAction,
  createPermissionAction,
  grantPermissionAction,
  updateRolePermissionsAction,
  type CreatePermissionInput,
} from "../application/actions";
import type { MyPermissions, PermissionsByModule, RbacPermission, RbacRole } from "../domain/rbac";
import type { AdminUser } from "@/features/settings/domain/admin-user";

// ─── Role tone map ─────────────────────────────────────────────────────────────

const ROLE_TONE: Record<string, "primary" | "warning" | "info" | "neutral" | "success"> = {
  SUPER_ADMIN: "primary",
  FINANCE_ADMIN: "warning",
  OPS_ADMIN: "info",
  SUPPORT_ADMIN: "neutral",
};

// ─── Grant permission modal ───────────────────────────────────────────────────

function GrantPermissionModal({
  open,
  onClose,
  admin,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  catalog: PermissionsByModule | null;
}) {
  const [permissionCode, setPermissionCode] = useState("");
  const [pending, start] = useTransition();

  const permOptions = useMemo(() => {
    if (!catalog) return [];
    return Object.entries(catalog.permissions).flatMap(([module, perms]) =>
      perms.map((p) => ({
        value: p.code,
        label: p.name,
        description: `${module} · ${p.code}`,
      })),
    );
  }, [catalog]);

  function handleClose() {
    setPermissionCode("");
    onClose();
  }

  function submit() {
    if (!admin || !permissionCode) {
      toast({ kind: "error", title: "Sélectionnez une permission" });
      return;
    }
    const targetId = admin.adminId ?? admin.userId;
    start(async () => {
      const r = await grantPermissionAction(targetId, permissionCode);
      if (r.ok) {
        toast({ kind: "success", title: "Permission accordée", description: r.message });
        handleClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Octroyer une permission"
      description={admin ? `Accorder une permission supplémentaire à ${admin.firstName} ${admin.lastName}.` : ""}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Octroi…" : "Octroyer"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-[color:var(--muted)]/40 px-3 py-2 text-sm">
          <span className="font-medium">{admin?.firstName} {admin?.lastName}</span>
          <span className="ml-2 font-mono text-xs text-[color:var(--muted-foreground)]">{admin?.phoneNumber}</span>
        </div>
        <Combobox
          label="Permission *"
          placeholder="Rechercher une permission…"
          searchPlaceholder="Code ou libellé…"
          emptyMessage="Aucune permission trouvée."
          options={permOptions}
          value={permissionCode}
          onChange={setPermissionCode}
          required
        />
      </div>
    </Modal>
  );
}

// ─── Change role modal ────────────────────────────────────────────────────────

function ChangeRoleModal({
  open,
  onClose,
  admin,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  roles: RbacRole[];
}) {
  const [roleId, setRoleId] = useState("");
  const [pending, start] = useTransition();

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.displayName }));

  function handleClose() {
    setRoleId("");
    onClose();
  }

  function submit() {
    if (!admin || !roleId) {
      toast({ kind: "error", title: "Sélectionnez un rôle" });
      return;
    }
    const targetId = admin.adminId ?? admin.userId;
    start(async () => {
      const r = await changeAdminRoleAction(targetId, roleId);
      if (r.ok) {
        toast({ kind: "success", title: "Rôle mis à jour", description: r.message });
        handleClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Changer le rôle"
      description={admin ? `Modifier le rôle de ${admin.firstName} ${admin.lastName}.` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Mise à jour…" : "Appliquer"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-[color:var(--muted)]/40 px-3 py-2 text-sm">
          <span className="font-medium">{admin?.firstName} {admin?.lastName}</span>
          <span className="ml-2 font-mono text-xs text-[color:var(--muted-foreground)]">{admin?.phoneNumber}</span>
        </div>
        <Select
          label="Nouveau rôle *"
          id="change-role-select"
          options={roleOptions}
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ─── Create permission modal ─────────────────────────────────────────────────

function CreatePermissionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreatePermissionInput>({
    code: "",
    name: "",
    module: "",
    category: "",
  });
  const [pending, start] = useTransition();

  function set<K extends keyof CreatePermissionInput>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleClose() {
    setForm({ code: "", name: "", module: "", category: "" });
    onClose();
  }

  function submit() {
    if (!form.code.trim() || !form.name.trim() || !form.module.trim() || !form.category.trim()) {
      toast({ kind: "error", title: "Champs manquants", description: "Code, nom, module et catégorie sont requis." });
      return;
    }
    start(async () => {
      const r = await createPermissionAction(form);
      if (r.ok) {
        toast({ kind: "success", title: "Permission créée", description: r.message });
        handleClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Créer une permission"
      description="Ajouter une nouvelle permission au catalogue. Sera ensuite assignable aux rôles et admins."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Création…" : "Créer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Code *"
          required
          value={form.code}
          onChange={(e) => set("code", e.target.value)}
          placeholder="module.action (ex: billing.export)"
        />
        <Input
          label="Nom *"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Exporter la facturation"
        />
        <Input
          label="Module *"
          required
          value={form.module}
          onChange={(e) => set("module", e.target.value)}
          placeholder="billing, driver, ride…"
        />
        <Input
          label="Catégorie *"
          required
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          placeholder="BILLING, DRIVER, RIDE…"
        />
      </div>
    </Modal>
  );
}

// ─── Manage role permissions modal ───────────────────────────────────────────

function ManageRolePermissionsModal({
  open,
  onClose,
  role,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  role: RbacRole | null;
  catalog: PermissionsByModule | null;
}) {
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [toRemove, setToRemove] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const existingCodes = useMemo(
    () => new Set(role?.permissions.map((p) => p.code) ?? []),
    [role],
  );

  const allPerms = useMemo(() => {
    if (!catalog) return [];
    return Object.entries(catalog.permissions).flatMap(([mod, perms]) =>
      perms.map((p) => ({ ...p, module: mod })),
    );
  }, [catalog]);

  const addablePerms = useMemo(
    () => allPerms.filter((p) => !existingCodes.has(p.code)),
    [allPerms, existingCodes],
  );

  function handleClose() {
    setToAdd([]);
    setToRemove([]);
    onClose();
  }

  function toggleAdd(code: string) {
    setToAdd((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function toggleRemove(code: string) {
    setToRemove((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function submit() {
    if (!role || (toAdd.length === 0 && toRemove.length === 0)) {
      toast({ kind: "error", title: "Aucune modification sélectionnée" });
      return;
    }
    start(async () => {
      const r = await updateRolePermissionsAction(role.id, toAdd, toRemove);
      if (r.ok) {
        toast({ kind: "success", title: "Permissions mises à jour", description: r.message });
        handleClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  const isSuperAdmin = role?.name === "SUPER_ADMIN";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Permissions : ${role?.displayName ?? ""}`}
      description={isSuperAdmin ? "⚠ Impossible de retirer des permissions du rôle SUPER_ADMIN." : "Cochez les permissions à ajouter/retirer puis validez."}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending} disabled={toAdd.length === 0 && toRemove.length === 0}>
            {pending ? "Mise à jour…" : `Appliquer (${toAdd.length > 0 ? `+${toAdd.length}` : ""}${toAdd.length > 0 && toRemove.length > 0 ? " / " : ""}${toRemove.length > 0 ? `−${toRemove.length}` : ""})`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
        {/* Remove section */}
        {!isSuperAdmin && existingCodes.size > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--danger)]">
              Retirer du rôle ({toRemove.length} sélectionnée{toRemove.length !== 1 ? "s" : ""})
            </p>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {role?.permissions.map((p) => {
                const selected = toRemove.includes(p.code);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleRemove(p.code)}
                    className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
                      selected
                        ? "border-[color:var(--danger)] bg-[color:var(--danger)]/10"
                        : "border-[color:var(--border)] hover:bg-[color:var(--muted)]/40"
                    }`}
                  >
                    <p className="text-xs font-medium text-[color:var(--foreground)]">{p.name}</p>
                    <p className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{p.code}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Add section */}
        {addablePerms.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[color:var(--success)]">
              Ajouter au rôle ({toAdd.length} sélectionnée{toAdd.length !== 1 ? "s" : ""})
            </p>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {addablePerms.map((p) => {
                const selected = toAdd.includes(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => toggleAdd(p.code)}
                    className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
                      selected
                        ? "border-[color:var(--success)] bg-[color:var(--success)]/10"
                        : "border-[color:var(--border)] hover:bg-[color:var(--muted)]/40"
                    }`}
                  >
                    <p className="text-xs font-medium text-[color:var(--foreground)]">{p.name}</p>
                    <p className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{p.code} · {p.module}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Role detail card (collapsible permissions list) ─────────────────────────

function RoleCard({
  role,
  onManagePermissions,
}: {
  role: RbacRole;
  onManagePermissions: (role: RbacRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const tone = ROLE_TONE[role.name] ?? "neutral";

  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-3 text-left"
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[color:var(--foreground)]">
              {role.displayName}
            </span>
            <Badge tone={tone}>{role.name}</Badge>
            {role.isSystem ? <Badge tone="info">Système</Badge> : null}
            <Badge tone="neutral">
              {role.permissions.length} permission{role.permissions.length > 1 ? "s" : ""}
            </Badge>
          </div>
          {role.description ? (
            <p className="text-xs text-[color:var(--muted-foreground)]">{role.description}</p>
          ) : null}
        </div>
        {open ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-[color:var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-[color:var(--muted-foreground)]" />
        )}
      </button>
      {open && (
        <div className="border-t border-[color:var(--border)] px-3 pb-3 pt-2">
          <div className="mb-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onManagePermissions(role); }}
            >
              Gérer les permissions
            </Button>
          </div>
          {role.permissions.length > 0 ? (
            <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {role.permissions.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--muted)]/20 px-2 py-1.5"
                >
                  <p className="text-xs font-medium text-[color:var(--foreground)]">{p.name}</p>
                  <p className="font-mono text-[10px] text-[color:var(--muted-foreground)]">{p.code}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[color:var(--muted-foreground)]">Aucune permission.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface RbacSectionProps {
  me: MyPermissions | null;
  meError?: string;
  roles: RbacRole[];
  rolesError?: string;
  catalog: PermissionsByModule | null;
  catalogError?: string;
  admins?: AdminUser[];
}

export function RbacSection({
  me,
  meError,
  roles,
  rolesError,
  catalog,
  catalogError,
  admins = [],
}: RbacSectionProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [createPermOpen, setCreatePermOpen] = useState(false);
  const [managePermRole, setManagePermRole] = useState<RbacRole | null>(null);

  const myCodes = useMemo(
    () => new Set((me?.permissions ?? []).map((p) => p.code)),
    [me],
  );

  const groupedCatalog = useMemo(() => {
    if (!catalog) return [];
    return Object.entries(catalog.permissions)
      .map(([module, perms]) => ({
        module,
        perms: perms.filter((p) => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
        }),
      }))
      .filter(({ perms }) => perms.length > 0);
  }, [catalog, search]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
        >
          {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
          Rafraîchir
        </Button>
        <Button size="sm" onClick={() => setCreatePermOpen(true)}>
          <Shield className="size-4" />
          Nouvelle permission
        </Button>
      </div>

      {/* ── Top row: Mon profil + Rôles ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mon profil */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[color:var(--primary)]" />
              <CardTitle>Mon profil</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {meError ? (
              <p className="text-sm text-[color:var(--danger)]">{meError}</p>
            ) : !me ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">Aucune donnée.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      {me.role.displayName}
                    </span>
                    <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                      {me.role.name}
                    </span>
                  </div>
                  <Badge tone={ROLE_TONE[me.role.name] ?? "neutral"} className="ml-auto">
                    {me.role.name}
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <dt className="text-[color:var(--muted-foreground)]">Permissions</dt>
                  <dd className="text-right font-semibold text-[color:var(--foreground)]">
                    {me.permissions.length}
                  </dd>
                  <dt className="text-[color:var(--muted-foreground)]">Octrois ind.</dt>
                  <dd className="text-right text-[color:var(--foreground)]">
                    {me.grantedOverrides.length}
                  </dd>
                  <dt className="text-[color:var(--muted-foreground)]">Révocations ind.</dt>
                  <dd className="text-right text-[color:var(--foreground)]">
                    {me.revokedOverrides.length}
                  </dd>
                </dl>
                {me.grantedOverrides.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Permissions accordées :</p>
                    <div className="flex flex-wrap gap-1">
                      {me.grantedOverrides.map((p) => (
                        <span key={p.id} className="rounded bg-[color:var(--success)]/10 px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--success)]">
                          {p.code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rôles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-[color:var(--secondary)]" />
              <CardTitle>Rôles ({roles.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {rolesError ? (
              <p className="text-sm text-[color:var(--danger)]">{rolesError}</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">Aucun rôle.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {roles.map((role) => (
                  <li key={role.id}>
                    <RoleCard role={role} onManagePermissions={setManagePermRole} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Gestion des admins (grant / change role) ─────────────────────────── */}
      {admins.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="size-5 text-[color:var(--secondary)]" />
              <CardTitle>Gestion des accès admins</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-[color:var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Admin</th>
                    <th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:table-cell">Statut</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {admins.map((admin) => (
                    <tr key={admin.userId} className="transition-colors hover:bg-[color:var(--muted)]/20">
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-[color:var(--foreground)]">
                            {admin.firstName} {admin.lastName}
                          </span>
                          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                            {admin.phoneNumber}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        <Badge tone={admin.isActive ? "success" : "danger"}>
                          {admin.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRoleTarget(admin)}
                          >
                            Changer rôle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGrantTarget(admin)}
                          >
                            + Permission
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Catalogue de permissions ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              Catalogue de permissions{catalog ? ` (${catalog.total})` : ""}
            </CardTitle>
            <Input
              type="search"
              placeholder="Rechercher un code ou un libellé…"
              leftIcon={<Search className="size-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-72"
            />
          </div>
        </CardHeader>
        <CardContent>
          {catalogError ? (
            <p className="text-sm text-[color:var(--danger)]">{catalogError}</p>
          ) : !catalog ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">Aucune donnée.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {groupedCatalog.map(({ module, perms }) => (
                <section key={module} className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted-foreground)]">
                    {module}
                  </h3>
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {perms.map((p) => {
                      const owned = myCodes.has(p.code);
                      return (
                        <li
                          key={p.id}
                          className={
                            "flex flex-col gap-0.5 rounded-md border p-2.5 " +
                            (owned
                              ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/5"
                              : "border-[color:var(--border)] bg-[color:var(--background)]")
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-[color:var(--foreground)]">
                              {p.name}
                            </span>
                            {owned ? <Badge tone="success">Possédée</Badge> : null}
                          </div>
                          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                            {p.code}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <GrantPermissionModal
        open={!!grantTarget}
        onClose={() => setGrantTarget(null)}
        admin={grantTarget}
        catalog={catalog}
      />
      <ChangeRoleModal
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        admin={roleTarget}
        roles={roles}
      />
      <CreatePermissionModal
        open={createPermOpen}
        onClose={() => setCreatePermOpen(false)}
      />
      <ManageRolePermissionsModal
        open={!!managePermRole}
        onClose={() => setManagePermRole(null)}
        role={managePermRole}
        catalog={catalog}
      />
    </div>
  );
}
