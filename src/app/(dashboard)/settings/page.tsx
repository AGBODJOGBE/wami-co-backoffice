import {
  getMyPermissions,
  listPermissionsByModule,
  listRoles,
} from "@/features/rbac/application/api";
import { RbacSection } from "@/features/rbac/presentation/rbac-section";
import { listAdminUsers, listAppConfigs } from "@/features/settings/application/api";
import { AdminsTab } from "@/features/settings/presentation/admins-tab";
import { PlatformTab } from "@/features/settings/presentation/platform-tab";
import { SettingsPage as MockSettingsPage } from "@/features/settings/settings-page";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPageRoute() {
  const [meRes, rolesRes, catalogRes, adminsRes, appConfigRes] =
    await Promise.allSettled([
      getMyPermissions(),
      listRoles(),
      listPermissionsByModule(),
      listAdminUsers(),
      listAppConfigs(),
    ]);

  const errMsg = (e: unknown) =>
    e instanceof Error ? e.message : "Erreur de chargement.";

  const roles = rolesRes.status === "fulfilled" ? rolesRes.value : [];
  const admins = adminsRes.status === "fulfilled" ? adminsRes.value.users : [];
  const adminsTotal = adminsRes.status === "fulfilled" ? adminsRes.value.total : 0;
  const appConfigs = appConfigRes.status === "fulfilled" ? appConfigRes.value : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Système"
        title="Paramètres"
        dataSource="partial"
        dataSourceHint="Admins, RBAC et Plateforme sont branchés sur l'API. Webhooks et Audit restent en démo (routes backend non exposées)."
        description="Rôles, permissions et configuration plateforme."
      />
      <Tabs
        defaultValue="admins"
        tabs={[
          {
            value: "admins",
            label: "Admins",
            badge: adminsRes.status === "fulfilled"
              ? { count: adminsTotal, tone: "primary" as const }
              : undefined,
            content: (
              <AdminsTab
                admins={admins}
                total={adminsTotal}
                roles={roles}
                error={
                  adminsRes.status === "rejected" ? errMsg(adminsRes.reason) : undefined
                }
              />
            ),
          },
          {
            value: "rbac",
            label: "Rôles & permissions",
            badge: meRes.status === "fulfilled"
              ? { count: meRes.value.permissions.length, tone: "success" as const }
              : undefined,
            content: (
              <RbacSection
                me={meRes.status === "fulfilled" ? meRes.value : null}
                meError={meRes.status === "rejected" ? errMsg(meRes.reason) : undefined}
                roles={roles}
                rolesError={rolesRes.status === "rejected" ? errMsg(rolesRes.reason) : undefined}
                catalog={catalogRes.status === "fulfilled" ? catalogRes.value : null}
                catalogError={catalogRes.status === "rejected" ? errMsg(catalogRes.reason) : undefined}
                admins={admins}
              />
            ),
          },
          {
            value: "webhooks",
            label: "Webhooks",
            content: <MockSettingsPage />,
          },
          {
            value: "audit",
            label: "Audit log",
            content: <MockSettingsPage />,
          },
          {
            value: "platform",
            label: "Plateforme",
            content: (
              <PlatformTab
                configs={appConfigs}
                error={
                  appConfigRes.status === "rejected" ? errMsg(appConfigRes.reason) : undefined
                }
              />
            ),
          },
        ]}
      />
    </div>
  );
}
