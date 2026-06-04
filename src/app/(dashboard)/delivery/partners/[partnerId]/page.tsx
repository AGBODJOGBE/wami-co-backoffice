import { PartnerDetailPage } from "@/features/partners/partner-detail-page";

export default async function DeliveryPartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  return <PartnerDetailPage partnerId={partnerId} />;
}
