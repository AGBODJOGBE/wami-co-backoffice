import { requirePermission } from "@/features/auth/application/dal";
import { getRevenueShareAlerts } from "@/features/contracts/application/api";
import { listAdminDrivers } from "@/features/drivers/application/api";
import {
  RevenueShareAlertsPage,
  type RevenueShareAlertRow,
} from "@/features/contracts/presentation/revenue-share-alerts-page";

export const dynamic = "force-dynamic";

export default async function RevenueShareAlertsRoute() {
  await requirePermission("contract.view_all");

  let alerts: Awaited<ReturnType<typeof getRevenueShareAlerts>> = { items: [], total: 0, page: 1, limit: 100 };
  let error: string | undefined;
  try {
    alerts = await getRevenueShareAlerts({ limit: 100 });
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de chargement.";
  }

  const driversRes = await listAdminDrivers().catch(() => ({ drivers: [], total: 0 }));
  const driversMap = new Map(
    driversRes.drivers.map((d) => [
      d.driverId,
      { name: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.driverId, phone: d.phoneNumber ?? "" },
    ]),
  );

  const rows: RevenueShareAlertRow[] = alerts.items.map((a) => {
    const info = driversMap.get(a.driverId);
    return { ...a, driverName: info?.name ?? a.driverId, driverPhone: info?.phone ?? "" };
  });

  return <RevenueShareAlertsPage alerts={rows} total={alerts.total} error={error} />;
}
