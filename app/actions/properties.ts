"use server";

import { check, changed, revalidateSite, runAction, UserError, v } from "@/lib/action";
import { CANTONS, OPERATIONS, PROPERTY_STATUSES, TYPES } from "@/lib/format";
import type { Json } from "@/lib/supabase/database.types";

export interface PropertyInput {
  title: string;
  description: string;
  operation: string;
  type: string;
  status: string;
  featured: boolean;
  tag?: string;
  canton: string;
  zone: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  maintenanceFee?: number;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  parkingSpaces: number;
  guests?: number;
  floor?: string;
  yearBuilt?: number;
  delivery?: string;
  agentId: string;
  amenityIds: string[];
}

const zeroToNull = (n: number | null) => (n ? n : null);

/** Valida y convierte al formato de save_property (snake_case, null = sin dato). */
function toRow(i: PropertyInput) {
  const title = v.text(i.title, "El título", 140, true);
  const zone = v.text(i.zone, "El distrito o barrio", 80, true);
  const price = v.num(i.price, "El precio", 0, 1e13);
  if (!price) throw new UserError("El precio es obligatorio.");
  return {
    title,
    description: v.text(i.description, "La descripción", 5000),
    operation: v.oneOf(i.operation, OPERATIONS, "Operación"),
    type: v.oneOf(i.type, TYPES, "Tipo"),
    status: v.oneOf(i.status, PROPERTY_STATUSES, "Estado"),
    featured: v.bool(i.featured),
    tag: v.text(i.tag, "La etiqueta", 30),
    canton: v.oneOf(i.canton, CANTONS, "Cantón"),
    zone,
    address: v.text(i.address, "La dirección", 200),
    lat: v.num(i.lat, "Latitud", -90, 90, false),
    lng: v.num(i.lng, "Longitud", -180, 180, false),
    price,
    maintenance_fee: zeroToNull(v.num(i.maintenanceFee, "El mantenimiento", 0, 1e11)),
    bedrooms: v.num(i.bedrooms, "Habitaciones", 0, 100),
    bathrooms: v.num(i.bathrooms, "Baños", 0, 99, false),
    area_m2: zeroToNull(v.num(i.areaM2, "El área", 0, 1e8, false)),
    parking_spaces: v.num(i.parkingSpaces, "Parqueos", 0, 1000) ?? 0,
    guests: zeroToNull(v.num(i.guests, "Huéspedes", 0, 1000)),
    floor: v.text(i.floor, "El piso", 20),
    year_built: zeroToNull(v.num(i.yearBuilt, "El año", 0, 2100)),
    delivery: v.text(i.delivery, "La entrega", 40),
    agent_id: v.uuid(i.agentId, "Asesor"),
  };
}

/**
 * Crea o actualiza una propiedad con sus amenidades y, si `images` no es null, su galería
 * (URLs ya subidas a Storage o externas https). Todo en una transacción (rpc save_property).
 */
export async function saveProperty(id: string | null, input: PropertyInput, images: string[] | null) {
  return runAction(async ({ supabase, me, isAdmin }) => {
    const row = toRow(input);
    if (row.year_built && row.year_built < 1800) throw new UserError("El año debe ser 1800 o posterior.");
    // Un asesor no reasigna propiedades (la RLS también lo impide).
    if (!isAdmin) row.agent_id = me.id;
    const imageUrls = images === null ? null : v.list(images, 40, (u) => v.httpsUrl(u, "Una imagen"));
    if (row.status === "Publicada" && imageUrls?.length === 0) throw new UserError("Para publicar, agrega al menos una foto.");

    const saved = check(
      await supabase.rpc("save_property", {
        p_id: id ? v.uuid(id) : null,
        p_data: row as unknown as Json,
        p_amenity_ids: v.list(input.amenityIds, 50, (a) => v.uuid(a, "Amenidad")),
        p_image_urls: imageUrls,
      }),
    ) as { id: string; code: string };
    revalidateSite(["properties", `property:${saved.code}`]);
    return saved;
  });
}

export async function duplicateProperty(id: string) {
  return runAction(async ({ supabase }) => {
    const newId = check(await supabase.rpc("duplicate_property", { p_property_id: v.uuid(id) })) as string;
    const { data } = await supabase.from("properties").select("code").eq("id", newId).single();
    return { id: newId, code: data?.code ?? "" };
  });
}

/** Borra la propiedad; sus visitas se conservan sin propiedad (FK on delete set null). */
export async function deleteProperty(id: string) {
  return runAction(async ({ supabase }) => {
    const [row] = changed(await supabase.from("properties").delete().eq("id", v.uuid(id)).select("code"));
    revalidateSite(["properties", `property:${row.code}`]);
    return null;
  });
}
