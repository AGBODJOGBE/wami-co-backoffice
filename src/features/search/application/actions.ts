"use server";

import { listAdminRides } from "@/features/rides/application/api";
import { listAdminDeliveries } from "@/features/delivery-b2c/application/api";
import { fullParty } from "@/features/rides/domain/admin-ride";
import { rideStatusMeta } from "@/features/rides/domain/admin-ride";
import { deliveryStatusMeta } from "@/features/delivery-b2c/domain/delivery";

/** A single hit shown in the topbar dropdown. */
export interface SearchHit {
  kind: "ride" | "delivery";
  id: string;
  /** The user-facing number — FY-RD-... / FY-B2C-... / etc. */
  ref: string;
  /** A short, scannable subtitle (passenger · driver · status). */
  subtitle: string;
  /** Status pill label + tone for the row. */
  statusLabel: string;
  statusTone: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  /** Pre-computed lowercase haystack so the client can `includes()` cheaply. */
  haystack: string;
  /** Where clicking the hit takes the admin. */
  href: string;
}

export interface SearchIndex {
  hits: SearchHit[];
  /** ISO timestamp the snapshot was built — small diagnostic. */
  builtAt: string;
  /** Per-source errors so the UI can hint at degraded indexes. */
  ridesError?: string;
  deliveriesError?: string;
}

function reason(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur de chargement.";
}

/**
 * Builds a flat, search-friendly index of every ride + B2C delivery the
 * admin can see. Called by the topbar on first focus, then cached
 * client-side for the rest of the session — every keystroke after that
 * is a pure `String.prototype.includes()` over the in-memory haystacks.
 *
 * Returning lower-cased haystacks server-side means the client doesn't
 * have to re-lowercase anything on every keystroke.
 */
export async function loadSearchIndex(): Promise<SearchIndex> {
  const [ridesRes, delsRes] = await Promise.allSettled([
    listAdminRides(),
    listAdminDeliveries(),
  ]);

  const hits: SearchHit[] = [];

  if (ridesRes.status === "fulfilled") {
    for (const r of ridesRes.value.rides) {
      const passenger = fullParty(r.passenger);
      const driver = fullParty(r.driver);
      const passPhone = r.passenger?.phoneNumber ?? "";
      const driverPhone = r.driver?.phoneNumber ?? "";
      const meta = rideStatusMeta(r.status);
      hits.push({
        kind: "ride",
        id: r.rideId,
        ref: r.rideNumber,
        subtitle: `${passenger} · ${driver === "—" ? "driver non assigné" : driver} · ${r.vehicleType}`,
        statusLabel: meta.label,
        statusTone: meta.tone,
        haystack:
          `${r.rideNumber} ${passenger} ${driver} ${passPhone} ${driverPhone} ${r.vehicleType}`.toLowerCase(),
        href: `/vtc/rides/${r.rideId}`,
      });
    }
  }

  if (delsRes.status === "fulfilled") {
    for (const d of delsRes.value.deliveries) {
      const passenger = d.passenger?.name ?? "expéditeur inconnu";
      const driver = d.driver?.name ?? "driver non assigné";
      const passPhone = d.passenger?.phone ?? "";
      const driverPhone = d.driver?.phone ?? "";
      const meta = deliveryStatusMeta(d.status);
      hits.push({
        kind: "delivery",
        id: d.id,
        ref: d.orderNumber,
        subtitle: `${passenger} · ${driver} · ${d.vehicleType}`,
        statusLabel: meta.label,
        statusTone: meta.tone,
        haystack:
          `${d.orderNumber} ${passenger} ${driver} ${passPhone} ${driverPhone} ${d.vehicleType}`.toLowerCase(),
        href: `/delivery-b2b/shipments/${d.id}`,
      });
    }
  }

  return {
    hits,
    builtAt: new Date().toISOString(),
    ridesError:
      ridesRes.status === "rejected" ? reason(ridesRes.reason) : undefined,
    deliveriesError:
      delsRes.status === "rejected" ? reason(delsRes.reason) : undefined,
  };
}
