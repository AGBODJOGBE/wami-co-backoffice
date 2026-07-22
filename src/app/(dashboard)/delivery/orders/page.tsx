import { requirePermission } from "@/features/auth/application/dal";
import { listAdminDeliveries } from "@/features/delivery-b2c/application/api";
import { DeliveriesListClient } from "@/features/delivery-b2c/presentation/deliveries-list-client";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function DeliveryOrdersPage() {
  await requirePermission("delivery_b2c.view_all");

  let deliveries: Awaited<ReturnType<typeof listAdminDeliveries>> = {
    deliveries: [],
    total: 0,
  };
  let error: string | undefined;
  try {
    deliveries = await listAdminDeliveries();
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de chargement.";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opérations livraison"
        title="Commandes B2C"
        dataSource="live"
        dataSourceHint="GET /api/admin/delivery — lifecycle pickup → OTP → delivery, photos preuve."
        description="Toutes les commandes B2C avec filtres, recherche et accès au détail enrichi."
      />
      <DeliveriesListClient
        deliveries={deliveries.deliveries}
        total={deliveries.total}
        error={error}
        basePath="/delivery/orders"
      />
    </div>
  );
}
