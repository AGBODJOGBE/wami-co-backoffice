import { requirePermission } from "@/features/auth/application/dal";
import { getAdminDelivery } from "@/features/delivery-b2c/application/api";
import { DeliveryDetailClient } from "@/features/delivery-b2c/presentation/delivery-detail-client";
import { DetailNotFound } from "@/shared/ui/detail-header";
import { ApiError } from "@/shared/lib/api/types";

export const dynamic = "force-dynamic";

export default async function DeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requirePermission("delivery_b2c.view_all");
  const { orderId } = await params;

  try {
    const delivery = await getAdminDelivery(orderId);
    return <DeliveryDetailClient delivery={delivery} backPath="/delivery/orders" />;
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.status === 404
          ? "Commande introuvable."
          : `${error.status} — ${error.message}`
        : error instanceof Error
          ? error.message
          : "Erreur inconnue.";
    return (
      <DetailNotFound
        backHref="/delivery/orders"
        backLabel="Retour aux commandes"
        message={message}
      />
    );
  }
}
