import { listPassengers } from "@/features/passengers/application/api";
import { PassengersPage } from "@/features/passengers/passengers-page";

export default async function VtcPassengersPage() {
  const { passengers, total } = await listPassengers();
  return <PassengersPage initialPassengers={passengers} total={total} />;
}
