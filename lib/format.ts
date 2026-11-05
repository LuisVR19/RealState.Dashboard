import { Constants } from "./supabase/database.types";
import type { Amenity, Canton, ClientPreferences, ClientStatus, Operation, Property, PropertyStatus, PropertyType, VisitStatus } from "./types";

export const OP_LABEL: Record<Operation, string> = { Venta: "Venta", Alquiler: "Alquiler", Vacacional: "Alquiler vacacional", Preventa: "Preventa" };
export const OPERATIONS = Constants.public.Enums.property_operation as readonly Operation[];
export const TYPES = Constants.public.Enums.property_type as readonly PropertyType[];
export const PROPERTY_STATUSES = Constants.public.Enums.property_status as readonly PropertyStatus[];
const AMENITY_ICON: Record<string, string> = { Piscina: "ph-swimming-pool", Gimnasio: "ph-barbell", "Seguridad 24h": "ph-shield-check", Jardín: "ph-plant", Terraza: "ph-sun-horizon", Amueblado: "ph-armchair", "Pet friendly": "ph-paw-print", "Área social": "ph-users-three", "Parqueo visitas": "ph-car", "Planta eléctrica": "ph-lightning" };
/** Ícono de una amenidad del catálogo (las nuevas usan uno genérico). */
export const amenityIcon = (a: Amenity) => AMENITY_ICON[a] ?? "ph-check-circle";
/** Sugerencias iniciales (cantones de Cartago). La ubicación es texto libre: se aceptan ciudades de cualquier país. */
export const CANTONS: readonly Canton[] = ["Paraíso", "Cartago", "Oreamuno", "La Unión", "El Guarco", "Alvarado", "Jiménez", "Turrialba"];
export const DEFAULT_COUNTRY = "Costa Rica";
export const COUNTRY_SUGGESTIONS: readonly string[] = ["Costa Rica", "Panamá", "Nicaragua", "México", "Estados Unidos", "Colombia", "España"];

/** Valores únicos, sin vacíos, en orden alfabético (es). */
export const uniqueSorted = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.map((x) => x?.trim()).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "es"));

/** Ubicaciones conocidas: las del inventario más las sugerencias base. */
export const knownPlaces = (props: Pick<Property, "canton" | "province" | "country">[]) => ({
  cantons: uniqueSorted([...props.map((p) => p.canton), ...CANTONS]),
  provinces: uniqueSorted([...props.map((p) => p.province), "Cartago"]),
  countries: uniqueSorted([...props.map((p) => p.country), ...COUNTRY_SUGGESTIONS]),
});

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
export const priceSuffix = (p: Property) => (p.operation === "Alquiler" ? "/mes" : p.operation === "Vacacional" ? "/noche" : p.areaM2 ? shortCrc(p.price / p.areaM2) + "/m²" : "");
export const specs = (p: Property) =>
  [
    p.bedrooms ? { icon: "ph-bed", label: `${p.bedrooms} hab.` } : null,
    p.bathrooms ? { icon: "ph-bathtub", label: decimal(p.bathrooms) + (p.bathrooms === 1 ? " baño" : " baños") } : null,
    p.areaM2 ? { icon: "ph-ruler", label: `${dots(p.areaM2)} m²` } : null,
    p.guests ? { icon: "ph-users", label: `${p.guests} huésp.` } : null,
  ].filter(Boolean) as { icon: string; label: string }[];
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
  [f.operation === "Todas" ? "Cualquier operación" : OP_LABEL[f.operation], f.propertyTypes.join(", ") || null, f.cantons.join(", ") || null, f.budgetMin || f.budgetMax ? budgetLabel(f) : null, f.minBedrooms ? f.minBedrooms + "+ hab." : null]
    .filter(Boolean)
    .join(" · ");
export const prefChips = (f: ClientPreferences) =>
  [f.operation === "Todas" ? "Cualquier operación" : OP_LABEL[f.operation]].concat(
    f.propertyTypes.length ? f.propertyTypes : ["Cualquier tipo"],
    f.cantons.length ? f.cantons : ["Cualquier ubicación"],
    [budgetLabel(f)],
    f.minBedrooms ? [f.minBedrooms + "+ habitaciones"] : [],
    f.minBathrooms ? [f.minBathrooms + "+ baños"] : [],
    f.requiredAmenities,
  );

/** Explicación corta: qué coincide y qué falta. */
export const matchWhy = (p: Property, f: ClientPreferences) => {
  const ok: string[] = [], miss: string[] = [];
  if (f.cantons.length) (f.cantons.includes(p.canton) ? ok : miss).push(p.canton);
  const mn = f.budgetMin || 0, mx = f.budgetMax || 0;
  if (mn || mx) (p.price >= mn * 0.9 && (!mx || p.price <= mx * 1.1) ? ok : miss).push("presupuesto");
  if (f.minBedrooms) (p.bedrooms >= f.minBedrooms ? ok : miss).push(f.minBedrooms + "+ hab.");
  if (f.minBathrooms) (p.bathrooms >= f.minBathrooms ? ok : miss).push(f.minBathrooms + "+ baños");
  f.requiredAmenities.forEach((a) => (p.amenities.includes(a) ? ok : miss).push(a));
  return (ok.length ? "Coincide: " + ok.join(", ") : "Coincide en operación y tipo") + (miss.length ? " · Falta: " + miss.join(", ") : "");
};
