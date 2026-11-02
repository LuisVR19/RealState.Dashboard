// Actividad del sitio público para la sección /actividad del panel (solo admin).
// Lee el resumen de la base (rpc get_site_activity, que exige ser admin) y lo deja listo para mostrar.
import type { ServerClient } from "./supabase/server";
import { isoDaysFromToday, todayISO } from "./dates";

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export type Metric = "page_view" | "property_view" | "whatsapp_click" | "share_click" | "search" | "visit_request" | "signup" | "favorite";
export type Totals = Record<Metric, number>;

export interface DayPoint {
  day: string;
  page_view: number;
  property_view: number;
  whatsapp_click: number;
  visit_request: number;
}

export interface TopProperty {
  id: string;
  code: string;
  title: string;
  views: number;
  whatsapp: number;
  shares: number;
  favorites: number;
  visit_requests: number;
}

export interface RecentItem {
  type: "visit_request" | "signup" | "favorite";
  at: string;
  who: string | null;
  code: string | null;
  title: string | null;
}

export interface SiteActivity {
  from: string;
  to: string;
  current: Totals;
  previous: Totals;
  series: DayPoint[];
  topProperties: TopProperty[];
  recent: RecentItem[];
  /** Primer día con datos de tráfico (null = la medición aún no registró nada). */
  trackingSince: string | null;
}

const METRICS: Metric[] = ["page_view", "property_view", "whatsapp_click", "share_click", "search", "visit_request", "signup", "favorite"];

/** Período de la URL (?dias=7|30|90); cualquier otro valor cae en 30. */
export function parsePeriod(raw: unknown): Period {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

/** Rango [desde, hasta] de los últimos `days` días, incluido hoy (fechas de Costa Rica). */
export function rangeFor(days: Period): { from: string; to: string } {
  return { from: isoDaysFromToday(-(days - 1)), to: todayISO() };
}

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : Number(x) || 0);
const totals = (x: unknown): Totals => Object.fromEntries(METRICS.map((m) => [m, num((x as Record<string, unknown> | null)?.[m])])) as Totals;
const list = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

/** Convierte la respuesta JSON de get_site_activity en tipos seguros (valores faltantes = 0). */
export function normalizeActivity(raw: unknown): SiteActivity {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    from: String(r.from ?? ""),
    to: String(r.to ?? ""),
    current: totals(r.current),
    previous: totals(r.previous),
    series: list<Record<string, unknown>>(r.series).map((d) => ({
      day: String(d.day),
      page_view: num(d.page_view),
      property_view: num(d.property_view),
      whatsapp_click: num(d.whatsapp_click),
      visit_request: num(d.visit_request),
    })),
    topProperties: list<Record<string, unknown>>(r.top_properties).map((p) => ({
      id: String(p.id),
      code: String(p.code),
      title: String(p.title),
      views: num(p.views),
      whatsapp: num(p.whatsapp),
      shares: num(p.shares),
      favorites: num(p.favorites),
      visit_requests: num(p.visit_requests),
    })),
    recent: list<RecentItem>(r.recent),
    trackingSince: typeof r.tracking_since === "string" ? r.tracking_since : null,
  };
}

export async function getSiteActivity(supabase: ServerClient, days: Period): Promise<SiteActivity> {
  const { from, to } = rangeFor(days);
  const { data, error } = await supabase.rpc("get_site_activity", { p_from: from, p_to: to });
  if (error) {
    console.error("[panel] get_site_activity:", error.code, error.message);
    throw new Error("No se pudo cargar la actividad del sitio");
  }
  return normalizeActivity(data);
}

/** Variación contra el período anterior, para mostrar junto a cada indicador. */
export function delta(current: number, previous: number): { text: string; trend: "up" | "down" | "flat" } {
  if (current === previous) return { text: "Igual que el período anterior", trend: "flat" };
  if (previous === 0) return { text: `+${current} vs. período anterior`, trend: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct} % vs. período anterior`, trend: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

/** % de vistas que terminan en un contacto (WhatsApp o solicitud de visita). */
export function conversion(p: Pick<TopProperty, "views" | "whatsapp" | "visit_requests">): string {
  if (!p.views) return "—";
  return `${Math.round(((p.whatsapp + p.visit_requests) / p.views) * 100)} %`;
}
