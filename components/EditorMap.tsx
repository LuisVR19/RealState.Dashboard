"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";
import { round6 } from "@/lib/geo";

// Mismo mapa de calles a color que el sitio público (Esri World Street Map, sin clave de acceso).
const STREETS = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
/** Zoom al llegar a un punto buscado o a la ubicación del dispositivo. */
const FOCUS_ZOOM = 17;

/**
 * Mapa del editor: clic o arrastrar el marcador para fijar la ubicación.
 * - Es controlado: si `lat`/`lng` cambian desde afuera (búsqueda, GPS, coordenadas pegadas), el
 *   marcador se mueve y el mapa vuela hasta él.
 * - La rueda del ratón no hace zoom hasta que se hace clic en el mapa (si no, al bajar por el
 *   formulario el mapa "atrapa" el scroll).
 */
export function EditorMap({ lat, lng, onMove, label = "Mapa de ubicación" }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void; label?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef(onMove);
  cb.current = onMove;
  const api = useRef<{ map: LMap; mk: Marker } | null>(null);
  const start = useRef({ lat, lng });

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      const { lat: la, lng: lo } = start.current;
      const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: false }).setView([la, lo], 15);
      map.attributionControl.setPrefix(false);
      L.tileLayer(STREETS, { maxZoom: 19, maxNativeZoom: 18, attribution: "Esri, HERE, Garmin, © OpenStreetMap" }).addTo(map);
      const icon = L.divIcon({ className: "", iconSize: [0, 0], html: '<div class="editor-pin"><i class="ph-fill ph-map-pin"></i></div>' });
      const mk = L.marker([la, lo], { draggable: true, icon, keyboard: true, title: "Arrastra para ajustar", alt: "Ubicación del anuncio", autoPan: true }).addTo(map);
      const move = (ll: { lat: number; lng: number }) => {
        mk.setLatLng(ll);
        cb.current(round6(ll.lat), round6(ll.lng));
      };
      mk.on("dragend", () => move(mk.getLatLng()));
      map.on("click", (e) => move(e.latlng));
      // Zoom con rueda solo mientras el mapa está "activo" (después de un clic dentro).
      map.on("focus click", () => map.scrollWheelZoom.enable());
      map.on("blur mouseout", () => map.scrollWheelZoom.disable());
      // El contenedor cambia de ancho con el layout (columnas, menú lateral): sin esto quedan mosaicos grises.
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(el.current);
      api.current = { map, mk };
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      api.current?.map.remove();
      api.current = null;
    };
  }, []);

  // Punto cambiado desde afuera: mover marcador y centrar (no se hace si el cambio vino del propio mapa).
  useEffect(() => {
    const a = api.current;
    if (!a) {
      start.current = { lat, lng };
      return;
    }
    const cur = a.mk.getLatLng();
    if (Math.abs(cur.lat - lat) < 1e-6 && Math.abs(cur.lng - lng) < 1e-6) return;
    a.mk.setLatLng([lat, lng]);
    a.map.flyTo([lat, lng], Math.max(a.map.getZoom(), FOCUS_ZOOM), { duration: 0.6 });
  }, [lat, lng]);

  return <div ref={el} className="editor-map" role="application" aria-label={label} />;
}
