"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDateTime } from "@/shared/lib/format";
import {
  TRACK_STATUS_COLORS,
  TRACK_STATUS_LABELS,
  type RideGpsTrackPoint,
  type RideGpsTrackSegment,
} from "../domain/ride-telemetry";

function FitBounds({ segments }: { segments: RideGpsTrackSegment[] }) {
  const map = useMap();
  useEffect(() => {
    const latLngs: [number, number][] = segments.flatMap((s) =>
      s.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    );
    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] });
    }
  }, [map, segments]);
  return null;
}

export interface RideTrackMapProps {
  segments: RideGpsTrackSegment[];
  points: RideGpsTrackPoint[];
}

/** Rejeu d'une trace GPS : un tracé par segment contigu de même statut de course,
 * coloré par statut (approche vs course), avec départ et arrivée de la trace. */
export function RideTrackMap({ segments, points }: RideTrackMapProps) {
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <MapContainer
      center={first ? [first.latitude, first.longitude] : [6.37, 2.42]}
      zoom={13}
      scrollWheelZoom
      className="h-[460px] w-full rounded-xl border border-[color:var(--border)]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds segments={segments} />

      {segments.map((seg, i) => (
        <Polyline
          key={`${seg.properties.rideStatus}-${i}`}
          positions={seg.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])}
          pathOptions={{
            color: TRACK_STATUS_COLORS[seg.properties.rideStatus] ?? "#3b82f6",
            weight: 4,
            opacity: 0.9,
          }}
        >
          <Popup>
            <strong>{TRACK_STATUS_LABELS[seg.properties.rideStatus] ?? seg.properties.rideStatus}</strong>
            <br />
            {seg.properties.pointCount} points
            <br />
            {formatDateTime(seg.properties.startTimestamp)} → {formatDateTime(seg.properties.endTimestamp)}
          </Popup>
        </Polyline>
      ))}

      {first && (
        <CircleMarker
          center={[first.latitude, first.longitude]}
          radius={8}
          pathOptions={{ color: "#065f46", fillColor: "#10b981", fillOpacity: 1 }}
        >
          <Popup>Premier point — {formatDateTime(first.timestamp)}</Popup>
        </CircleMarker>
      )}
      {last && last !== first && (
        <CircleMarker
          center={[last.latitude, last.longitude]}
          radius={8}
          pathOptions={{ color: "#7f1d1d", fillColor: "#ef4444", fillOpacity: 1 }}
        >
          <Popup>Dernier point — {formatDateTime(last.timestamp)}</Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
