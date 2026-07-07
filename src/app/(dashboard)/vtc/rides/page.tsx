import { requirePermission } from "@/features/auth/application/dal";
import { listAdminRides } from "@/features/rides/application/api";
import { AdminRidesListClient } from "@/features/rides/presentation/admin-rides-list-client";
import type { AdminRide } from "@/features/rides/domain/admin-ride";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 200; // backend hard cap — Math.min(200, ...) in ListAllRidesUseCase

/** Fetches every page until all rides are collected. */
async function fetchAllRides(): Promise<{ rides: AdminRide[]; total: number }> {
  // Page 1
  const first = await listAdminRides({ page: 1, limit: PAGE_LIMIT });
  const total = first.total;
  const allRides: AdminRide[] = [...first.rides];

  if (allRides.length >= total) {
    return { rides: allRides, total };
  }

  // How many more pages are needed?
  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const remainingPages = Array.from(
    { length: totalPages - 1 },
    (_, i) => i + 2,
  );

  // Fetch remaining pages in parallel (max 10 concurrent)
  const CONCURRENCY = 10;
  for (let i = 0; i < remainingPages.length; i += CONCURRENCY) {
    const batch = remainingPages.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((p) => listAdminRides({ page: p, limit: PAGE_LIMIT })),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        allRides.push(...r.value.rides);
      }
    }
  }

  return { rides: allRides, total };
}

export default async function VtcRidesPage() {
  await requirePermission("ride.view_all");
  try {
    const { rides, total } = await fetchAllRides();
    return <AdminRidesListClient rides={rides} total={total} />;
  } catch (error) {
    return (
      <AdminRidesListClient
        rides={[]}
        total={0}
        error={error instanceof Error ? error.message : "Erreur de chargement."}
      />
    );
  }
}
