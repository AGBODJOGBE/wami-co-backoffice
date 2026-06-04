import { PassengerDetailPage } from "@/features/passengers/passenger-detail-page";

export default async function VtcPassengerDetailPage({
  params,
}: {
  params: Promise<{ passengerId: string }>;
}) {
  const { passengerId } = await params;
  return <PassengerDetailPage passengerId={passengerId} />;
}
