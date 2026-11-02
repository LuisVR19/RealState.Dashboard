// Sección Actividad: helpers de lib/activity.ts y acceso solo para administradores.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, AGENT, fakeSupabase } from "./helpers";

const state = vi.hoisted(() => ({ session: { supabase: null as unknown, userId: null as string | null, me: null as unknown } }));
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

const { conversion, delta, normalizeActivity, parsePeriod, rangeFor } = await import("@/lib/activity");
const { default: ActivityPage } = await import("@/app/(app)/actividad/page");

const sp = (x: Record<string, string> = {}) => ({ searchParams: Promise.resolve(x) });

describe("período", () => {
  it.each([["7", 7], ["30", 30], ["90", 90], [undefined, 30], ["365", 30], ["abc", 30], [["7", "90"], 7]])("?dias=%s → %i", (raw, expected) => {
    expect(parsePeriod(raw)).toBe(expected);
  });

  it("el rango incluye hoy y dura exactamente N días", () => {
    const { from, to } = rangeFor(7);
    expect((Date.parse(to) - Date.parse(from)) / 864e5).toBe(6);
  });
});

describe("normalizeActivity", () => {
  it("rellena con 0 lo que falta y convierte números", () => {
    const a = normalizeActivity({ from: "2026-11-01", to: "2026-11-07", current: { page_view: "12", whatsapp_click: 3 }, series: [{ day: "2026-11-01", property_view: 4 }], top_properties: [{ id: "x", code: "ISF-0001", title: "Casa", views: "9" }] });
    expect(a.current.page_view).toBe(12);
    expect(a.current.signup).toBe(0);
    expect(a.previous.page_view).toBe(0);
    expect(a.series[0]).toEqual({ day: "2026-11-01", page_view: 0, property_view: 4, whatsapp_click: 0, visit_request: 0 });
    expect(a.topProperties[0]).toMatchObject({ code: "ISF-0001", views: 9, whatsapp: 0 });
    expect(a.recent).toEqual([]);
    expect(a.trackingSince).toBeNull();
  });

  it("aguanta una respuesta vacía", () => {
    expect(normalizeActivity(null).series).toEqual([]);
  });
});

describe("delta y conversión", () => {
  it.each([
    [10, 10, "flat", "Igual"],
    [5, 0, "up", "+5"],
    [15, 10, "up", "+50 %"],
    [5, 10, "down", "-50 %"],
  ])("%i vs %i → %s", (cur, prev, trend, text) => {
    const d = delta(cur, prev);
    expect(d.trend).toBe(trend);
    expect(d.text).toContain(text);
  });

  it("conversión = (WhatsApp + solicitudes) / vistas", () => {
    expect(conversion({ views: 20, whatsapp: 3, visit_requests: 1 })).toBe("20 %");
    expect(conversion({ views: 0, whatsapp: 2, visit_requests: 0 })).toBe("—");
  });
});

describe("acceso", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sin sesión → /login", async () => {
    state.session = { supabase: fakeSupabase().client, userId: null, me: null };
    await expect(ActivityPage(sp())).rejects.toThrow("REDIRECT:/login");
  });

  it("un asesor no ve la sección (404) y no se consulta la base", async () => {
    const db = fakeSupabase();
    state.session = { supabase: db.client, userId: "u", me: AGENT };
    await expect(ActivityPage(sp())).rejects.toThrow("NOT_FOUND");
    expect(db.client.rpc).not.toHaveBeenCalled();
  });

  it("el admin consulta get_site_activity con el período pedido", async () => {
    const db = fakeSupabase(() => ({ data: { current: {}, previous: {}, series: [], top_properties: [], recent: [] }, error: null }));
    state.session = { supabase: db.client, userId: "u", me: ADMIN };
    await ActivityPage(sp({ dias: "7" }));
    const call = db.rpcCall("get_site_activity");
    expect(call).toBeTruthy();
    const { p_from, p_to } = call!.payload as { p_from: string; p_to: string };
    expect((Date.parse(p_to) - Date.parse(p_from)) / 864e5).toBe(6);
  });

  it("si la base falla muestra un aviso, no un error interno", async () => {
    const db = fakeSupabase(() => ({ data: null, error: { code: "XX000", message: "detalle interno" } }));
    state.session = { supabase: db.client, userId: "u", me: ADMIN };
    const el = await ActivityPage(sp());
    expect(JSON.stringify(el)).toContain("No pudimos cargar la actividad");
    expect(JSON.stringify(el)).not.toContain("detalle interno");
  });
});
