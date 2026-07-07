"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCircle,
  UserCog,
} from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CanView } from "@/shared/ui/can-view";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import {
  changeAdminRoleAction,
  grantPermissionAction,
} from "@/features/rbac/application/actions";
import type { PermissionsByModule, RbacRole } from "@/features/rbac/domain/rbac";
import {
  createAdminAction,
  deactivateAdminAction,
  reactivateAdminAction,
} from "../application/actions";
import type { AdminListItem } from "../domain/admin-user";

// ─── Dropdown menu minimal ──────────────────────────────────────────────────

function ActionMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Ouvre vers le haut si moins de 180px de place en dessous
      setOpenUpward(window.innerHeight - rect.bottom < 180);
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        aria-label="Actions"
      >
        <MoreHorizontal className="size-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 z-20 w-48 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] shadow-lg ${
              openUpward ? "bottom-full mb-1" : "top-full mt-1"
            }`}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
  tone = "default",
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-[color:var(--muted)]/50 ${
        tone === "danger"
          ? "text-[color:var(--danger)]"
          : "text-[color:var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Create modal ────────────────────────────────────────────────────────────

interface CreateForm {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  roleId: string;
}

function defaultForm(firstRoleId: string): CreateForm {
  return { firstName: "", lastName: "", phone: "+229", password: "", roleId: firstRoleId };
}

function CreateAdminModal({
  open,
  onClose,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: RbacRole[];
}) {
  const [form, setForm] = useState<CreateForm>(() => defaultForm(roles[0]?.id ?? ""));
  const [pending, start] = useTransition();

  function set<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleClose() {
    setForm(defaultForm(roles[0]?.id ?? ""));
    onClose();
  }

  function submit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ kind: "error", title: "Prénom et nom requis" });
      return;
    }
    if (!form.phone.trim() || form.phone.length < 8) {
      toast({ kind: "error", title: "Numéro invalide", description: "Format: +229XXXXXXXX" });
      return;
    }
    if (form.password.length < 8) {
      toast({ kind: "error", title: "Mot de passe trop court", description: "8 caractères minimum." });
      return;
    }
    if (!form.roleId) {
      toast({ kind: "error", title: "Rôle requis" });
      return;
    }
    start(async () => {
      const r = await createAdminAction({
        phone: form.phone.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        roleId: form.roleId,
      });
      if (r.ok) {
        toast({ kind: "success", title: "Admin créé", description: r.message });
        handleClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.displayName }));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nouvel administrateur"
      description="Crée un compte admin et lui attribue un rôle."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>
            {pending ? "Création…" : "Créer l'admin"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Prénom *"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="Jean"
            required
          />
          <Input
            label="Nom *"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="DUPONT"
            required
          />
        </div>
        <Input
          label="Téléphone *"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+22900000000"
          hint="Format international (+229...)"
          required
        />
        <Input
          label="Mot de passe *"
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="8 caractères minimum"
          hint="Lettres majuscules, minuscules, chiffres et symboles recommandés."
          required
        />
        <Select
          label="Rôle *"
          id="admin-role-select"
          options={roleOptions}
          value={form.roleId}
          onChange={(e) => set("roleId", e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ─── Change role modal ───────────────────────────────────────────────────────

function ChangeRoleModal({
  open,
  onClose,
  admin,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  admin: AdminListItem | null;
  roles: RbacRole[];
}) {
  const [roleId, setRoleId] = useState(admin?.roleId ?? "");
  const [pending, start] = useTransition();

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.displayName }));

  function submit() {
    if (!admin) return;
    if (!roleId) {
      toast({ kind: "error", title: "Rôle requis" });
      return;
    }
    start(async () => {
      const r = await changeAdminRoleAction(admin.adminId, roleId);
      if (r.ok) {
        toast({ kind: "success", title: "Rôle mis à jour", description: r.message });
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Changer le rôle"
      description={admin ? `${admin.firstName} ${admin.lastName} — rôle actuel : ${admin.roleName}` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>Confirmer</Button>
        </>
      }
    >
      <Select
        label="Nouveau rôle"
        id="change-role-select"
        options={roleOptions}
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
      />
    </Modal>
  );
}

// ─── Grant permission modal ──────────────────────────────────────────────────

function GrantPermissionModal({
  open,
  onClose,
  admin,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  admin: AdminListItem | null;
  catalog: PermissionsByModule | null;
}) {
  const [permissionCode, setPermissionCode] = useState("");
  const [pending, start] = useTransition();

  const options = useMemo(() => {
    if (!catalog) return [];
    return Object.values(catalog.permissions)
      .flat()
      .map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` }));
  }, [catalog]);

  function submit() {
    if (!admin) return;
    if (!permissionCode) {
      toast({ kind: "error", title: "Sélectionne une permission" });
      return;
    }
    start(async () => {
      const r = await grantPermissionAction(admin.adminId, permissionCode);
      if (r.ok) {
        toast({ kind: "success", title: "Permission accordée", description: r.message });
        setPermissionCode("");
        onClose();
      } else {
        toast({ kind: "error", title: "Échec", description: r.message });
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Octroyer une permission"
      description={admin ? `Ajouter une permission override à ${admin.firstName} ${admin.lastName}.` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button onClick={submit} isLoading={pending}>Octroyer</Button>
        </>
      }
    >
      <Select
        label="Permission"
        id="grant-perm-select"
        options={[{ value: "", label: "— Choisir une permission —" }, ...options]}
        value={permissionCode}
        onChange={(e) => setPermissionCode(e.target.value)}
      />
    </Modal>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export interface AdminsTabProps {
  admins: AdminListItem[];
  total: number;
  roles: RbacRole[];
  catalog: PermissionsByModule | null;
  error?: string;
}

export function AdminsTab({ admins, total, roles, catalog, error }: AdminsTabProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleTarget, setRoleTarget] = useState<AdminListItem | null>(null);
  const [grantTarget, setGrantTarget] = useState<AdminListItem | null>(null);
  const [actionPending, startAction] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(
      (a) =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        a.phoneNumber.toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q) ||
        a.roleName.toLowerCase().includes(q),
    );
  }, [admins, search]);

  function handleDeactivate(admin: AdminListItem) {
    startAction(async () => {
      const r = await deactivateAdminAction(admin.adminId);
      toast({
        kind: r.ok ? "success" : "error",
        title: r.ok ? "Admin désactivé" : "Échec",
        description: r.message,
      });
    });
  }

  function handleReactivate(admin: AdminListItem) {
    startAction(async () => {
      const r = await reactivateAdminAction(admin.adminId);
      toast({
        kind: r.ok ? "success" : "error",
        title: r.ok ? "Admin réactivé" : "Échec",
        description: r.message,
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCircle className="size-5 text-[color:var(--secondary)]" />
          <span className="text-sm font-semibold text-[color:var(--foreground)]">
            Administrateurs
            <span className="ml-1.5 text-[color:var(--muted-foreground)]">({total})</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
          >
            {refreshing ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
            Rafraîchir
          </Button>
          <CanView permission="admin.create">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nouvel admin
            </Button>
          </CanView>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      {admins.length > 0 && (
        <Input
          type="search"
          placeholder="Rechercher par nom, téléphone, email ou rôle…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {error ? (
        <p className="text-sm text-[color:var(--danger)]">{error}</p>
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
          <ShieldCheck className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun administrateur trouvé.</p>
          <CanView permission="admin.create">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Créer le premier admin
            </Button>
          </CanView>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--muted-foreground)]">
          Aucun admin correspondant à &laquo; {search} &raquo;.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--background)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Admin</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:table-cell">Téléphone</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] md:table-cell">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Statut</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] lg:table-cell">Inscrit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {filtered.map((admin) => {
                const isActive = admin.status === "ACTIVE";
                return (
                  <tr
                    key={admin.adminId}
                    className={`transition-colors hover:bg-[color:var(--muted)]/20 ${
                      !isActive ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${admin.firstName} ${admin.lastName}`} />
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-[color:var(--foreground)]">
                            {admin.firstName} {admin.lastName}
                          </span>
                          {admin.email && (
                            <span className="text-xs text-[color:var(--muted-foreground)]">{admin.email}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-[color:var(--muted-foreground)] sm:table-cell">
                      {admin.phoneNumber}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--primary-soft)] px-2 py-1 text-xs font-medium text-[color:var(--primary)]">
                        <UserCog className="size-3" />
                        {admin.roleName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isActive ? (
                        <Badge tone="success">Actif</Badge>
                      ) : (
                        <Badge tone="danger">Inactif</Badge>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-[color:var(--muted-foreground)] lg:table-cell">
                      {admin.createdAt ? formatDate(admin.createdAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu>
                        <CanView permission="admin.update_role">
                          <MenuItem onClick={() => setRoleTarget(admin)}>
                            Changer le rôle
                          </MenuItem>
                        </CanView>
                        <CanView permission="admin.grant_permission">
                          <MenuItem onClick={() => setGrantTarget(admin)}>
                            Octroyer une permission
                          </MenuItem>
                        </CanView>
                        {isActive ? (
                          <CanView permission="admin.deactivate">
                            <MenuItem
                              tone="danger"
                              onClick={() => handleDeactivate(admin)}
                            >
                              {actionPending ? "…" : "Désactiver"}
                            </MenuItem>
                          </CanView>
                        ) : (
                          <CanView permission="admin.reactivate">
                            <MenuItem onClick={() => handleReactivate(admin)}>
                              {actionPending ? "…" : "Réactiver"}
                            </MenuItem>
                          </CanView>
                        )}
                      </ActionMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <CreateAdminModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
      />
      <ChangeRoleModal
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        admin={roleTarget}
        roles={roles}
      />
      <GrantPermissionModal
        open={!!grantTarget}
        onClose={() => setGrantTarget(null)}
        admin={grantTarget}
        catalog={catalog}
      />
    </div>
  );
}
