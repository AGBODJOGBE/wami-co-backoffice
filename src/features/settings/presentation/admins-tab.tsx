"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, ShieldCheck, UserCircle } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/toast";
import { formatDate } from "@/shared/lib/format";
import { createAdminAction } from "../application/actions";
import type { AdminUser } from "../domain/admin-user";
import type { RbacRole } from "@/features/rbac/domain/rbac";

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

export interface AdminsTabProps {
  admins: AdminUser[];
  total: number;
  roles: RbacRole[];
  error?: string;
}

export function AdminsTab({ admins, total, roles, error }: AdminsTabProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const displayTotal = admins.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCircle className="size-5 text-[color:var(--secondary)]" />
          <span className="text-sm font-semibold text-[color:var(--foreground)]">
            Administrateurs ({displayTotal})
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
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouvel admin
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[color:var(--danger)]">{error}</p>
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] py-12 text-center">
          <ShieldCheck className="size-10 text-[color:var(--muted-foreground)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">Aucun administrateur trouvé.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Créer le premier admin
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--background)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Admin</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:table-cell">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">Statut</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] md:table-cell">Inscrit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {admins.map((admin) => (
                <tr key={admin.userId} className="transition-colors hover:bg-[color:var(--muted)]/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${admin.firstName} ${admin.lastName}`} />
                      <div className="flex flex-col leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[color:var(--foreground)]">
                            {admin.firstName} {admin.lastName}
                          </span>
                          {admin.adminId && (
                            <Badge tone="primary">Admin confirmé</Badge>
                          )}
                        </div>
                        {admin.email ? (
                          <span className="text-xs text-[color:var(--muted-foreground)]">{admin.email}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-[color:var(--muted-foreground)] sm:table-cell">
                    {admin.phoneNumber}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={admin.isActive ? "success" : "danger"}>
                      {admin.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-[color:var(--muted-foreground)] md:table-cell">
                    {formatDate(admin.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateAdminModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
      />
    </div>
  );
}
