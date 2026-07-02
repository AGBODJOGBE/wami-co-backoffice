import { listPassengers } from "@/features/passengers/application/api";
import { PassengersPage } from "@/features/passengers/passengers-page";

export const dynamic = "force-dynamic";

export default async function VtcPassengersPage() {
  const { passengers, total } = await listPassengers();
  return <PassengersPage initialPassengers={passengers} total={total} />;
}
