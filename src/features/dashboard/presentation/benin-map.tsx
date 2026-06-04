"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L, {
  type LatLngExpression,
  type Layer,
  type PathOptions,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Badge } from "@/shared/ui/badge";
import beninDepartmentsRaw from "../geo/benin-departments.json";
import beninCommunesRaw from "../geo/benin-communes.json";
import type {
  BeninDepartmentsCollection,
  DepartmentStats,
} from "../geo/types";

type DriverPinStatus = "AVAILABLE" | "BUSY" | "OFFLINE";

const beninDepartments = beninDepartmentsRaw as unknown as BeninDepartmentsCollection;
const beninCommunes = beninCommunesRaw as unknown as BeninDepartmentsCollection;

// Center on the southern coast (Cotonou-Calavi axis) — that's where the
// vast majority of drivers live.
const SOUTH_BENIN_CENTER: LatLngExpression = [6.55, 2.4];
const INITIAL_ZOOM = 9;

// Convention demandée:
//   - en attente (AVAILABLE) : jaune
//   - en course (BUSY)       : vert
//   - offline                : rouge sombre (lisible sur la heat map chaude)
const PIN_COLORS: Record<DriverPinStatus, string> = {
  AVAILABLE: "#fbbf24", // amber 400
  BUSY: "#10b981", // emerald 500
  OFFLINE: "#7f1d1d", // red 900
};
const PIN_LABELS: Record<DriverPinStatus, string> = {
  AVAILABLE: "en attente",
  BUSY: "en course",
  OFFLINE: "hors ligne",
};

const MOCK_STATS: Record<string, DepartmentStats> = {
  Borgou: { online: 14, available: 9, busy: 5 },
  Alibori: { online: 4, available: 3, busy: 1 },
  Atakora: { online: 6, available: 5, busy: 1 },
  Donga: { online: 3, available: 2, busy: 1 },
  Collines: { online: 8, available: 6, busy: 2 },
  Plateau: { online: 7, available: 4, busy: 3 },
  Zou: { online: 12, available: 8, busy: 4 },
  Littoral: { online: 64, available: 38, busy: 26 },
  Kouffo: { online: 5, available: 4, busy: 1 },
  Oueme: { online: 22, available: 14, busy: 8 },
  Atlanique: { online: 41, available: 25, busy: 16 },
  Mono: { online: 6, available: 4, busy: 2 },
};

/** Approx anchors per département + spread (degrees) for pin scatter. */
const DEPARTMENT_ANCHORS: Record<
  string,
  { lat: number; lng: number; spread: number }
> = {
  Borgou: { lat: 9.34, lng: 2.62, spread: 0.4 },
  Alibori: { lat: 11.13, lng: 2.94, spread: 0.4 },
  Atakora: { lat: 10.32, lng: 1.39, spread: 0.4 },
  Donga: { lat: 9.7, lng: 1.66, spread: 0.3 },
  Collines: { lat: 8.0, lng: 2.13, spread: 0.35 },
  Plateau: { lat: 7.43, lng: 2.66, spread: 0.25 },
  Zou: { lat: 7.18, lng: 2.0, spread: 0.3 },
  Littoral: { lat: 6.366, lng: 2.434, spread: 0.04 },
  Kouffo: { lat: 6.95, lng: 1.71, spread: 0.2 },
  Oueme: { lat: 6.5, lng: 2.61, spread: 0.18 },
  Atlanique: { lat: 6.45, lng: 2.34, spread: 0.18 },
  Mono: { lat: 6.59, lng: 1.78, spread: 0.18 },
};

interface DriverPin {
  lat: number;
  lng: number;
  name: string;
  status: DriverPinStatus;
}

interface DeptStats {
  online: number;
  available: number;
  busy: number;
  offline: number;
}

/**
 * Ray-casting point-in-polygon — true when (lng, lat) is inside the
 * passed ring (array of [lng, lat] pairs). Handles only the outer ring;
 * good enough for our admin boundaries (no holes that contain drivers).
 */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Count pins per département using the GeoJSON polygons. Departments
 * with no driver get a zeroed entry so the tooltip never falls back to
 * mock numbers in live mode. First match wins (departments don't overlap).
 */
function computeStatsFromPins(pins: DriverPin[]): Record<string, DeptStats> {
  const stats: Record<string, DeptStats> = {};
  for (const dept of beninDepartments.features) {
    const name = (dept.properties as { shapeName: string }).shapeName;
    stats[name] = { online: 0, available: 0, busy: 0, offline: 0 };
  }
  for (const pin of pins) {
    for (const dept of beninDepartments.features) {
      const name = (dept.properties as { shapeName: string }).shapeName;
      const geom = dept.geometry as
        | { type: "Polygon"; coordinates: number[][][] }
        | { type: "MultiPolygon"; coordinates: number[][][][] };
      let hit = false;
      if (geom.type === "Polygon") {
        hit = pointInRing(pin.lng, pin.lat, geom.coordinates[0]);
      } else {
        for (const poly of geom.coordinates) {
          if (pointInRing(pin.lng, pin.lat, poly[0])) {
            hit = true;
            break;
          }
        }
      }
      if (!hit) continue;
      const s = stats[name];
      if (pin.status === "AVAILABLE") {
        s.available += 1;
        s.online += 1;
      } else if (pin.status === "BUSY") {
        s.busy += 1;
        s.online += 1;
      } else {
        s.offline += 1;
      }
      break;
    }
  }
  return stats;
}

/** mulberry32 — small deterministic PRNG so the demo distribution doesn't
 * shuffle on every render. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPins(): DriverPin[] {
  const rand = mulberry32(0xc0ffee);
  const pins: DriverPin[] = [];
  let counter = 0;
  for (const [dep, stats] of Object.entries(MOCK_STATS)) {
    const a = DEPARTMENT_ANCHORS[dep];
    if (!a) continue;
    const offline = Math.max(0, Math.round(stats.online * 0.18));
    const totals: Array<[DriverPinStatus, number]> = [
      ["AVAILABLE", stats.available],
      ["BUSY", stats.busy],
      ["OFFLINE", offline],
    ];
    for (const [status, count] of totals) {
      for (let i = 0; i < count; i++) {
        pins.push({
          lat: a.lat + (rand() - 0.5) * 2 * a.spread,
          lng: a.lng + (rand() - 0.5) * 2 * a.spread,
          name: `Driver #${(counter++).toString(36).padStart(8, "0")}`,
          status,
        });
      }
    }
  }
  return pins;
}

const ALL_PINS = buildPins();

/**
 * Choropleth — départements colorés selon leur nombre d'online drivers.
 * 0 = quasi transparent (jaune léger pour rester sur la palette), >0
 * monte vers l'ambre puis rouge. Sans ça, tout reste jaune uniforme et
 * la rep visuelle entre Mono (1 driver) et Littoral (60 drivers) est
 * la même — la carte ne sert à rien.
 */
function colorFor(onlineCount: number): PathOptions {
  if (onlineCount === 0) {
    return { fillColor: "#fbbf24", fillOpacity: 0.05 };
  }
  if (onlineCount < 5) {
    return { fillColor: "#fbbf24", fillOpacity: 0.18 };
  }
  if (onlineCount < 20) {
    return { fillColor: "#f59e0b", fillOpacity: 0.28 };
  }
  if (onlineCount < 50) {
    return { fillColor: "#ea580c", fillOpacity: 0.38 };
  }
  return { fillColor: "#dc2626", fillOpacity: 0.45 };
}

/**
 * Marker cluster layer driven by leaflet.markercluster. The cluster radius
 * (50 px on screen) is tuned for the Bénin scale: at zoom 9 that's roughly
 * 6 km on the ground in the south, so any "concentration zone" — multiple
 * drivers within the same handful of km² — collapses into a single
 * coloured cluster bubble. Zoom in to spread it back out (spiderfy at max
 * zoom).
 */
function ClusterLayer({ pins }: { pins: DriverPin[] }) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    const group = L.markerClusterGroup({
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const total = cluster.getChildCount();
        const bounds = cluster.getBounds();
        // Approximate "concentration" via the diameter (in km) of the
        // cluster's bounding box. Pulsing animation on tight clusters
        // (=> many drivers in a small area) signals a hot spot.
        const diameterKm = bounds
          ? bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 1000
          : 0;
        // density ≈ drivers per km² (rough but enough to threshold a pulse)
        const areaKm2 = Math.max(1, Math.PI * Math.pow(diameterKm / 2, 2));
        const density = total / areaKm2;
        const isHotSpot = total >= 8 && density >= 2;

        const size = total < 10 ? 32 : total < 50 ? 40 : 52;
        const color =
          total < 10 ? "#10b981" : total < 50 ? "#f59e0b" : "#dc2626";
        return L.divIcon({
          html: `<div style="
            background:${color};
            color:#fff;
            border:3px solid rgba(255,255,255,0.9);
            box-shadow:0 4px 16px rgba(0,0,0,0.25);
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:700;
            font-size:13px;
            width:${size}px;
            height:${size}px;
          ">${total}</div>`,
          className: isHotSpot ? "fyb-cluster fyb-cluster-hot" : "fyb-cluster",
          iconSize: [size, size],
        });
      },
    });

    pins.forEach((pin) => {
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: 6,
        fillColor: PIN_COLORS[pin.status],
        // Outline pin in white for AVAILABLE/BUSY (good on dark) but in
        // black for OFFLINE so the dark-red dot still pops on the warm
        // choropleth (otherwise it merges with the orange/red département).
        color: pin.status === "OFFLINE" ? "#000" : "#fff",
        weight: 2,
        fillOpacity: 1,
      });
      marker.bindTooltip(
        `<strong>${pin.name}</strong><br/>${PIN_LABELS[pin.status]}`,
        { direction: "top", offset: [0, -6], sticky: true },
      );
      marker.bindPopup(
        `<div style="font-size:11px;line-height:1.3"><strong>${pin.name}</strong><br/>` +
          `Statut : ${PIN_LABELS[pin.status]}<br/>` +
          `Position : ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}</div>`,
      );
      group.addLayer(marker);
    });

    // markercluster's onAdd touches the map panes; if we add the layer
    // before the map is fully initialised (or during a Strict Mode double
    // mount) it crashes with "Cannot read properties of undefined (reading
    // 'appendChild')". Defer to whenReady + a cancellation flag.
    map.whenReady(() => {
      if (cancelled) return;
      map.addLayer(group);
    });

    return () => {
      cancelled = true;
      if (map.hasLayer(group)) {
        map.removeLayer(group);
      }
    };
  }, [pins, map]);

  return null;
}

export interface BeninMapProps {
  /** When provided, drives the markers from live data instead of the
   *  deterministic mock seed. Status is mapped: BUSY (in-ride) → BUSY,
   *  AVAILABLE/ONLINE → AVAILABLE, anything else → OFFLINE. */
  livePins?: DriverPin[];
}

export function BeninMap({ livePins }: BeninMapProps = {}) {
  // "Live mode" is opt-in: the caller passed a `livePins` array (even
  // empty). In live mode we trust the real numbers — Mono with 1 driver
  // should display "1", not 6 mocked ones. Only when the prop is
  // completely absent do we fall back to the seed dataset (story mode).
  const isLive = livePins !== undefined;
  const pins = isLive ? livePins : ALL_PINS;
  const [hovered, setHovered] = useState<string | null>(null);

  const liveStats = useMemo(() => computeStatsFromPins(pins), [pins]);

  /** Stats source for the choropleth tooltip — live counts when the
   *  caller passed data (even zeroes), MOCK_STATS for the story mode. */
  const tooltipStats: Record<string, DeptStats> = useMemo(() => {
    if (isLive) return liveStats;
    // Convert MOCK_STATS into the same DeptStats shape (with offline).
    const out: Record<string, DeptStats> = {};
    for (const [name, s] of Object.entries(MOCK_STATS)) {
      out[name] = {
        online: s.online,
        available: s.available,
        busy: s.busy,
        offline: Math.round(s.online * 0.18),
      };
    }
    return out;
  }, [isLive, liveStats]);

  const total = useMemo(() => {
    const offline = pins.filter((p) => p.status === "OFFLINE").length;
    const available = pins.filter((p) => p.status === "AVAILABLE").length;
    const busy = pins.filter((p) => p.status === "BUSY").length;
    return {
      online: available + busy,
      available,
      busy,
      offline,
    };
  }, [pins]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted-foreground)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="primary">{total.online} en ligne</Badge>
          <Badge tone="success">{total.available} dispo</Badge>
          <Badge tone="info">{total.busy} en course</Badge>
          <Badge tone="danger">{total.offline} offline</Badge>
        </div>
        <PinLegend />
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <MapContainer
          center={SOUTH_BENIN_CENTER}
          zoom={INITIAL_ZOOM}
          minZoom={6}
          maxZoom={16}
          scrollWheelZoom
          style={{ height: "440px", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Communes (ADM2) — fine grid drawn as the visual partition */}
          <GeoJSON
            data={beninCommunes}
            style={{
              color: "#475569",
              weight: 0.5,
              fillOpacity: 0,
            }}
            interactive={false}
          />

          {/* Departments (ADM1) — choropleth coloré par concentration +
              tooltip enrichi. Keyed sur la signature des stats live :
              react-leaflet cache le layer (onEachFeature ne refire pas
              tout seul), donc un changement de stats force un re-mount
              propre — sinon Mono garderait son count d'origine après une
              mise à jour live. */}
          <GeoJSON
            key={`dept-${Object.values(tooltipStats)
              .map((s) => `${s.available}.${s.busy}.${s.offline}`)
              .join("|")}`}
            data={beninDepartments}
            style={(feature) => {
              const f = feature as
                | { properties: { shapeName: string } }
                | undefined;
              if (!f) return {};
              const name = f.properties.shapeName;
              const stats = tooltipStats[name];
              const onlineCount = stats?.online ?? 0;
              return {
                weight: hovered === name ? 2.2 : 1.2,
                color: hovered === name ? "#0a3a8b" : "#1f3b73",
                ...colorFor(onlineCount),
              };
            }}
            onEachFeature={(feature, layer: Layer) => {
              const f = feature as { properties: { shapeName: string } };
              const stats =
                tooltipStats[f.properties.shapeName] ?? {
                  online: 0,
                  available: 0,
                  busy: 0,
                  offline: 0,
                };
              layer.on({
                mouseover: () => setHovered(f.properties.shapeName),
                mouseout: () => setHovered(null),
              });
              layer.bindTooltip(
                `<div style="min-width:160px">
                  <strong style="font-size:13px">${f.properties.shapeName}</strong>
                  <div style="margin-top:4px;display:grid;grid-template-columns:auto auto;gap:4px 10px;font-size:11px">
                    <span style="display:inline-flex;align-items:center;gap:6px">
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PIN_COLORS.AVAILABLE}"></span>
                      En attente
                    </span>
                    <strong style="text-align:right">${stats.available}</strong>
                    <span style="display:inline-flex;align-items:center;gap:6px">
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PIN_COLORS.BUSY}"></span>
                      En course
                    </span>
                    <strong style="text-align:right">${stats.busy}</strong>
                    <span style="display:inline-flex;align-items:center;gap:6px">
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PIN_COLORS.OFFLINE}"></span>
                      Offline
                    </span>
                    <strong style="text-align:right">${stats.offline}</strong>
                  </div>
                  <div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(0,0,0,0.08);font-size:11px;display:flex;justify-content:space-between">
                    <span>Total en ligne</span>
                    <strong>${stats.online}</strong>
                  </div>
                </div>`,
                { sticky: true, direction: "top", className: "benin-tooltip" },
              );
            }}
          />

          <ClusterLayer pins={pins} />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[color:var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="relative inline-flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
          </span>
          Bulle pulsante = zone à forte concentration (≥ 2 drivers / km²)
        </span>
        <span>
          77 communes · 12 départements · clusters auto (rayon ≈ 6 km)
        </span>
      </div>
    </div>
  );
}

function PinLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px]">
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block size-2.5 rounded-full ring-2 ring-white"
          style={{ backgroundColor: PIN_COLORS.AVAILABLE }}
        />
        Dispo
      </span>
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block size-2.5 rounded-full ring-2 ring-white"
          style={{ backgroundColor: PIN_COLORS.BUSY }}
        />
        En course
      </span>
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block size-2.5 rounded-full ring-2 ring-black"
          style={{ backgroundColor: PIN_COLORS.OFFLINE }}
        />
        Offline
      </span>
    </div>
  );
}

