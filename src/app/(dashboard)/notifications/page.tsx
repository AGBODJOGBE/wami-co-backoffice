import { requirePermission } from "@/features/auth/application/dal";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export default async function NotificationsPageRoute() {
  await requirePermission("notification.send");
  return <NotificationsPage />;
}
