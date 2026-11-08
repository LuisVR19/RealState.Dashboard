// Lecturas del panel. Todas van con la sesión del usuario: la RLS decide qué ve un asesor
// (sus clientes y los sin asignar, las visitas de sus propiedades o clientes) y qué ve el admin (todo).
// Nada se cachea entre usuarios: son datos privados que cambian a cada rato.
import "server-only";
import { AGENT_COLUMNS, toTeamUser } from "./auth";
import { isoDaysFromToday } from "./dates";
import type { ServerClient } from "./supabase/server";
import type { AmenityOption, Client, FeaturedZone, Match, Property, TeamUser, Visit } from "./types";

/** Historial de visitas que se carga (las futuras siempre). */
const VISIT_HISTORY_DAYS = 180;
/** Tope de seguridad por tabla; con más volumen habría que paginar en el servidor. */
const MAX_ROWS = 2000;

const PROPERTY_COLUMNS =
  "id, code, title, description, operation, type, status, featured, tag, country, province, canton, zone, address, lat, lng, price, maintenance_fee, " +
  "bedrooms, bathrooms, area_m2, parking_spaces, guests, floor, year_built, delivery, agent_id, updated_at, " +
  "category, brand, model, mileage_km, transmission, fuel, drivetrain, engine_cc, color, doors, " +
  "property_images(url, position), property_amenities(amenities(name))";

const CLIENT_COLUMNS =
  "id, name, email, phone, assigned_agent_id, status, source, auth_user_id, created_at, " +
  "client_preferences(category, operation, property_types, cantons, budget_min, budget_max, min_bedrooms, min_bathrooms, min_year, max_mileage_km, notes), " +
  "client_required_amenities(amenities(name)), client_internal_notes(id, agent_id, body, created_at)";

const opt = <T,>(v: T | null | undefined) => (v == null ? undefined : v);
const names = (rows: { amenities: { name: string } | null }[] | null) => (rows ?? []).map((r) => r.amenities?.name).filter((n): n is string => !!n);

/** Falla con un error claro (lo muestra app/(app)/error.tsx) en lugar de pintar datos a medias. */
function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`No se pudo cargar ${what}: ${res.error.message}`);
  return res.data as T;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- filas con relaciones embebidas */
const toProperty = (p: any): Property => ({
  id: p.id,
  code: p.code,
  title: p.title,
  description: p.description,
  operation: p.operation,
  type: p.type,
  category: p.category ?? "Inmueble",
  status: p.status,
  featured: p.featured,
  tag: opt(p.tag),
  country: p.country ?? "Costa Rica",
  province: p.province ?? "",
  canton: p.canton,
  zone: p.zone,
  address: p.address,
  lat: Number(p.lat),
  lng: Number(p.lng),
  price: Number(p.price),
  maintenanceFee: p.maintenance_fee == null ? undefined : Number(p.maintenance_fee),
  bedrooms: p.bedrooms ?? 0,
  bathrooms: Number(p.bathrooms ?? 0),
  areaM2: Number(p.area_m2 ?? 0),
  parkingSpaces: p.parking_spaces,
  guests: opt(p.guests),
  floor: opt(p.floor),
  yearBuilt: opt(p.year_built),
  delivery: opt(p.delivery),
  brand: opt(p.brand),
  model: opt(p.model),
  mileageKm: opt(p.mileage_km),
  transmission: opt(p.transmission),
  fuel: opt(p.fuel),
  drivetrain: opt(p.drivetrain),
  engineCc: opt(p.engine_cc),
  color: opt(p.color),
  doors: opt(p.doors),
  agentId: p.agent_id,
  amenities: names(p.property_amenities),
  images: [...(p.property_images ?? [])].sort((a: any, b: any) => a.position - b.position).map((i: any) => i.url),
  updatedAt: p.updated_at,
});

const toClient = (c: any): Client => {
  const f = c.client_preferences;
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    assignedAgentId: c.assigned_agent_id,
    status: c.status,
    source: c.source,
    hasAccount: !!c.auth_user_id,
    createdAt: c.created_at,
    preferences: {
      category: f?.category ?? null,
      operation: f?.operation ?? "Todas",
      propertyTypes: f?.property_types ?? [],
      cantons: f?.cantons ?? [],
      budgetMin: opt(f?.budget_min),
      budgetMax: opt(f?.budget_max),
      minBedrooms: f?.min_bedrooms ?? 0,
      minBathrooms: Number(f?.min_bathrooms ?? 0),
      minYear: opt(f?.min_year),
      maxMileageKm: opt(f?.max_mileage_km),
      requiredAmenities: names(c.client_required_amenities),
      notes: opt(f?.notes),
    },
    notes: (c.client_internal_notes ?? [])
      .map((n: any) => ({ id: n.id, agentId: n.agent_id, body: n.body, createdAt: n.created_at }))
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)),
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Todo lo que necesitan las pantallas del panel, en consultas paralelas. */
export async function getPanelData(supabase: ServerClient, me: TeamUser) {
  const isAdmin = me.role === "Admin";
  const [teamRes, propsRes, amenRes, visitsRes, clientsRes, matchesRes, zonesRes] = await Promise.all([
    supabase.from("agents").select(AGENT_COLUMNS).order("name"),
    supabase.from("properties").select(PROPERTY_COLUMNS).order("updated_at", { ascending: false }).limit(MAX_ROWS),
    supabase.from("amenities").select("id, name, category").order("name"),
    supabase.from("visits").select("id, property_id, client_id, client_name, client_phone, agent_id, date, time, mode, status, source, notes")
      .gte("date", isoDaysFromToday(-VISIT_HISTORY_DAYS)).order("date").order("time").limit(MAX_ROWS),
    supabase.from("clients").select(CLIENT_COLUMNS).order("created_at", { ascending: false }).limit(MAX_ROWS),
    supabase.from("client_property_matches").select("client_id, property_id, score").limit(MAX_ROWS * 5),
    isAdmin ? supabase.from("featured_zones").select("id, name, label, image_url, visible, position").order("position") : null,
  ]);

  const team = must(teamRes, "el equipo").map(toTeamUser);
  // El equipo puede leer todo el inventario (RLS); el asesor trabaja sobre el suyo.
  const catalog = must(propsRes, "las propiedades").map(toProperty);
  const properties = isAdmin ? catalog : catalog.filter((p) => p.agentId === me.id);
  const amenities: AmenityOption[] = must(amenRes, "las amenidades");
  const visits: Visit[] = must(visitsRes, "las visitas").map((v) => ({
    id: v.id,
    propertyId: v.property_id,
    clientId: v.client_id,
    clientName: v.client_name ?? "Sin nombre",
    clientPhone: v.client_phone ?? "",
    agentId: v.agent_id,
    date: v.date,
    time: v.time.slice(0, 5),
    mode: v.mode,
    status: v.status,
    source: v.source,
    notes: v.notes ?? "",
  }));
  const clients = must(clientsRes, "los clientes").map(toClient);
  const zones: FeaturedZone[] = zonesRes
    ? must(zonesRes, "las zonas").map((z) => ({ id: z.id, name: z.name, label: z.label, imageUrl: z.image_url, visible: z.visible, position: z.position }))
    : [];

  // El puntaje lo calcula la base (get_client_matches): mismas reglas que ve el cliente en "Para ti".
  const byClient = new Map(clients.map((c) => [c.id, c]));
  const byProperty = new Map(catalog.map((p) => [p.id, p]));
  const matches: Match[] = must(matchesRes, "los matches")
    .flatMap((m) => {
      const client = m.client_id ? byClient.get(m.client_id) : undefined;
      const property = m.property_id ? byProperty.get(m.property_id) : undefined;
      return client && property && client.status !== "Cerrado" && client.status !== "Inactivo" ? [{ client, property, score: m.score ?? 0 }] : [];
    })
    .sort((a, b) => b.score - a.score);

  return { me, team, properties, catalog, amenities, visits, clients, matches, zones };
}
export type PanelData = Awaited<ReturnType<typeof getPanelData>>;

/** Propiedad para el editor. El asesor solo abre las suyas (la RLS además impide guardar las ajenas). */
export async function getProperty(supabase: ServerClient, me: TeamUser, code: string): Promise<Property | null> {
  if (!/^ISF-\d{4,8}$/i.test(code)) return null;
  const { data } = await supabase.from("properties").select(PROPERTY_COLUMNS).eq("code", code.toUpperCase()).maybeSingle();
  if (!data) return null;
  const p = toProperty(data);
  return me.role === "Admin" || p.agentId === me.id ? p : null;
}
