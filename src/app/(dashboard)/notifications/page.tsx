import { requirePermission } from "@/features/auth/application/dal";
import { getNotificationHistory, getNotificationStats } from "@/features/notifications/application/api";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const dynamic = "force-dynamic";

export default async function NotificationsPageRoute() {
  await requirePermission("notification.send");

  const [stats, history] = await Promise.all([
    getNotificationStats(),
    getNotificationHistory({ limit: 100 }),
  ]);

  return <NotificationsPage stats={stats} history={history} />;
}
