"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import type {
  MyPermissions,
  PermissionsByModule,
  RbacRole,
} from "../domain/rbac";

export interface RbacSectionProps {
  me: MyPermissions | null;
  meError?: string;
  roles: RbacRole[];
  rolesError?: string;
  catalog: PermissionsByModule | null;
  catalogError?: string;
}

export function RbacSection({
  me,
  meError,
  roles,
  rolesError,
  catalog,
  catalogError,
}: RbacSectionProps) {
  const [search, setSearch] = useState("");
  const myCodes = useMemo(
    () => new Set((me?.permissions ?? []).map((p) => p.code)),
    [me],
  );

  const groupedCatalog = useMemo(() => {
    if (!catalog) return [];
    return Object.entries(catalog.permissions).map(([module, perms]) => ({
      module,
      perms: perms.filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
        );
      }),
    }));
  }, [catalog, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Mon profil</CardTitle>
          </CardHeader>
          <CardContent>
            {meError ? (
              <p className="text-sm text-[color:var(--danger)]">{meError}</p>
            ) : !me ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Aucune donnée.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-[color:var(--primary)]" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                      {me.role.displayName}
                    </span>
                    <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                      {me.role.name}
                    </span>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-[color:var(--muted-foreground)]">
                    Permissions
                  </dt>
                  <dd className="text-right font-semibold">
                    {me.permissions.length}
                  </dd>
                  <dt className="text-[color:var(--muted-foreground)]">
                    Octrois ind.
                  </dt>
                  <dd className="text-right">
                    {me.grantedOverrides.length}
                  </dd>
                  <dt className="text-[color:var(--muted-foreground)]">
                    Révocations ind.
                  </dt>
                  <dd className="text-right">
                    {me.revokedOverrides.length}
                  </dd>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rôles ({roles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {rolesError ? (
              <p className="text-sm text-[color:var(--danger)]">{rolesError}</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Aucun rôle.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {roles.map((role) => (
                  <li
                    key={role.id}
                    className="flex flex-col gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {role.displayName}
                      </span>
                      <Badge tone="primary">{role.name}</Badge>
                      {role.isSystem ? (
                        <Badge tone="info">Système</Badge>
                      ) : null}
                      <Badge tone="neutral">
                        {role.permissions.length} permission
                        {role.permissions.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {role.description ? (
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {role.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              Catalogue de permissions
              {catalog ? ` (${catalog.total})` : ""}
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
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Aucune donnée.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {groupedCatalog.map(({ module, perms }) =>
                perms.length === 0 ? null : (
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
                              "flex flex-col gap-1 rounded-md border p-2.5 " +
                              (owned
                                ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/5"
                                : "border-[color:var(--border)] bg-[color:var(--background)]")
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-[color:var(--foreground)]">
                                {p.name}
                              </span>
                              {owned ? (
                                <Badge tone="success">Possédée</Badge>
                              ) : null}
                            </div>
                            <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                              {p.code}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
