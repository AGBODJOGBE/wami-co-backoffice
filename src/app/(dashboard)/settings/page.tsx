import {
  getMyPermissions,
  listPermissionsByModule,
  listRoles,
} from "@/features/rbac/application/api";
import { RbacSection } from "@/features/rbac/presentation/rbac-section";
import { SettingsPage as MockSettingsPage } from "@/features/settings/settings-page";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPageRoute() {
  const [meRes, rolesRes, catalogRes] = await Promise.allSettled([
    getMyPermissions(),
    listRoles(),
    listPermissionsByModule(),
  ]);
  const errMsg = (e: unknown) =>
    e instanceof Error ? e.message : "Erreur de chargement.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Système"
        title="Paramètres"
        dataSource="partial"
        dataSourceHint="RBAC est branché sur l'API. Le reste (admins, webhooks, audit, plateforme) reste en démo."
        description="Rôles, permissions et configuration plateforme."
      />
      <Tabs
        defaultValue="rbac"
        tabs={[
          {
            value: "rbac",
            label: "RBAC (live)",
            badge:
              meRes.status === "fulfilled"
                ? { count: meRes.value.permissions.length, tone: "success" }
                : undefined,
            content: (
              <RbacSection
                me={meRes.status === "fulfilled" ? meRes.value : null}
                meError={
                  meRes.status === "rejected" ? errMsg(meRes.reason) : undefined
                }
                roles={rolesRes.status === "fulfilled" ? rolesRes.value : []}
                rolesError={
                  rolesRes.status === "rejected"
                    ? errMsg(rolesRes.reason)
                    : undefined
                }
                catalog={
                  catalogRes.status === "fulfilled" ? catalogRes.value : null
                }
                catalogError={
                  catalogRes.status === "rejected"
                    ? errMsg(catalogRes.reason)
                    : undefined
                }
              />
            ),
          },
          {
            value: "demo",
            label: "Configuration (démo)",
            content: <MockSettingsPage />,
          },
        ]}
      />
    </div>
  );
}
