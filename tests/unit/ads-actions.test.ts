// Server Actions de Publicidad: solo admin, validación antes de tocar la base y normalización de datos.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, AGENT, fakeSupabase, type Call } from "./helpers";
import type { TeamUser } from "@/lib/types";

const state = vi.hoisted(() => ({ session: { supabase: null as unknown, userId: null as string | null, me: null as unknown } }));
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: vi.fn() }));

const { saveAdvertiser, setAdvertiserActive, deleteAdvertiser, saveAd, setAdStatus, deleteAd } = await import("@/app/actions/ads");
const { liveState, ctrText, brandInitials } = await import("@/lib/ads");

const BRAND_ID = "e1000000-0000-4000-8000-000000000001";
const AD_ID = "e2000000-0000-4000-8000-000000000001";

let db = fakeSupabase();
const as = (me: TeamUser | null, respond?: (c: Call) => { data: unknown; error: { code?: string; message: string } | null }) => {
  db = fakeSupabase(respond);
  state.session = { supabase: db.client, userId: me ? "b0000000-0000-4000-8000-000000000001" : null, me };
};
const lastWrite = () => db.calls.filter((c) => c.op === "insert" || c.op === "update").at(-1);

const brand = { name: "  Banco Horizonte ", contactName: "Ana", email: "Mercadeo@Banco.CR", whatsapp: "8888-7777", website: "https://banco.cr", logoUrl: "", color: "#1D3A5F", notes: "", active: true };
const ad = {
  advertiserId: BRAND_ID, placement: "home_banner" as const, status: "Activa" as const, headline: "Crédito en 72 horas", body: "Precalifica en línea.",
  cta: "Precalificar", href: "https://banco.cr/credito", imageUrl: "", icon: "ph-bank", startsOn: "", endsOn: "", weight: 50, cantons: [],
};

beforeEach(() => {
  as(AGENT);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("publicidad: permisos", () => {
  it("un asesor no gestiona marcas ni anuncios (y no se toca la base)", async () => {
    for (const res of [
      await saveAdvertiser(null, brand), await setAdvertiserActive(BRAND_ID, false), await deleteAdvertiser(BRAND_ID),
      await saveAd(null, ad), await setAdStatus(AD_ID, "Pausada"), await deleteAd(AD_ID),
    ]) expect(res).toEqual({ ok: false, error: "Solo un administrador puede hacer esto." });
    expect(db.calls).toHaveLength(0);
  });
});

describe("publicidad: marcas", () => {
  beforeEach(() => as(ADMIN));

  it("normaliza nombre, correo, color y WhatsApp de Costa Rica", async () => {
    expect((await saveAdvertiser(null, brand)).ok).toBe(true);
    expect(lastWrite()?.payload).toMatchObject({ name: "Banco Horizonte", email: "mercadeo@banco.cr", color: "#1d3a5f", whatsapp: "50688887777", logo_url: null, website: "https://banco.cr/" });
  });

  it("acepta un WhatsApp internacional completo", async () => {
    await saveAdvertiser(null, { ...brand, whatsapp: "+1 (305) 555-0100" });
    expect(lastWrite()?.payload).toMatchObject({ whatsapp: "13055550100" });
  });

  it.each([
    ["sin nombre", { name: "   " }],
    ["color inválido", { color: "rojo" }],
    ["logo que no es https", { logoUrl: "http://banco.cr/logo.png" }],
    ["sitio javascript:", { website: "javascript:alert(1)" }],
    ["WhatsApp corto", { whatsapp: "1234" }],
    ["correo inválido", { email: "no-es-correo" }],
  ])("rechaza %s sin tocar la base", async (_, patch) => {
    expect((await saveAdvertiser(null, { ...brand, ...patch })).ok).toBe(false);
    expect(lastWrite()).toBeUndefined();
  });

  it("editar exige un id válido y que la fila exista", async () => {
    expect((await saveAdvertiser("x", brand)).ok).toBe(false);
    as(ADMIN, () => ({ data: [], error: null }));
    expect(await saveAdvertiser(BRAND_ID, brand)).toEqual({ ok: false, error: "El registro ya no existe o no tienes permiso para cambiarlo." });
  });

  it("un nombre repetido se informa claro", async () => {
    as(ADMIN, () => ({ data: null, error: { code: "23505", message: "duplicate key" } }));
    expect(await saveAdvertiser(null, brand)).toEqual({ ok: false, error: "Ya existe un registro con ese dato (por ejemplo, el mismo correo)." });
  });
});

describe("publicidad: anuncios", () => {
  beforeEach(() => as(ADMIN));

  it("guarda un anuncio válido con fechas vacías como null y prioridad por defecto", async () => {
    expect((await saveAd(null, { ...ad, weight: Number.NaN as unknown as number })).ok).toBe(false);
    expect((await saveAd(null, ad)).ok).toBe(true);
    expect(lastWrite()?.payload).toMatchObject({ advertiser_id: BRAND_ID, placement: "home_banner", starts_on: null, ends_on: null, weight: 50, image_url: null, icon: "ph-bank" });
  });

  it("el banner de portada no se segmenta por ubicación (la portada no tiene cantón: nunca saldría)", async () => {
    await saveAd(null, { ...ad, cantons: ["Paraíso", "Cartago"] as never[] });
    expect(lastWrite()?.payload).toMatchObject({ placement: "home_banner", cantons: [] });
    await saveAd(null, { ...ad, placement: "detail_services", cantons: ["Paraíso", "Paraíso"] as never[] });
    expect(lastWrite()?.payload).toMatchObject({ placement: "detail_services", cantons: ["Paraíso"] });
  });

  it("acepta un enlace interno del sitio", async () => {
    expect((await saveAd(null, { ...ad, href: "/propiedades?op=Venta" })).ok).toBe(true);
  });

  it("un icono fuera de la lista vuelve al de por defecto", async () => {
    await saveAd(null, { ...ad, icon: "x\" onload=\"alert(1)" });
    expect(lastWrite()?.payload).toMatchObject({ icon: "ph-megaphone" });
  });

  it.each([
    ["enlace javascript:", { href: "javascript:alert(1)" }],
    ["enlace //otro-dominio", { href: "//evil.com" }],
    ["enlace http sin s", { href: "http://banco.cr" }],
    ["titular de más de 60", { headline: "x".repeat(61) }],
    ["texto de más de 120", { body: "x".repeat(121) }],
    ["botón vacío", { cta: " " }],
    ["espacio inventado", { placement: "popup" }],
    ["estado inventado", { status: "Publicada" }],
    // Las ubicaciones solo aplican a espacios segmentables (la portada las ignora).
    ["ubicación vacía", { placement: "detail_services", cantons: [" "] }],
    ["ubicación con HTML", { placement: "search_card", cantons: ["<img src=x>"] }],
    ["fin antes del inicio", { startsOn: "2026-12-10", endsOn: "2026-12-01" }],
    ["fecha inválida", { startsOn: "mañana" }],
    ["prioridad fuera de rango", { weight: 150 }],
    ["imagen que no es https", { imageUrl: "data:image/png;base64,xx" }],
    ["marca sin id válido", { advertiserId: "x" }],
  ])("rechaza %s sin tocar la base", async (_, patch) => {
    expect((await saveAd(null, { ...ad, ...patch } as typeof ad)).ok).toBe(false);
    expect(lastWrite()).toBeUndefined();
  });

  it("cambiar el estado valida el valor", async () => {
    expect((await setAdStatus(AD_ID, "Inventado" as "Activa")).ok).toBe(false);
    expect((await setAdStatus(AD_ID, "Pausada")).ok).toBe(true);
    expect(lastWrite()).toMatchObject({ name: "ads", op: "update", payload: { status: "Pausada" }, filters: [["id", AD_ID]] });
  });
});

describe("publicidad: estado efectivo y métricas", () => {
  const base = { status: "Activa" as const, startsOn: null, endsOn: null };
  const today = "2026-11-03";
  it.each([
    ["live", base, true],
    ["brand_off", base, false],
    ["scheduled", { ...base, startsOn: "2026-11-04" }, true],
    ["expired", { ...base, endsOn: "2026-11-02" }, true],
    ["live", { ...base, startsOn: today, endsOn: today }, true],
    ["paused", { ...base, status: "Pausada" as const }, true],
    ["draft", { ...base, status: "Borrador" as const }, true],
    ["ended", { ...base, status: "Finalizada" as const }, true],
  ])("%s", (expected, adState, brandActive) => {
    expect(liveState(adState, brandActive as boolean, today)).toBe(expected);
  });

  it("CTR y logo de respaldo", () => {
    expect(ctrText({ impressions: 0, clicks: 0, dismissals: 0 })).toBe("—");
    expect(ctrText({ impressions: 200, clicks: 5, dismissals: 0 })).toBe("2,5 %");
    expect(brandInitials("Muebles Cedro & Co.")).toBe("MC");
  });
});
