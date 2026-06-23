import { listPassengers } from "@/features/passengers/application/api";
import { listAdminRides } from "@/features/rides/application/api";
import { listAdminWallets } from "@/features/wallet/application/api";
import { PassengerDetailPage } from "@/features/passengers/passenger-detail-page";

export const dynamic = "force-dynamic";

export default async function VtcPassengerDetailPage({
  params,
}: {
  params: Promise<{ passengerId: string }>;
}) {
  const { passengerId } = await params;

  const [passengersRes, ridesRes, walletsRes] = await Promise.allSettled([
    listPassengers(),
    listAdminRides(),
    listAdminWallets(),
  ]);

  const passengers =
    passengersRes.status === "fulfilled"
      ? passengersRes.value.passengers
      : [];
  const passenger =
    passengers.find((p) => p.passengerId === passengerId) ?? null;

  const rides =
    ridesRes.status === "fulfilled" ? ridesRes.value.rides : [];
  const wallets =
    walletsRes.status === "fulfilled" ? walletsRes.value.wallets : [];

  // Filter rides by phone number (backend ignores passengerId query param)
  const passengerRides = passenger
    ? rides.filter((r) => r.passenger?.phoneNumber === passenger.phone)
    : [];

  // Find the passenger's PAYMENT wallet via profileId from a matching ride
  const profileId = passengerRides[0]?.passenger?.passengerId ?? null;
  const passengerWallet =
    profileId
      ? (wallets.find(
          (w) => w.profileId === profileId && w.walletType === "PAYMENT",
        ) ?? null)
      : null;

  return (
    <PassengerDetailPage
      passengerId={passengerId}
      passenger={passenger}
      rides={passengerRides}
      wallet={passengerWallet}
    />
  );
}
