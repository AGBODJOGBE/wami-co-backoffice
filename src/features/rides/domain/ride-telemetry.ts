/**
 * Télémétrie de course — miroir de
 *   GET /api/admin/rides/:rideId/telemetry   (permission ride.telemetry.view)
 *   GET /api/admin/rides/:rideId/track       (permission ride.telemetry.track.view — OPS_ADMIN seul)
 *
 * Doctrine D2 du backend : « absence de donnée ≠ 0/false ». Chaque champ des
 * blocs distances/durées/décisions/signal est indépendamment nullable, et
 * `null` veut dire « inconnu », jamais zéro. Ne jamais afficher 0 à la place.
 */

export type RideEndStatus =
  | "COMPLETED"
  | "CANCELLED_PASSENGER"
  | "CANCELLED_DRIVER"
  | "CANCELLED_SYSTEM"
  | "ADMIN_FORCED";

export const RIDE_END_STATUS_LABELS: Record<RideEndStatus, string> = {
  COMPLETED: "Terminée",
  CANCELLED_PASSENGER: "Annulée par le passager",
  CANCELLED_DRIVER: "Annulée par le chauffeur",
  CANCELLED_SYSTEM: "Annulée par le système",
  ADMIN_FORCED: "Forcée par un admin",
};

export type RideTelemetryDataAvailability = "FULL" | "PARTIAL" | "UNAVAILABLE";

export const DATA_AVAILABILITY_META: Record<
  RideTelemetryDataAvailability,
  { label: string; tone: "success" | "warning" | "danger"; hint: string }
> = {
  FULL: { label: "Données complètes", tone: "success", hint: "Toutes les distances et durées ont été mesurées en direct." },
  PARTIAL: { label: "Données partielles", tone: "warning", hint: "Certaines valeurs n'ont pas pu être reconstituées (résumé rétro-calculé ou course non terminée)." },
  UNAVAILABLE: { label: "Aucune donnée GPS", tone: "danger", hint: "Aucun point GPS n'a été archivé pour cette course." },
};

export type RouteSource = "OSRM" | "HAVERSINE_FALLBACK";

export const ROUTE_SOURCE_LABELS: Record<RouteSource, string> = {
  OSRM: "Route réelle (OSRM)",
  HAVERSINE_FALLBACK: "Estimation de repli (ligne droite × facteur)",
};

export interface RideTelemetryDistances {
  approachDrivenMeters: number | null;
  approachStraightLineMeters: number | null;
  billableDrivenMeters: number | null;
  clientReportedMeters: number | null;
  serverMeteredMeters: number | null;
  billedMeters: number | null;
  osrmReferenceRouteMeters: number | null;
  osrmReferenceRouteSource: RouteSource | null;
}

export interface RideTelemetryDurations {
  approachSeconds: number | null;
  waitingAtPickupSeconds: number | null;
  rideSeconds: number | null;
  totalPausedSeconds: number | null;
}

export interface RideTelemetryDecisions {
  distanceFloorApplied: boolean | null;
  runawayGuardTriggered: boolean | null;
  runawayGuardPreCapMeters: number | null;
  distanceUnverifiable: boolean | null;
  gapRecoveries: number | null;
  gapHaversineFallbacks: number | null;
}

export interface RideTelemetrySignal {
  pointsCount: number | null;
  averageAccuracyMeters: number | null;
  maxAccuracyMeters: number | null;
  medianPingIntervalSeconds: number | null;
  longestGapSeconds: number | null;
  discardedPointsCount: number | null;
  truncated: boolean | null;
  pointsWithDeviceTimestampCount: number | null;
  likelyReplayedPointsCount: number | null;
}

export interface RideTelemetrySummary {
  outcome: RideEndStatus;
  dataAvailability: RideTelemetryDataAvailability;
  computedAt: string;
  distances: RideTelemetryDistances;
  durations: RideTelemetryDurations;
  /** Entièrement null pour toute issue ≠ COMPLETED (une course annulée n'a jamais été facturée). */
  decisions: RideTelemetryDecisions;
  signal: RideTelemetrySignal;
}

interface RideTelemetryBase {
  rideId: string;
  rideNumber: string;
  status: string;
}

export type RideTelemetryResponse =
  | (RideTelemetryBase & { available: true; summary: RideTelemetrySummary })
  | (RideTelemetryBase & {
      available: false;
      reason: "RIDE_NOT_TERMINAL_YET" | "NO_TELEMETRY_RECORDED";
    });

export const TELEMETRY_UNAVAILABLE_REASONS: Record<string, string> = {
  RIDE_NOT_TERMINAL_YET: "La course n'est pas encore terminée : le résumé est calculé une seule fois, à sa fin de vie.",
  NO_TELEMETRY_RECORDED: "La course est close mais aucun résumé n'a été produit (pas de chauffeur assigné, aucun point GPS, ou course antérieure à la télémétrie).",
};

// ─── Trace GPS ────────────────────────────────────────────────────────────────

export interface RideGpsTrackPoint {
  latitude: number;
  longitude: number;
  heading: number;
  accuracy: number;
  speed: number;
  rideStatus: string;
  timestamp: string;
}

export interface RideGpsTrackSegment {
  type: "Feature";
  /** Coordonnées GeoJSON : [longitude, latitude]. */
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: {
    rideStatus: string;
    startTimestamp: string;
    endTimestamp: string;
    pointCount: number;
  };
}

export type RideGpsTrackResponse =
  | {
      rideId: string;
      trackAvailable: true;
      pointCount: number;
      decimatedPointCount: number;
      every: number;
      truncated: boolean;
      discardedPointsCount: number;
      geojson: { type: "FeatureCollection"; features: RideGpsTrackSegment[] };
      points: RideGpsTrackPoint[];
    }
  | {
      rideId: string;
      trackAvailable: false;
      reason: "PURGED_TTL" | "NOT_RECORDED" | "PRE_TELEMETRY_CUTOVER" | "RIDE_NOT_TERMINAL_YET";
    };

export const TRACK_UNAVAILABLE_REASONS: Record<string, string> = {
  PURGED_TTL: "La trace a existé mais a dépassé la rétention (14 jours après la clôture de la course).",
  NOT_RECORDED: "Aucune trace n'a été archivée (pas de chauffeur assigné avant annulation, aucun point capté…).",
  PRE_TELEMETRY_CUTOVER: "Course créée avant la mise en service de la télémétrie (23/09/2026) : sa trace n'a jamais pu être captée.",
  RIDE_NOT_TERMINAL_YET: "La course est toujours en cours : la trace n'est archivée qu'à sa clôture.",
};

/** Couleur par statut de course pour rejouer approche vs course. */
export const TRACK_STATUS_COLORS: Record<string, string> = {
  DRIVER_EN_ROUTE: "#f59e0b",
  DRIVER_ARRIVED: "#8b5cf6",
  IN_PROGRESS: "#10b981",
  PAUSED: "#ef4444",
};

export const TRACK_STATUS_LABELS: Record<string, string> = {
  DRIVER_EN_ROUTE: "Approche du chauffeur",
  DRIVER_ARRIVED: "Attente au point de départ",
  IN_PROGRESS: "Course en cours",
  PAUSED: "Pause",
};
