'use client';

import { useEffect, useRef } from 'react';
import type {
  RespondentFieldLocation,
  RespondentLocationValue,
} from '@/types/respondentForm';

type Props = {
  field: RespondentFieldLocation;
  value: RespondentLocationValue | undefined;
  onChange: (v: RespondentLocationValue | undefined) => void;
  mapContainerId: string;
};

export function RespondentLocationField({
  field,
  value,
  onChange,
  mapContainerId,
}: Props) {
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialPinRef = useRef(value);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = document.getElementById(mapContainerId);
    if (!el) return;

    let cancelled = false;

    void import('leaflet').then((Lmod) => {
      const L = Lmod.default;
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (cancelled || !el.isConnected) return;

      const lat0 = field.defaultLat ?? 31.5204;
      const lng0 = field.defaultLng ?? 74.3587;
      const zoom = field.defaultZoom ?? 13;

      const map = L.map(el).setView([lat0, lng0], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 22,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;

      const locateOptions = {
        setView: true,
        maxZoom: 22,
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      } as const;

      const placeMarker = (ll: import('leaflet').LatLngExpression) => {
        if (!markerRef.current) {
          const m = L.marker(ll, { draggable: true }).addTo(map);
          m.on('dragend', () => {
            const p = m.getLatLng();
            onChangeRef.current({ lat: p.lat, lng: p.lng });
          });
          markerRef.current = m;
        } else {
          markerRef.current.setLatLng(ll);
        }
        const p = markerRef.current.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      };

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        placeMarker(e.latlng);
      });

      map.on('locationfound', (e: import('leaflet').LocationEvent) => {
        placeMarker(e.latlng);
      });

      const LocateControl = L.Control.extend({
        options: { position: 'topleft' as const },
        onAdd(this: import('leaflet').Control) {
          const container = L.DomUtil.create(
            'div',
            'leaflet-bar leaflet-control',
          );
          const link = L.DomUtil.create('a', '', container);
          link.href = '#';
          link.title = 'My location';
          link.setAttribute('role', 'button');
          link.setAttribute('aria-label', 'Center map on my location');
          link.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
          link.style.display = 'flex';
          link.style.alignItems = 'center';
          link.style.justifyContent = 'center';
          link.style.lineHeight = '0';

          L.DomEvent.disableClickPropagation(container);
          L.DomEvent.on(link, 'click', L.DomEvent.stop);
          L.DomEvent.on(link, 'click', (ev: Event) => {
            L.DomEvent.stopPropagation(ev);
            L.DomEvent.preventDefault(ev);
            map.locate(locateOptions);
          });

          return container;
        },
      });
      new LocateControl().addTo(map);

      const start = initialPinRef.current;
      if (start) {
        placeMarker([start.lat, start.lng]);
      } else {
        // No saved value: try GPS first; map stays on field defaults if denied.
        map.locate(locateOptions);
      }

      requestAnimationFrame(() => map.invalidateSize());
    });

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapContainerId, field.defaultLat, field.defaultLng, field.defaultZoom]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map) return;
    if (!value) {
      if (marker) {
        map.removeLayer(marker);
        markerRef.current = null;
      }
      return;
    }
    if (marker) {
      marker.setLatLng([value.lat, value.lng]);
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div
        id={mapContainerId}
        className="h-[min(22rem,50vh)] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-zinc-900 ring-1 ring-black/20"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          Use the target button next to +/− for your location, tap the map to
          place the pin, or drag the pin to adjust.
        </span>
        {!field.required ? (
          <button
            type="button"
            className="text-[var(--accent-hover)] hover:underline"
            onClick={() => {
              const map = mapRef.current;
              const marker = markerRef.current;
              if (map && marker) {
                map.removeLayer(marker);
                markerRef.current = null;
              }
              onChange(undefined);
            }}
          >
            Clear pin
          </button>
        ) : null}
      </div>
      {value ? (
        <p className="font-mono text-xs text-zinc-400">
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      ) : null}
    </div>
  );
}
