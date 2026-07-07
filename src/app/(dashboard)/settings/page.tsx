import {
  getMyPermissions,
  listPermissionsByModule,
  listRoles,
} from "@/features/rbac/application/api";
import { RbacSection } from "@/features/rbac/presentation/rbac-section";
import { listAdmins, listAppConfigs, listSystemConfigs, getWelcomeBonusCampaign } from "@/features/settings/application/api";
import { AdminsTab } from "@/features/settings/presentation/admins-tab";
import { PlatformTab } from "@/features/settings/presentation/platform-tab";
import { SettingsPage as MockSettingsPage } from "@/features/settings/settings-page";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPageRoute() {
  const [meRes, rolesRes, catalogRes, adminsRes, appConfigRes, systemConfigsRes, welcomeBonusRes] =
    await Promise.allSettled([
      getMyPermissions(),
      listRoles(),
      listPermissionsByModule(),
      listAdmins(),
      listAppConfigs(),
      listSystemConfigs(),
      getWelcomeBonusCampaign(),
    ]);

  const errMsg = (e: unknown) =>
    e instanceof Error ? e.message : "Erreur de chargement.";

  const me = meRes.status === "fulfilled" ? meRes.value : null;
  const roles = rolesRes.status === "fulfilled" ? rolesRes.value : [];
  const admins = adminsRes.status === "fulfilled" ? adminsRes.value.admins : [];
  const adminsTotal = adminsRes.status === "fulfilled" ? adminsRes.value.total : 0;
  const catalog = catalogRes.status === "fulfilled" ? catalogRes.value : null;
  const appConfigs = appConfigRes.status === "fulfilled" ? appConfigRes.value : [];
  const allSystemConfigs = systemConfigsRes.status === "fulfilled" ? systemConfigsRes.value : [];
  const toleranceConfig = allSystemConfigs.find((c) => c.key === "PAYMENT_TOLERANCE_DAYS") ?? null;
  const welcomeBonus = welcomeBonusRes.status === "fulfilled" ? welcomeBonusRes.value : null;

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
              ? { count: admins.length, tone: "primary" as const }
              : undefined,
            content: (
              <AdminsTab
                admins={admins}
                total={adminsTotal}
                roles={roles}
                catalog={catalog}
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
                toleranceConfig={toleranceConfig}
                welcomeBonus={welcomeBonus}
                systemConfigs={allSystemConfigs}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
