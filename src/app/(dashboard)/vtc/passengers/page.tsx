import { requirePermission } from "@/features/auth/application/dal";
import { listPassengers } from "@/features/passengers/application/api";
import { listAdminRides } from "@/features/rides/application/api";
import { listAdminWallets } from "@/features/wallet/application/api";
import { PassengersPage } from "@/features/passengers/passengers-page";
import type { AdminRide } from "@/features/rides/domain/admin-ride";
import type { AdminWallet } from "@/features/wallet/domain/wallet";

export const dynamic = "force-dynamic";

export default async function VtcPassengersPage() {
  await requirePermission("passenger.view_all");
  const [passengersRes, ridesRes, walletsRes] = await Promise.allSettled([
    listPassengers(),
    listAdminRides(),
    listAdminWallets({ walletType: "PAYMENT" }),
  ]);

  const { passengers: rawPassengers, total } =
    passengersRes.status === "fulfilled"
      ? passengersRes.value
      : { passengers: [], total: 0 };

  const rides: AdminRide[] =
    ridesRes.status === "fulfilled" ? ridesRes.value.rides : [];

  const wallets: AdminWallet[] =
    walletsRes.status === "fulfilled" ? walletsRes.value.wallets : [];

  // ── Build indexes keyed by phone ─────────────────────────────────────────

  // rides grouped by passenger phone → { count, ratingsSum, ratingsCount }
  const ridesByPhone = new Map<
    string,
    { count: number; ratingsSum: number; ratingsCount: number; lastRideAt: string | null }
  >();

  for (const ride of rides) {
    const phone = ride.passenger?.phoneNumber ?? "";
    if (!phone) continue;
    const cur = ridesByPhone.get(phone) ?? {
      count: 0,
      ratingsSum: 0,
      ratingsCount: 0,
      lastRideAt: null,
    };
    cur.count += 1;
    const rating = (ride as unknown as { passengerRating?: number }).passengerRating;
    if (typeof rating === "number" && rating > 0) {
      cur.ratingsSum += rating;
      cur.ratingsCount += 1;
    }
    const rideDate = ride.createdAt ?? null;
    if (rideDate && (!cur.lastRideAt || rideDate > cur.lastRideAt)) {
      cur.lastRideAt = rideDate;
    }
    ridesByPhone.set(phone, cur);
  }

  // PAYMENT wallets keyed by ownerPhone
  const walletByPhone = new Map<string, AdminWallet>();
  for (const w of wallets) {
    if (w.walletType === "PAYMENT" && w.ownerPhone) {
      walletByPhone.set(w.ownerPhone, w);
    }
  }

  // ── Enrich each passenger ────────────────────────────────────────────────

  const passengers = rawPassengers.map((p) => {
    const ridesData = ridesByPhone.get(p.phone);
    const wallet = walletByPhone.get(p.phone);

    const totalRides = ridesData?.count ?? 0;
    const rating =
      ridesData && ridesData.ratingsCount > 0
        ? ridesData.ratingsSum / ridesData.ratingsCount
        : 0;
    const walletBalance = wallet?.totalBalance ?? 0;

    const lastActivity = ridesData?.lastRideAt
      ? formatRelative(ridesData.lastRideAt)
      : p.lastActivity;

    return { ...p, totalRides, rating, walletBalance, lastActivity };
  });

  return <PassengersPage initialPassengers={passengers} total={total} />;
}

// ── Helper ───────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  return `il y a ${Math.floor(days / 30)} mois`;
}
