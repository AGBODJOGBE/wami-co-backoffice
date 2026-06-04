import "server-only";

import { listAdminRides } from "@/features/rides/application/api";
import {
  listAdminDrivers,
  listOnlineDrivers,
  listPendingDrivers,
} from "@/features/drivers/application/api";
import { listAdminDeliveries } from "@/features/delivery-b2c/application/api";
import type { AdminRide } from "@/features/rides/domain/admin-ride";
import type {
  AdminDriver,
  OnlineDriver,
  PendingDriver,
} from "@/features/drivers/domain/admin-driver";
import {
  IN_FLIGHT_DELIVERY_STATUSES,
  REVENUE_DELIVERY_STATUSES,
  type AdminDelivery,
} from "@/features/delivery-b2c/domain/delivery";

/** ISO timestamp at 00:00 local time for the date `n` days before now. */
function startOfDayOffset(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/** ISO timestamp at 23:59:59.999 local time for the date `n` days before now. */
function endOfDayOffset(daysAgo: number): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/** A ride counts toward "revenus" once the driver and passenger have agreed
 * on the trip outcome (completed or rated). */
const REVENUE_STATUSES = new Set(["COMPLETED", "RATED"]);
const IN_PROGRESS_STATUSES = new Set([
  "REQUESTED",
  "MATCHED",
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "PAUSED",
]);

export interface RideKpi {
  total: number;
  inProgress: number;
  revenue: number;
}

function aggregateRides(rides: AdminRide[]): RideKpi {
  let inProgress = 0;
  let revenue = 0;
  for (const r of rides) {
    if (IN_PROGRESS_STATUSES.has(r.status)) inProgress += 1;
    if (REVENUE_STATUSES.has(r.status)) {
      revenue += r.finalPrice || r.estimatedPrice || 0;
    }
  }
  return { total: rides.length, inProgress, revenue };
}

export interface DeliveryKpi {
  total: number;
  inFlight: number;
  delivered: number;
  failed: number;
}

function aggregateDeliveries(items: AdminDelivery[]): DeliveryKpi {
  let inFlight = 0;
  let delivered = 0;
  let failed = 0;
  for (const d of items) {
    if (IN_FLIGHT_DELIVERY_STATUSES.has(d.status)) inFlight += 1;
    if (REVENUE_DELIVERY_STATUSES.has(d.status)) delivered += 1;
    if (d.status === "FAILED" || d.status === "CANCELLED") failed += 1;
  }
  return { total: items.length, inFlight, delivered, failed };
}

/** Limit deliveries to those created within [from, to]. The list endpoint
 * doesn't expose a date filter yet, so we filter client-side; cheap with
 * the current volumes. */
function filterByCreatedAt(
  items: AdminDelivery[],
  fromIso: string,
  toIso: string,
): AdminDelivery[] {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return items.filter((d) => {
    const t = new Date(d.createdAt).getTime();
    return t >= from && t <= to;
  });
}

export interface DashboardSnapshot {
  /** Rides created today (any status). */
  today: {
    rides: AdminRide[];
    kpi: RideKpi;
    error?: string;
  };
  /** Rides created yesterday — used to compute trend deltas. */
  yesterday: {
    kpi: RideKpi;
    error?: string;
  };
  /** B2C deliveries — list endpoint has no date filter so we slice
   *  in-memory into today/yesterday windows. */
  deliveries: {
    today: DeliveryKpi;
    yesterday: DeliveryKpi;
    error?: string;
  };
  online: {
    drivers: OnlineDriver[];
    error?: string;
  };
  pending: {
    drivers: PendingDriver[];
    error?: string;
  };
}

function reasonToMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return "Erreur de chargement.";
}

/**
 * Single fan-out call powering the home dashboard. Every section degrades
 * gracefully: a 4xx/5xx on rides won't break the drivers panel, and
 * vice-versa. Errors are surfaced per-section so the UI can render the
 * actual reason next to the impacted card.
 */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [todayRes, yRes, onlineRes, pendingRes, allDriversRes, deliveriesRes] =
    await Promise.allSettled([
      listAdminRides({
        fromDate: startOfDayOffset(0),
        toDate: endOfDayOffset(0),
      }),
      listAdminRides({
        fromDate: startOfDayOffset(1),
        toDate: endOfDayOffset(1),
      }),
      listOnlineDrivers(),
      listPendingDrivers(),
      // Used to enrich the pending list with real names — non-blocking:
      // if it fails the pending card just shows "Driver #xxxxxxxx".
      listAdminDrivers(),
      listAdminDeliveries(),
    ]);

  const todayRides =
    todayRes.status === "fulfilled" ? todayRes.value.rides : [];
  const yesterdayRides =
    yRes.status === "fulfilled" ? yRes.value.rides : [];

  // Enrich pending with firstName/lastName/phone from the rich list when
  // both calls succeed.
  const rawPending =
    pendingRes.status === "fulfilled" ? pendingRes.value.drivers : [];
  const allDrivers: AdminDriver[] =
    allDriversRes.status === "fulfilled" ? allDriversRes.value.drivers : [];
  const byDriverId = new Map(allDrivers.map((d) => [d.driverId, d]));
  const enrichedPending: PendingDriver[] = rawPending.map((p) => {
    const rich = byDriverId.get(p.driverId);
    return rich
      ? {
          ...p,
          firstName: rich.firstName,
          lastName: rich.lastName,
          phoneNumber: rich.phoneNumber,
          photoUrl: rich.photoUrl,
        }
      : p;
  });

  const allDeliveries: AdminDelivery[] =
    deliveriesRes.status === "fulfilled"
      ? deliveriesRes.value.deliveries
      : [];
  const todayDeliveries = filterByCreatedAt(
    allDeliveries,
    startOfDayOffset(0),
    endOfDayOffset(0),
  );
  const yesterdayDeliveries = filterByCreatedAt(
    allDeliveries,
    startOfDayOffset(1),
    endOfDayOffset(1),
  );

  return {
    today: {
      rides: todayRides,
      kpi: aggregateRides(todayRides),
      error:
        todayRes.status === "rejected"
          ? reasonToMessage(todayRes.reason)
          : undefined,
    },
    yesterday: {
      kpi: aggregateRides(yesterdayRides),
      error:
        yRes.status === "rejected" ? reasonToMessage(yRes.reason) : undefined,
    },
    deliveries: {
      today: aggregateDeliveries(todayDeliveries),
      yesterday: aggregateDeliveries(yesterdayDeliveries),
      error:
        deliveriesRes.status === "rejected"
          ? reasonToMessage(deliveriesRes.reason)
          : undefined,
    },
    online: {
      drivers:
        onlineRes.status === "fulfilled" ? onlineRes.value.drivers : [],
      error:
        onlineRes.status === "rejected"
          ? reasonToMessage(onlineRes.reason)
          : undefined,
    },
    pending: {
      drivers: enrichedPending,
      error:
        pendingRes.status === "rejected"
          ? reasonToMessage(pendingRes.reason)
          : undefined,
    },
  };
}

/** Returns a "+12% vs hier" / "−4% vs hier" / "= vs hier" string and an
 * "up" | "down" | "flat" direction hint. Handles the divide-by-zero
 * baseline explicitly (no infinite arrows). */
export function computeTrend(today: number, yesterday: number): {
  label: string;
  direction: "up" | "down" | "flat";
} {
  if (yesterday === 0) {
    if (today === 0) return { label: "= vs hier", direction: "flat" };
    return { label: "premier jour mesuré", direction: "flat" };
  }
  const delta = today - yesterday;
  const pct = Math.round((delta / yesterday) * 100);
  if (pct === 0) return { label: "= vs hier", direction: "flat" };
  const sign = pct > 0 ? "+" : "−";
  return {
    label: `${sign}${Math.abs(pct)}% vs hier`,
    direction: pct > 0 ? "up" : "down",
  };
}
