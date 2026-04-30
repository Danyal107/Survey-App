"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  lat: number;
  lng: number;
  /** Leaflet zoom level when centering on the pin. */
  zoom?: number;
};

/**
 * Displays a fixed pin (no editing). Map can be panned/zoomed for viewing only.
 */
export function ShopLocationReadOnlyMap({ lat, lng, zoom = 15 }: Props) {
  const containerId = useMemo(
    () => `shop-ro-map-${crypto.randomUUID().replace(/-/g, "")}`,
    []
  );
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;

    let cancelled = false;

    void import("leaflet").then((Lmod) => {
      const L = Lmod.default;
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (cancelled || !el.isConnected) return;

      const map = L.map(el, {
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
      }).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.marker([lat, lng], { draggable: false }).addTo(map);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [containerId, lat, lng, zoom]);

  return (
    <div
      id={containerId}
      className="h-[min(22rem,50vh)] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-zinc-900 ring-1 ring-black/20"
      role="img"
      aria-label={`Map showing location ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
    />
  );
}
