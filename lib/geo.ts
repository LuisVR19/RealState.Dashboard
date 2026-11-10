// Utilidades de ubicación del editor (sin dependencias del navegador ni del servidor: se prueban solas).

export interface LatLng {
  lat: number;
  lng: number;
}

/** Campos de ubicación de un anuncio que se pueden completar desde el mapa o una búsqueda. */
export interface PlaceFields {
  country: string;
  province: string;
  canton: string;
  zone: string;
  address: string;
}

/** Resultado de búsqueda o de geocodificación inversa. */
export interface PlaceResult extends LatLng {
  /** Nombre corto ("Llanos de Santa Lucía"). */
  name: string;
  /** Línea completa ("Llanos de Santa Lucía, Paraíso, Cartago, Costa Rica"). */
  label: string;
  fields: Partial<PlaceFields>;
}

/** Punto por defecto de un anuncio nuevo (centro de Paraíso de Cartago). */
export const DEFAULT_POINT: LatLng = { lat: 9.8385, lng: -83.866 };

/** Las siete provincias de Costa Rica (sugerencias cuando el país es Costa Rica). */
export const CR_PROVINCES: readonly string[] = ["Alajuela", "Cartago", "Guanacaste", "Heredia", "Limón", "Puntarenas", "San José"];

/** 6 decimales ≈ 11 cm: más precisión no aporta nada y ensucia la base. */
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export const samePoint = (a: LatLng, b: LatLng) => Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;

const valid = (lat: number, lng: number): LatLng | null =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
    ? { lat: round6(lat), lng: round6(lng) }
    : null;

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

/**
 * Coordenadas pegadas a mano o dentro de un enlace de Google Maps / OpenStreetMap / Waze:
 *   "9.8385, -83.866" · "9.8385 -83.866" · ".../@9.8385,-83.866,17z" · "...?q=9.8385,-83.866"
 *   "...!3d9.8385!4d-83.866" · "...?mlat=9.8385&mlon=-83.866" · "...#map=17/9.8385/-83.866" · "...ll=9.8385,-83.866"
 * Devuelve null si el texto no trae un par válido (así se trata como búsqueda de texto).
 */
export function parseCoords(text: string): LatLng | null {
  const s = text.trim();
  if (!s) return null;
  const tries: RegExp[] = [
    new RegExp(String.raw`!3d${NUM}!4d${NUM}`), // lugar exacto de Google (más preciso que el @ de la vista)
    new RegExp(String.raw`[?&](?:q|query|ll|destination|daddr)=${NUM}(?:,|%2C)\s*${NUM}`, "i"),
    new RegExp(String.raw`mlat=${NUM}&mlon=${NUM}`, "i"),
    new RegExp(String.raw`#map=\d+(?:\.\d+)?/${NUM}/${NUM}`),
    new RegExp(String.raw`@${NUM},${NUM}`),
    new RegExp(String.raw`^${NUM}\s*[,;\s]\s*${NUM}$`), // texto pelado
  ];
  for (const re of tries) {
    const m = re.exec(s);
    if (m) return valid(Number(m[1]), Number(m[2]));
  }
  return null;
}

/** Quita prefijos administrativos que a veces trae OSM ("Cantón de Paraíso", "Provincia Cartago"). */
const clean = (x: string | undefined) =>
  (x ?? "").replace(/^(cant[oó]n|provincia|distrito|departamento|estado|municipio)\s+(de\s+)?/i, "").replace(/\s+/g, " ").trim();

type OsmAddress = Partial<Record<string, string>>;

/** Nombres oficiales de OSM → la forma corta que ya usa el inventario (COUNTRY_SUGGESTIONS). */
const COUNTRY_ALIASES: Record<string, string> = { "estados unidos de américa": "Estados Unidos", "estados unidos de america": "Estados Unidos", "estados unidos mexicanos": "México", "reino de españa": "España" };
const countryName = (x: string | undefined) => {
  const s = clean(x);
  return COUNTRY_ALIASES[s.toLowerCase()] ?? s;
};

/**
 * Traduce la dirección de Nominatim (OpenStreetMap) a los campos del anuncio.
 * En Costa Rica: province = provincia, county = cantón, y el distrito / barrio sale de
 * suburb / neighbourhood / village / town. En otros países la ciudad va antes que el condado
 * (Miami y no "Miami-Dade County").
 */
export function fieldsFromOsm(a: OsmAddress): Partial<PlaceFields> {
  const cr = a.country_code === "cr";
  const canton = clean(cr ? a.county ?? a.city ?? a.town ?? a.municipality : a.city ?? a.town ?? a.village ?? a.municipality ?? a.county);
  const zoneRaw = clean(a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? a.village ?? a.hamlet ?? a.town ?? a.residential);
  const out: Partial<PlaceFields> = {
    country: countryName(a.country),
    province: clean(a.province ?? a.state ?? a.region),
    canton,
    // Si el "barrio" es la misma ciudad no aporta nada.
    zone: zoneRaw && zoneRaw.localeCompare(canton, "es", { sensitivity: "base" }) !== 0 ? zoneRaw : "",
    address: clean(a.road),
  };
  // Solo los campos con dato: los vacíos no deben borrar lo que el asesor ya escribió.
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v)) as Partial<PlaceFields>;
}

/** Busca `x` en `known` sin distinguir mayúsculas ni tildes; devuelve la forma conocida o `x` normalizado. */
export function canonical(x: string, known: readonly string[]): string {
  const s = x.trim().replace(/\s+/g, " ");
  if (!s) return s;
  return known.find((k) => k.localeCompare(s, "es", { sensitivity: "base" }) === 0) ?? s;
}

export interface KnownPlaces {
  countries: readonly string[];
  provinces: readonly string[];
  cantons: readonly string[];
}

/** Une los campos sugeridos con los actuales, dejando la forma ya conocida de cada nombre. */
export function applyPlace(current: PlaceFields, found: Partial<PlaceFields>, known: KnownPlaces): PlaceFields {
  const next = { ...current };
  if (found.country) next.country = canonical(found.country, known.countries);
  // Al cambiar de país, la provincia vieja no aplica aunque la búsqueda no traiga una nueva.
  if (found.country && next.country !== current.country) next.province = "";
  if (found.province) next.province = canonical(found.province, known.provinces);
  if (found.canton) next.canton = canonical(found.canton, known.cantons);
  if (found.zone) next.zone = found.zone;
  // La calle solo rellena una dirección vacía: la referencia escrita a mano vale más.
  if (found.address && !current.address.trim()) next.address = found.address;
  return next;
}

/** ¿Qué campos cambiarían al aplicar `found`? (la sugerencia solo se muestra si aporta algo). */
export function placeDiff(current: PlaceFields, found: Partial<PlaceFields>, known: KnownPlaces): (keyof PlaceFields)[] {
  const next = applyPlace(current, found, known);
  return (Object.keys(next) as (keyof PlaceFields)[]).filter((k) => next[k] !== current[k]);
}
