import { requirePermission } from "@/features/auth/application/dal";
import { SendersListPage } from "@/features/delivery-b2b/presentation/senders-list";

export default async function SendersRoute() {
  await requirePermission("delivery_b2c.view_all");
  return <SendersListPage />;
}
