// NOTE — héritage : le folder s'appelle `delivery-b2b/` mais le contenu
// est en réalité B2C (commandes individuelles passager → driver via
// GET /api/admin/delivery). Voir le commentaire dans navigation.ts.

import { listAdminDeliveries } from "@/features/delivery-b2c/application/api";
import { DeliveriesListClient } from "@/features/delivery-b2c/presentation/deliveries-list-client";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function DeliveryB2cListPage() {
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
        eyebrow="Livraison B2C"
        title="Livraisons"
        dataSource="live"
        dataSourceHint="Branché sur GET /api/admin/delivery — commandes individuelles depuis l'app passager."
        description="Toutes les commandes B2C avec filtres, recherche et accès au détail enrichi (OTP, photos, parcel, recipient)."
      />
      <DeliveriesListClient
        deliveries={deliveries.deliveries}
        total={deliveries.total}
        error={error}
      />
    </div>
  );
}
