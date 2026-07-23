import { requirePermission } from "@/features/auth/application/dal";
import { getNotificationStats } from "@/features/notifications/application/api";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const dynamic = "force-dynamic";

export default async function NotificationsPageRoute() {
  await requirePermission("notification.send");
  const stats = await getNotificationStats();
  return <NotificationsPage stats={stats} />;
}
