"use server";

// Búsqueda de direcciones y geocodificación inversa para el editor de anuncios.
// Se hace desde el servidor (y no desde el navegador) para: exigir sesión del panel, no abrir la CSP
// a otro origen y mandar un User-Agent identificable, como pide la política de uso de Nominatim
// (https://operations.osmfoundation.org/policies/nominatim/). Solo se llama por acciones explícitas
// (buscar, mover el marcador), nunca mientras se escribe.
import { panelUrl, runAction, UserError, v } from "@/lib/action";
import { fieldsFromOsm, round6, type PlaceResult } from "@/lib/geo";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const TIMEOUT_MS = 6000;

interface OsmPlace {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}

async function osm(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(path, NOMINATIM);
  for (const [k, val] of Object.entries({ format: "jsonv2", addressdetails: "1", "accept-language": "es", ...params })) url.searchParams.set(k, val);
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": `RealStatePanel/1.0 (+${panelUrl()})`, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new UserError("El buscador de mapas no respondió. Intenta de nuevo o marca el punto en el mapa.");
  }
  if (res.status === 429) throw new UserError("Demasiadas búsquedas seguidas. Espera unos segundos.");
  if (!res.ok) throw new UserError("El buscador de mapas no está disponible ahora. Marca el punto en el mapa.");
  return res.json();
}

function toResult(p: OsmPlace): PlaceResult | null {
  const lat = Number(p.lat), lng = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = (p.display_name ?? "").replace(/,\s*\d{4,6}(?=,)/, ""); // sin el código postal
  return { lat: round6(lat), lng: round6(lng), name: p.name || label.split(",")[0] || "Ubicación", label, fields: fieldsFromOsm(p.address ?? {}) };
}

/** Busca un lugar por texto ("Santa Lucía, Paraíso", "Brickell, Miami"). Hasta 6 resultados. */
export async function searchPlaces(query: string) {
  return runAction(async () => {
    const q = v.text(query, "La búsqueda", 200, true);
    if (q.length < 3) throw new UserError("Escribe al menos 3 letras.");
    const data = await osm("/search", { q, limit: "6" });
    return (Array.isArray(data) ? data : []).map((p) => toResult(p as OsmPlace)).filter((r): r is PlaceResult => r !== null);
  }, { refresh: false });
}

/** Lugar en un punto del mapa (para sugerir país, provincia, cantón y barrio). null si no hay nada. */
export async function reversePlace(lat: number, lng: number) {
  return runAction(async () => {
    const la = v.num(lat, "Latitud", -90, 90, false), lo = v.num(lng, "Longitud", -180, 180, false);
    if (la === null || lo === null) throw new UserError("Coordenadas inválidas.");
    const data = (await osm("/reverse", { lat: String(la), lon: String(lo), zoom: "17" })) as OsmPlace & { error?: string };
    if (!data || data.error) return null;
    const r = toResult(data);
    // El punto es el del marcador, no el del lugar encontrado.
    return r && { ...r, lat: round6(la), lng: round6(lo) };
  }, { refresh: false });
}
