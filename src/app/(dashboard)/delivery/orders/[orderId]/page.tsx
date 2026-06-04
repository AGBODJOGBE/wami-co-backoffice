import { OrderDetailPage } from "@/features/delivery/presentation/order-detail-page";

export default async function DeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailPage orderId={orderId} />;
}
