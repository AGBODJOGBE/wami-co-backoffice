"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, string>();

/**
 * Reverse-geocodes a lat/lng pair using Nominatim (OpenStreetMap).
 * Returns the display_name string, or null while loading / on error.
 *
 * Results are cached in-memory for the lifetime of the page to avoid
 * hammering the API when the component re-renders.
 */
export function useReverseGeocode(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { address: string | null; loading: boolean } {
  const key = lat != null && lng != null ? `${lat.toFixed(5)},${lng.toFixed(5)}` : null;
  const [address, setAddress] = useState<string | null>(key ? (cache.get(key) ?? null) : null);
  const [loading, setLoading] = useState<boolean>(key != null && !cache.has(key ?? ""));

  useEffect(() => {
    if (!key || cache.has(key)) return;
    let cancelled = false;
    setLoading(true);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      { headers: { "User-Agent": "foryouboard-admin/1.0" } },
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const name: string =
          data?.display_name ??
          data?.address?.road ??
          `${lat}, ${lng}`;
        cache.set(key, name);
        setAddress(name);
      })
      .catch(() => {
        if (!cancelled) setAddress(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [key, lat, lng]);

  return { address, loading };
}
