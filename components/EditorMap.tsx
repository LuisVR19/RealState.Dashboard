"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

// Mismo mapa de calles a color que el sitio público (Esri World Street Map, sin clave de acceso).
const STREETS = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

/** Mapa del editor: clic o arrastrar el marcador para fijar la ubicación. */
export function EditorMap({ lat, lng, onMove }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef(onMove);
  cb.current = onMove;
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      map = L.map(el.current, { zoomControl: true }).setView([lat, lng], 14);
      map.attributionControl.setPrefix(false);
      L.tileLayer(STREETS, { maxZoom: 18, attribution: "Esri, HERE, Garmin, © OpenStreetMap" }).addTo(map);
      const icon = L.divIcon({ className: "", iconSize: [0, 0], html: '<div class="editor-pin"><i class="ph-fill ph-map-pin"></i></div>' });
      const mk = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      const move = (ll: import("leaflet").LatLng) => { mk.setLatLng(ll); cb.current(ll.lat, ll.lng); };
      mk.on("dragend", () => move(mk.getLatLng()));
      map.on("click", (e) => move(e.latlng));
    })();
    return () => { cancelled = true; map?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={el} className="editor-map" />;
}
