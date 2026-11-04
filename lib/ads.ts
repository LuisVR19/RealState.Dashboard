// Publicidad (sección /publicidad del panel, solo admin): marcas, anuncios y sus métricas.
// La base exige ser admin (RLS de advertisers, ads y ad_daily_stats); aquí solo se arma lo que se muestra.
import { Constants } from "./supabase/database.types";
import type { Database } from "./supabase/database.types";
import type { ServerClient } from "./supabase/server";
import { isoDaysFromToday, todayISO } from "./dates";
import type { Canton } from "./types";

export type AdPlacement = Database["public"]["Enums"]["ad_placement"];
export type AdStatus = Database["public"]["Enums"]["ad_status"];

export const AD_PLACEMENTS = Constants.public.Enums.ad_placement as readonly AdPlacement[];
export const AD_STATUSES = Constants.public.Enums.ad_status as readonly AdStatus[];

export const PLACEMENT_INFO: Record<AdPlacement, { label: string; where: string; icon: string }> = {
  home_banner: { label: "Banner de portada", where: "Página de inicio, antes de «Así te acompañamos». Se puede ocultar.", icon: "ph-rectangle" },
  search_card: { label: "Tarjeta en búsqueda", where: "Resultados de búsqueda, una por página.", icon: "ph-cards" },
  detail_services: { label: "Servicios en la ficha", where: "Ficha de cada propiedad, hasta 3 marcas.", icon: "ph-squares-four" },
};

/** Estado efectivo: lo que el visitante ve hoy (las fechas mandan sobre "Activa"). */
export type AdLiveState = "live" | "scheduled" | "expired" | "draft" | "paused" | "ended" | "brand_off";

export const LIVE_STATE_INFO: Record<AdLiveState, { label: string; style: [string, string] }> = {
  live: { label: "En el sitio", style: ["var(--color-accent-900)", "var(--color-accent-200)"] },
  scheduled: { label: "Programado", style: ["#e6edf6", "#1f4170"] },
  expired: { label: "Vencido", style: ["#f7e8e6", "#8a2f24"] },
  draft: { label: "Borrador", style: ["var(--color-neutral-800)", "var(--color-neutral-300)"] },
  paused: { label: "Pausado", style: ["#f6efe1", "#7a5a12"] },
  ended: { label: "Finalizado", style: ["var(--color-neutral-800)", "var(--color-neutral-400)"] },
  brand_off: { label: "Marca inactiva", style: ["#f6efe1", "#7a5a12"] },
};

/** Iconos sugeridos para el creativo sin imagen (Phosphor). */
export const AD_ICONS = [
  ["ph-megaphone", "Anuncio"], ["ph-bank", "Banco"], ["ph-house-line", "Hogar"], ["ph-truck", "Mudanza"],
  ["ph-shield-check", "Seguro"], ["ph-armchair", "Muebles"], ["ph-paint-roller", "Pintura"], ["ph-wrench", "Mantenimiento"],
  ["ph-lightning", "Electricidad"], ["ph-drop", "Fontanería"], ["ph-plant", "Jardín"], ["ph-key", "Cerrajería"],
  ["ph-scales", "Legal"], ["ph-calculator", "Contabilidad"], ["ph-wifi-high", "Internet"], ["ph-storefront", "Comercio"],
] as const;

export interface Advertiser {
  id: string;
  name: string;
  contactName: string;
  email: string;
  whatsapp: string;
  website: string;
  logoUrl: string | null;
  color: string;
  active: boolean;
  notes: string;
}

export interface AdStats {
  impressions: number;
  clicks: number;
  dismissals: number;
}

export interface AdItem {
  id: string;
  advertiserId: string;
  placement: AdPlacement;
  status: AdStatus;
  headline: string;
  body: string;
  cta: string;
  href: string;
  imageUrl: string | null;
  icon: string;
  startsOn: string | null;
  endsOn: string | null;
  weight: number;
  cantons: Canton[];
  createdAt: string;
  /** Últimos STATS_DAYS días. */
  stats: AdStats;
}

export interface AdsPanelData {
  advertisers: Advertiser[];
  ads: AdItem[];
  /** Totales de los últimos STATS_DAYS días. */
  totals: AdStats;
  statsFrom: string;
  today: string;
}

export const STATS_DAYS = 30;

export const ctr = (s: AdStats) => (s.impressions ? (s.clicks / s.impressions) * 100 : 0);
export const ctrText = (s: AdStats) => (s.impressions ? `${ctr(s).toLocaleString("es-CR", { maximumFractionDigits: 1 })} %` : "—");

/** Lo que el visitante ve hoy para un anuncio. */
export function liveState(ad: Pick<AdItem, "status" | "startsOn" | "endsOn">, brandActive: boolean, today: string): AdLiveState {
  if (ad.status === "Borrador") return "draft";
  if (ad.status === "Pausada") return "paused";
  if (ad.status === "Finalizada") return "ended";
  if (!brandActive) return "brand_off";
  if (ad.startsOn && ad.startsOn > today) return "scheduled";
  if (ad.endsOn && ad.endsOn < today) return "expired";
  return "live";
}

/** Carga marcas, anuncios y métricas del período (solo admin; la RLS devuelve vacío a los demás). */
export async function getAdsPanelData(supabase: ServerClient): Promise<AdsPanelData> {
  const today = todayISO();
  const statsFrom = isoDaysFromToday(-(STATS_DAYS - 1));
  const [advRes, adsRes, statsRes] = await Promise.all([
    supabase.from("advertisers").select("id, name, contact_name, email, whatsapp, website, logo_url, color, active, notes").order("name"),
    supabase.from("ads").select("id, advertiser_id, placement, status, headline, body, cta, href, image_url, icon, starts_on, ends_on, weight, cantons, created_at").order("created_at", { ascending: false }),
    supabase.from("ad_daily_stats").select("ad_id, impressions, clicks, dismissals").gte("day", statsFrom),
  ]);
  for (const r of [advRes, adsRes, statsRes]) if (r.error) throw new Error(`No se pudo cargar la publicidad: ${r.error.message}`);

  const byAd = new Map<string, AdStats>();
  const totals: AdStats = { impressions: 0, clicks: 0, dismissals: 0 };
  for (const s of statsRes.data ?? []) {
    const cur = byAd.get(s.ad_id) ?? { impressions: 0, clicks: 0, dismissals: 0 };
    cur.impressions += s.impressions;
    cur.clicks += s.clicks;
    cur.dismissals += s.dismissals;
    byAd.set(s.ad_id, cur);
    totals.impressions += s.impressions;
    totals.clicks += s.clicks;
    totals.dismissals += s.dismissals;
  }

  return {
    today,
    statsFrom,
    totals,
    advertisers: (advRes.data ?? []).map((a) => ({
      id: a.id, name: a.name, contactName: a.contact_name, email: a.email, whatsapp: a.whatsapp,
      website: a.website, logoUrl: a.logo_url, color: a.color, active: a.active, notes: a.notes,
    })),
    ads: (adsRes.data ?? []).map((a) => ({
      id: a.id, advertiserId: a.advertiser_id, placement: a.placement, status: a.status, headline: a.headline,
      body: a.body, cta: a.cta, href: a.href, imageUrl: a.image_url, icon: a.icon, startsOn: a.starts_on,
      endsOn: a.ends_on, weight: a.weight, cantons: a.cantons, createdAt: a.created_at,
      stats: byAd.get(a.id) ?? { impressions: 0, clicks: 0, dismissals: 0 },
    })),
  };
}

/** Iniciales para el logo de respaldo ("Banco Horizonte" → "BH"). */
export const brandInitials = (name: string) =>
  name.split(/\s+/).filter((w) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
