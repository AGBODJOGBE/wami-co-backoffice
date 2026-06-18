import { listPassengers } from "@/features/passengers/application/api";
import { PassengerDetailPage } from "@/features/passengers/passenger-detail-page";

export default async function VtcPassengerDetailPage({
  params,
}: {
  params: Promise<{ passengerId: string }>;
}) {
  const { passengerId } = await params;
  const { passengers } = await listPassengers();
  const passenger = passengers.find((p) => p.passengerId === passengerId) ?? null;
  return <PassengerDetailPage passengerId={passengerId} passenger={passenger} />;
}
