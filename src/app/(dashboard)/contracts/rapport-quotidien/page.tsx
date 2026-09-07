import { requirePermission } from "@/features/auth/application/dal";
import { DailyCollectionReportPage } from "@/features/contracts/presentation/daily-collection-report";

export const dynamic = "force-dynamic";

export default async function RapportQuotidienRoute() {
  await requirePermission("contract.view_all");
  return <DailyCollectionReportPage />;
}
