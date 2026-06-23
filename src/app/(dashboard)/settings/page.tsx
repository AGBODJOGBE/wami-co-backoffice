import { getCurrentAdmin } from "@/features/auth/application/session";
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

  const me = meRes.status === "fulfilled" ? meRes.value : null;
  const session = await getCurrentAdmin();
  const roles = rolesRes.status === "fulfilled" ? rolesRes.value : [];
  const rawAdmins = adminsRes.status === "fulfilled" ? adminsRes.value.users : [];
  const adminsTotal = adminsRes.status === "fulfilled" ? adminsRes.value.total : 0;
  const appConfigs = appConfigRes.status === "fulfilled" ? appConfigRes.value : [];

  // Enrich admin list: inject adminId where known.
  // We only know the mapping userId↔adminId for the logged-in user (from session cookie).
  const enriched = rawAdmins.map((a) => {
    if (session && a.userId === session.userId) {
      return { ...a, adminId: session.adminId };
    }
    return a;
  });

  // The current admin might have been filtered out by listAdminUsers() if their
  // user role is PASSENGER/DRIVER (admin profile is separate from user role).
  // Always ensure the logged-in admin is in the list.
  const currentInList = session && enriched.some((a) => a.userId === session.userId);
  const admins = !currentInList && session
    ? [
        {
          userId: session.userId,
          adminId: session.adminId,
          firstName: session.firstName,
          lastName: session.lastName,
          phoneNumber: session.phone,
          email: null,
          role: session.role.name,
          isActive: session.status === "ACTIVE",
          createdAt: "",
        },
        ...enriched,
      ]
    : enriched;

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
