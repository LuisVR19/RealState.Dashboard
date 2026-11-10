import { Constants } from "./supabase/database.types";
import { CR_PROVINCES } from "./geo";
import type { Amenity, Canton, Category, ClientPreferences, ClientStatus, Drivetrain, Fuel, Operation, Property, PropertyStatus, PropertyType, Transmission, VisitStatus } from "./types";

export const OP_LABEL: Record<Operation, string> = { Venta: "Venta", Alquiler: "Alquiler", Vacacional: "Alquiler vacacional", Preventa: "Preventa" };
export const OPERATIONS = Constants.public.Enums.property_operation as readonly Operation[];
export const TYPES = Constants.public.Enums.property_type as readonly PropertyType[];
export const PROPERTY_STATUSES = Constants.public.Enums.property_status as readonly PropertyStatus[];

// -----------------------------------------------------------------------------
// Categorías (inmueble / vehículo). Mismas reglas que public.type_category y el CHECK de la base.
// -----------------------------------------------------------------------------
export const CATEGORIES = Constants.public.Enums.listing_category as readonly Category[];
export const CATEGORY_LABEL: Record<Category, string> = { Inmueble: "Inmuebles", Vehículo: "Vehículos" };
export const CATEGORY_ICON: Record<Category, string> = { Inmueble: "ph-house-line", Vehículo: "ph-car-profile" };
const VEHICLE_TYPES: readonly PropertyType[] = ["Carro", "Moto", "Pickup", "Camión"];
export const categoryOf = (t: PropertyType): Category => (VEHICLE_TYPES.includes(t) ? "Vehículo" : "Inmueble");
export const isVehicle = (p: { type: PropertyType }) => categoryOf(p.type) === "Vehículo";
export const typesOf = (c: Category) => TYPES.filter((t) => categoryOf(t) === c);
/** Un vehículo solo se publica en venta o alquiler. */
export const operationsOf = (c: Category): readonly Operation[] => (c === "Vehículo" ? ["Venta", "Alquiler"] : OPERATIONS);
export const TRANSMISSIONS = Constants.public.Enums.vehicle_transmission as readonly Transmission[];
export const FUELS = Constants.public.Enums.vehicle_fuel as readonly Fuel[];
export const DRIVETRAINS = Constants.public.Enums.vehicle_drivetrain as readonly Drivetrain[];
/** "Anuncio" en general; "propiedad" / "vehículo" cuando se sabe la categoría. */
export const itemNoun = (c?: Category | null) => (c === "Vehículo" ? "vehículo" : c === "Inmueble" ? "propiedad" : "anuncio");

const AMENITY_ICON: Record<string, string> = {
  Piscina: "ph-swimming-pool", Gimnasio: "ph-barbell", "Seguridad 24h": "ph-shield-check", Jardín: "ph-plant", Terraza: "ph-sun-horizon", Amueblado: "ph-armchair", "Pet friendly": "ph-paw-print", "Área social": "ph-users-three", "Parqueo visitas": "ph-car", "Planta eléctrica": "ph-lightning",
  "Aire acondicionado": "ph-snowflake", "Cámara de retroceso": "ph-video-camera", "Sensores de parqueo": "ph-broadcast", Bluetooth: "ph-bluetooth", "Pantalla táctil": "ph-device-tablet", "Vidrios eléctricos": "ph-arrows-down-up", "Asientos de cuero": "ph-armchair", Sunroof: "ph-sun", "Aros de lujo": "ph-circle-dashed", "Único dueño": "ph-user-check", "Marchamo al día": "ph-seal-check", "RTV al día": "ph-clipboard-text",
};
/** Ícono de una amenidad del catálogo (las nuevas usan uno genérico). */
export const amenityIcon = (a: Amenity) => AMENITY_ICON[a] ?? "ph-check-circle";
/** Sugerencias iniciales (cantones de Cartago). La ubicación es texto libre: se aceptan ciudades de cualquier país. */
export const CANTONS: readonly Canton[] = ["Paraíso", "Cartago", "Oreamuno", "La Unión", "El Guarco", "Alvarado", "Jiménez", "Turrialba"];
export const DEFAULT_COUNTRY = "Costa Rica";
export const COUNTRY_SUGGESTIONS: readonly string[] = ["Costa Rica", "Panamá", "Nicaragua", "México", "Estados Unidos", "Colombia", "España"];

/** Valores únicos, sin vacíos, en orden alfabético (es). */
export const uniqueSorted = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.map((x) => x?.trim()).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "es"));

export type PlaceEntry = Pick<Property, "canton" | "province" | "country">;
export interface Places {
  cantons: string[];
  provinces: string[];
  countries: string[];
  /** Combinaciones país / provincia / cantón del inventario (para sugerir según el país elegido). */
  entries: PlaceEntry[];
}

/** Ubicaciones conocidas: las del inventario más las sugerencias base. */
export const knownPlaces = (props: PlaceEntry[]): Places => ({
  cantons: uniqueSorted([...props.map((p) => p.canton), ...CANTONS]),
  provinces: uniqueSorted([...props.map((p) => p.province), ...CR_PROVINCES]),
  countries: uniqueSorted([...props.map((p) => p.country), ...COUNTRY_SUGGESTIONS]),
  entries: props.map(({ canton, province, country }) => ({ canton, province, country })),
});

const sameText = (a: string | null | undefined, b: string) => !!a && a.localeCompare(b, "es", { sensitivity: "base" }) === 0;

/**
 * Sugerencias de provincia y cantón para un país (y una provincia, si se eligió): las del inventario en
 * ese lugar, más las provincias y cantones base cuando es Costa Rica. Sin país, todas.
 */
export function placesFor(places: Places, country: string, province = ""): { provinces: string[]; cantons: string[] } {
  if (!country.trim()) return { provinces: places.provinces, cantons: places.cantons };
  const inCountry = places.entries.filter((e) => sameText(e.country, country));
  const cr = sameText(DEFAULT_COUNTRY, country);
  const inProvince = province.trim() ? inCountry.filter((e) => sameText(e.province, province)) : inCountry;
  // Los cantones base son de Cartago: se sugieren sin provincia o con Cartago.
  const baseCantons = cr && (!province.trim() || sameText("Cartago", province)) ? CANTONS : [];
  return {
    provinces: uniqueSorted([...inCountry.map((e) => e.province), ...(cr ? CR_PROVINCES : [])]),
    cantons: uniqueSorted([...inProvince.map((e) => e.canton), ...baseCantons]),
  };
}

/** "Zona, cantón" y el país si no es Costa Rica. */
export const placeLine = (p: Pick<Property, "zone" | "canton" | "country">) =>
  [p.zone, p.canton, p.country && p.country !== DEFAULT_COUNTRY ? p.country : null].filter(Boolean).join(", ");
export const CLIENT_STATUSES = Constants.public.Enums.client_status as readonly ClientStatus[];
export const VISIT_STATUSES = Constants.public.Enums.visit_status as readonly VisitStatus[];

/** [fondo, texto] de las etiquetas de estado. */
export const PROPERTY_STATUS_STYLE: Record<PropertyStatus, [string, string]> = { Publicada: ["var(--color-accent-900)", "var(--color-accent-200)"], Borrador: ["var(--color-neutral-800)", "var(--color-neutral-300)"], Pausada: ["#f6efe1", "#7a5a12"], Vendida: ["#17191c", "#ffffff"], Alquilada: ["#17191c", "#ffffff"] };
export const VISIT_STATUS_STYLE: Record<VisitStatus, [string, string]> = { Pendiente: ["#f6efe1", "#7a5a12"], Confirmada: ["var(--color-accent-900)", "var(--color-accent-200)"], Realizada: ["var(--color-neutral-800)", "var(--color-neutral-300)"], Cancelada: ["#f7e8e6", "#8a2f24"] };
export const CLIENT_STATUS_STYLE: Record<ClientStatus, [string, string]> = { Nuevo: ["#f6efe1", "#7a5a12"], "En seguimiento": ["var(--color-accent-900)", "var(--color-accent-200)"], Negociando: ["#e6edf6", "#1f4170"], Cerrado: ["#17191c", "#ffffff"], Inactivo: ["var(--color-neutral-800)", "var(--color-neutral-400)"] };
export const scoreStyle = (n: number): [string, string] => (n >= 90 ? ["var(--color-accent)", "#fff"] : n >= 75 ? ["var(--color-accent-900)", "var(--color-accent-200)"] : ["var(--color-neutral-800)", "var(--color-neutral-300)"]);

/** Estados que retiran la propiedad del sitio por cierre de negocio. */
export const isClosed = (s: PropertyStatus) => s === "Vendida" || s === "Alquilada";

export const dots = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const crc = (n: number) => "₡" + dots(n);
export const shortCrc = (n: number) => {
  if (n >= 1e6) {
    const v = n / 1e6;
    return "₡" + (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(".", ",") + " M";
  }
  return "₡" + Math.round(n / 1000) + " mil";
};
export const decimal = (n: number) => String(n).replace(".", ",");
export const pricePeriod = (p: Pick<Property, "operation">) => (p.operation === "Alquiler" ? "/mes" : p.operation === "Vacacional" ? "/noche" : "");
export const priceSuffix = (p: Property) =>
  p.operation === "Alquiler" ? "/mes" : p.operation === "Vacacional" ? "/noche" : !isVehicle(p) && p.areaM2 ? shortCrc(p.price / p.areaM2) + "/m²" : "";
/** "Toyota Hilux SR" (vehículo) o "" si no hay marca ni modelo. */
export const vehicleName = (p: Pick<Property, "brand" | "model">) => [p.brand, p.model].filter(Boolean).join(" ");
export const specs = (p: Property) =>
  (isVehicle(p)
    ? [
        p.yearBuilt ? { icon: "ph-calendar-blank", label: String(p.yearBuilt) } : null,
        p.mileageKm != null ? { icon: "ph-gauge", label: `${dots(p.mileageKm)} km` } : null,
        p.transmission ? { icon: "ph-steering-wheel", label: p.transmission } : null,
        p.fuel ? { icon: "ph-gas-pump", label: p.fuel } : null,
      ]
    : [
        p.bedrooms ? { icon: "ph-bed", label: `${p.bedrooms} hab.` } : null,
        p.bathrooms ? { icon: "ph-bathtub", label: decimal(p.bathrooms) + (p.bathrooms === 1 ? " baño" : " baños") } : null,
        p.areaM2 ? { icon: "ph-ruler", label: `${dots(p.areaM2)} m²` } : null,
        p.guests ? { icon: "ph-users", label: `${p.guests} huésp.` } : null,
      ]
  ).filter(Boolean) as { icon: string; label: string }[];
export const initialsOf = (n: string) => n.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("") || "?";
export const firstName = (n: string) => n.split(" ")[0];

/** Enlace de WhatsApp a un número de Costa Rica (8 dígitos). */
export const waNumber = (phone: string, text?: string) => "https://wa.me/506" + phone.replace(/\D/g, "").slice(-8) + (text ? "?text=" + encodeURIComponent(text) : "");

/** Teléfono de Costa Rica: 8 dígitos que empiezan en 2, 4, 5, 6, 7 u 8 (acepta "+506 8888-8888"). */
export const normalizePhone = (s: string) => s.replace(/\D/g, "").replace(/^506(?=\d{8}$)/, "");
export const isValidPhone = (s: string) => /^[245678]\d{7}$/.test(normalizePhone(s));

export const budgetLabel = (f: ClientPreferences) =>
  f.budgetMin || f.budgetMax ? `${f.budgetMin ? shortCrc(f.budgetMin) : "₡0"} – ${f.budgetMax ? shortCrc(f.budgetMax) : "sin tope"}` : "Cualquier presupuesto";
export const prefShort = (f: ClientPreferences) =>
  [
    f.category ? CATEGORY_LABEL[f.category] : null,
    f.operation === "Todas" ? "Cualquier operación" : OP_LABEL[f.operation],
    f.propertyTypes.join(", ") || null,
    f.cantons.join(", ") || null,
    f.budgetMin || f.budgetMax ? budgetLabel(f) : null,
    f.minBedrooms ? f.minBedrooms + "+ hab." : null,
    f.minYear ? "desde " + f.minYear : null,
    f.maxMileageKm ? "hasta " + dots(f.maxMileageKm) + " km" : null,
  ]
    .filter(Boolean)
    .join(" · ");
export const prefChips = (f: ClientPreferences) =>
  (f.category ? [CATEGORY_LABEL[f.category]] : []).concat(
    [f.operation === "Todas" ? "Cualquier operación" : OP_LABEL[f.operation]],
    f.propertyTypes.length ? f.propertyTypes : ["Cualquier tipo"],
    f.cantons.length ? f.cantons : ["Cualquier ubicación"],
    [budgetLabel(f)],
    f.minBedrooms ? [f.minBedrooms + "+ habitaciones"] : [],
    f.minBathrooms ? [f.minBathrooms + "+ baños"] : [],
    f.minYear ? ["Año " + f.minYear + " o más nuevo"] : [],
    f.maxMileageKm ? ["Hasta " + dots(f.maxMileageKm) + " km"] : [],
    f.requiredAmenities,
  );

/** Explicación corta: qué coincide y qué falta. */
export const matchWhy = (p: Property, f: ClientPreferences) => {
  const ok: string[] = [], miss: string[] = [];
  if (f.cantons.length) (f.cantons.includes(p.canton) ? ok : miss).push(p.canton);
  const mn = f.budgetMin || 0, mx = f.budgetMax || 0;
  if (mn || mx) (p.price >= mn * 0.9 && (!mx || p.price <= mx * 1.1) ? ok : miss).push("presupuesto");
  if (isVehicle(p)) {
    if (f.minYear) ((p.yearBuilt ?? 0) >= f.minYear ? ok : miss).push("año " + f.minYear + "+");
    if (f.maxMileageKm) (p.mileageKm != null && p.mileageKm <= f.maxMileageKm ? ok : miss).push("≤ " + dots(f.maxMileageKm) + " km");
  } else {
    if (f.minBedrooms) (p.bedrooms >= f.minBedrooms ? ok : miss).push(f.minBedrooms + "+ hab.");
    if (f.minBathrooms) (p.bathrooms >= f.minBathrooms ? ok : miss).push(f.minBathrooms + "+ baños");
  }
  f.requiredAmenities.forEach((a) => (p.amenities.includes(a) ? ok : miss).push(a));
  return (ok.length ? "Coincide: " + ok.join(", ") : "Coincide en operación y tipo") + (miss.length ? " · Falta: " + miss.join(", ") : "");
};
