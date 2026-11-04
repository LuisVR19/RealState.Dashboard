"use server";

// Publicidad (solo admin): marcas anunciantes y anuncios. La RLS también exige admin; la base valida
// formatos y largos con CHECK. Cada cambio invalida la caché del sitio (etiqueta "ads"); el trigger
// revalidate_site de la base hace lo mismo por si el cambio llega por otra vía.
import { changed, check, revalidateSite, runAction, UserError, v } from "@/lib/action";
import { AD_ICONS, AD_PLACEMENTS, AD_STATUSES, type AdPlacement, type AdStatus } from "@/lib/ads";
import { CANTONS } from "@/lib/format";
import type { Canton } from "@/lib/types";

const admin = { adminOnly: true };
const ICONS = AD_ICONS.map(([icon]) => icon) as readonly string[];

export interface AdvertiserInput {
  name: string;
  contactName: string;
  email: string;
  whatsapp: string;
  website: string;
  logoUrl: string;
  color: string;
  notes: string;
  active: boolean;
}

export interface AdInput {
  advertiserId: string;
  placement: AdPlacement;
  status: AdStatus;
  headline: string;
  body: string;
  cta: string;
  href: string;
  imageUrl: string;
  icon: string;
  startsOn: string;
  endsOn: string;
  weight: number;
  cantons: Canton[];
}

/* ---------- validación ---------- */

const optHttps = (x: unknown, label: string) => (typeof x === "string" && x.trim() ? v.httpsUrl(x.trim(), label) : null);

/** WhatsApp de la marca: 8 dígitos de Costa Rica (se antepone 506) o un número internacional completo. */
function brandWhatsapp(x: unknown): string {
  const d = (typeof x === "string" ? x : "").replace(/\D/g, "");
  if (!d) return "";
  if (/^[245678]\d{7}$/.test(d)) return "506" + d;
  if (/^\d{10,15}$/.test(d)) return d;
  throw new UserError("El WhatsApp debe tener 8 dígitos de Costa Rica o el número internacional completo.");
}

function color(x: unknown): string {
  if (typeof x !== "string" || !/^#[0-9a-fA-F]{6}$/.test(x)) throw new UserError("El color debe tener el formato #RRGGBB.");
  return x.toLowerCase();
}

/** Destino del anuncio: https:// externo o una ruta del sitio ("/propiedades?op=Venta"). */
function adHref(x: unknown): string {
  const s = v.text(x, "El enlace", 500, true);
  if (s.startsWith("/")) {
    if (s.startsWith("//") || /\s/.test(s)) throw new UserError("El enlace interno no es válido.");
    return s;
  }
  return v.httpsUrl(s, "El enlace");
}

function optDate(x: unknown): string | null {
  return typeof x === "string" && x ? v.date(x) : null;
}

function advertiserRow(i: AdvertiserInput) {
  return {
    name: v.text(i.name, "El nombre de la marca", 80, true),
    contact_name: v.text(i.contactName, "El contacto", 80),
    email: v.email(i.email),
    whatsapp: brandWhatsapp(i.whatsapp),
    website: optHttps(i.website, "El sitio web") ?? "",
    logo_url: optHttps(i.logoUrl, "El logo"),
    color: color(i.color),
    notes: v.text(i.notes, "Las notas", 2000),
    active: v.bool(i.active),
  };
}

function adRow(i: AdInput) {
  const startsOn = optDate(i.startsOn);
  const endsOn = optDate(i.endsOn);
  if (startsOn && endsOn && endsOn < startsOn) throw new UserError("La fecha de fin no puede ser anterior a la de inicio.");
  const icon = typeof i.icon === "string" && ICONS.includes(i.icon) ? i.icon : "ph-megaphone";
  return {
    advertiser_id: v.uuid(i.advertiserId, "La marca"),
    placement: v.oneOf(i.placement, AD_PLACEMENTS, "Espacio"),
    status: v.oneOf(i.status, AD_STATUSES, "Estado"),
    headline: v.text(i.headline, "El titular", 60, true),
    body: v.text(i.body, "El texto", 120),
    cta: v.text(i.cta, "El botón", 24, true),
    href: adHref(i.href),
    image_url: optHttps(i.imageUrl, "La imagen"),
    icon,
    starts_on: startsOn,
    ends_on: endsOn,
    weight: v.num(i.weight, "La prioridad", 0, 100) ?? 50,
    cantons: v.list(i.cantons, CANTONS.length, (c) => v.oneOf(c, CANTONS, "Cantón")),
  };
}

/* ---------- marcas ---------- */

export async function saveAdvertiser(id: string | null, i: AdvertiserInput) {
  return runAction(async ({ supabase }) => {
    const row = advertiserRow(i);
    if (id) changed(await supabase.from("advertisers").update(row).eq("id", v.uuid(id)).select("id"));
    else check(await supabase.from("advertisers").insert(row));
    revalidateSite(["ads"]);
    return null;
  }, admin);
}

export async function setAdvertiserActive(id: string, active: boolean) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("advertisers").update({ active: v.bool(active) }).eq("id", v.uuid(id)).select("id"));
    revalidateSite(["ads"]);
    return null;
  }, admin);
}

/** Borra la marca con todos sus anuncios y métricas (cascada en la base). */
export async function deleteAdvertiser(id: string) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("advertisers").delete().eq("id", v.uuid(id)).select("id"));
    revalidateSite(["ads"]);
    return null;
  }, admin);
}

/* ---------- anuncios ---------- */

export async function saveAd(id: string | null, i: AdInput) {
  return runAction(async ({ supabase }) => {
    const row = adRow(i);
    if (id) changed(await supabase.from("ads").update(row).eq("id", v.uuid(id)).select("id"));
    else check(await supabase.from("ads").insert(row));
    revalidateSite(["ads"]);
    return null;
  }, admin);
}

export async function setAdStatus(id: string, status: AdStatus) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("ads").update({ status: v.oneOf(status, AD_STATUSES, "Estado") }).eq("id", v.uuid(id)).select("id"));
    revalidateSite(["ads"]);
    return null;
  }, admin);
}

export async function deleteAd(id: string) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("ads").delete().eq("id", v.uuid(id)).select("id"));
    revalidateSite(["ads"]);
    return null;
  }, admin);
}
