// Server Actions del panel: sesión obligatoria, permisos por rol, validación antes de tocar la base
// y errores que no filtran detalles internos. La RLS es la última barrera; esto es la primera.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, AGENT, fakeSupabase, OTHER_AGENT_ID, type Call } from "./helpers";
import type { TeamUser } from "@/lib/types";

const state = vi.hoisted(() => ({ session: { supabase: null as unknown, userId: null as string | null, me: null as unknown } }));
const after = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after }));

const { runAction, revalidateSite, UserError } = await import("@/lib/action");
const { saveProperty, deleteProperty, duplicateProperty } = await import("@/app/actions/properties");
const { inviteMember, updateMember, setMemberActive, setOwner, updateMyProfile, changeMyPassword } = await import("@/app/actions/team");
const { saveVisit, deleteVisit } = await import("@/app/actions/visits");
const { saveZone, reorderZones, deleteZone, setZoneVisible } = await import("@/app/actions/zones");
const { saveClient, setClientStatus } = await import("@/app/actions/clients");

let db = fakeSupabase();
const as = (me: TeamUser | null, respond?: (c: Call) => { data: unknown; error: { code?: string; message: string } | null }) => {
  db = fakeSupabase(respond);
  state.session = { supabase: db.client, userId: me ? "b0000000-0000-4000-8000-000000000001" : null, me };
};

beforeEach(() => {
  as(AGENT);
  after.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------ runAction */

describe("runAction", () => {
  it("sin sesión de asesor activo no ejecuta nada", async () => {
    as(null);
    const fn = vi.fn();
    expect(await runAction(fn)).toEqual({ ok: false, error: "Tu sesión venció. Vuelve a iniciar sesión." });
    expect(fn).not.toHaveBeenCalled();
  });

  it("adminOnly bloquea a un asesor", async () => {
    const fn = vi.fn();
    expect(await runAction(fn, { adminOnly: true })).toEqual({ ok: false, error: "Solo un administrador puede hacer esto." });
    expect(fn).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "No tienes permiso para hacer esto."],
    ["23505", "Ya existe un registro con ese dato (por ejemplo, el mismo correo)."],
    ["23503", "No se puede: hay otros registros que dependen de este."],
    ["23514", "Algún dato no tiene un formato válido."],
    ["22P02", "Algún dato no tiene un formato válido."],
  ])("traduce el código %s", async (code, msg) => {
    expect(await runAction(async () => { throw { code, message: "detalle interno" }; })).toEqual({ ok: false, error: msg });
  });

  it("22023/P0002 muestran el mensaje en español de nuestras funciones", async () => {
    expect(await runAction(async () => { throw { code: "P0002", message: "La propiedad no existe" }; })).toEqual({ ok: false, error: "La propiedad no existe" });
  });

  it("un error desconocido no filtra el detalle al navegador", async () => {
    const res = await runAction(async () => { throw new Error("connection string postgres://user:pass@db"); });
    expect(res).toEqual({ ok: false, error: "No se pudo guardar. Intenta de nuevo." });
  });

  it("UserError se muestra tal cual", async () => {
    expect(await runAction(async () => { throw new UserError("Mensaje claro"); })).toEqual({ ok: false, error: "Mensaje claro" });
  });
});

/* ------------------------------------------------------------------ propiedades */

const property = {
  title: "Casa de prueba", description: "", operation: "Venta", type: "Casa", status: "Borrador", featured: false, canton: "Paraíso",
  zone: "Orosi", address: "", lat: 9.79, lng: -83.85, price: 1000, bedrooms: 2, bathrooms: 1, areaM2: 100, parkingSpaces: 1,
  agentId: OTHER_AGENT_ID, amenityIds: [] as string[],
};
const IMG = "https://images.unsplash.com/photo-1.jpg";

describe("saveProperty", () => {
  it("un asesor siempre guarda a su nombre (no puede asignar a otro)", async () => {
    expect((await saveProperty(null, property, [IMG])).ok).toBe(true);
    expect(db.rpcCall("save_property")?.payload).toMatchObject({ p_id: null, p_data: { agent_id: AGENT.id } });
  });

  it("un admin puede asignar a otro asesor", async () => {
    as(ADMIN);
    await saveProperty(null, property, [IMG]);
    expect(db.rpcCall("save_property")?.payload).toMatchObject({ p_data: { agent_id: OTHER_AGENT_ID } });
  });

  it.each([
    ["http (no https)", ["http://x.com/a.jpg"]],
    ["javascript:", ["javascript:alert(1)"]],
    ["data:", ["data:image/png;base64,AAAA"]],
    ["más de 40 fotos", Array.from({ length: 41 }, (_, i) => `https://x.com/${i}.jpg`)],
  ])("rechaza imágenes: %s", async (_, images) => {
    expect((await saveProperty(null, property, images)).ok).toBe(false);
    expect(db.rpcCall("save_property")).toBeUndefined();
  });

  it("no publica sin fotos", async () => {
    const res = await saveProperty(null, { ...property, status: "Publicada" }, []);
    expect(res).toEqual({ ok: false, error: "Para publicar, agrega al menos una foto." });
  });

  it.each<[string, Partial<typeof property>]>([
    ["operación inválida", { operation: "Permuta" }],
    ["tipo inválido", { type: "Castillo" }],
    ["estado inválido", { status: "Eliminada" }],
    ["cantón inválido", { canton: "San José" }],
    ["título vacío", { title: "  " }],
    ["título > 140", { title: "x".repeat(141) }],
    ["precio 0", { price: 0 }],
    ["precio negativo", { price: -5 }],
    ["latitud fuera de rango", { lat: 120 }],
    ["asesor no uuid", { agentId: "otro" }],
    ["amenidad no uuid", { amenityIds: ["piscina"] }],
  ])("rechaza %s sin llamar a la base", async (_, patch) => {
    expect((await saveProperty(null, { ...property, ...patch } as typeof property, [IMG])).ok).toBe(false);
    expect(db.rpcCall("save_property")).toBeUndefined();
  });

  it("id de propiedad inválido", async () => {
    expect((await saveProperty("1 or 1=1", property, null)).ok).toBe(false);
  });

  it("avisa al sitio público tras guardar (revalidate)", async () => {
    await saveProperty(null, property, [IMG]);
    // Sin secreto configurado en la prueba no se programa el aviso; con secreto, sí:
    vi.stubEnv("REVALIDATE_SECRET", "x".repeat(40));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://sitio.test");
    await saveProperty(null, property, [IMG]);
    expect(after).toHaveBeenCalledTimes(1);
  });
});

describe("deleteProperty / duplicateProperty", () => {
  it("si la RLS no deja borrar (0 filas), informa el error en vez de 'eliminada'", async () => {
    as(AGENT, () => ({ data: [], error: null }));
    expect(await deleteProperty("d0000000-0000-4000-8000-000000000006")).toEqual({ ok: false, error: "El registro ya no existe o no tienes permiso para cambiarlo." });
  });

  it("valida el id", async () => {
    expect((await deleteProperty("../x")).ok).toBe(false);
    expect((await duplicateProperty("x")).ok).toBe(false);
  });

  it("duplicar una ajena: la base responde 42501", async () => {
    as(AGENT, (c) => (c.kind === "rpc" ? { data: null, error: { code: "42501", message: "no" } } : { data: [], error: null }));
    expect(await duplicateProperty("d0000000-0000-4000-8000-000000000006")).toEqual({ ok: false, error: "No tienes permiso para hacer esto." });
  });
});

/* ------------------------------------------------------------------ equipo */

const member = { name: "Laura Pérez", email: "Laura@ISF.test", role: "Asesor", phone: "8877-0011", specialty: "", zones: "", bio: "" };

describe("equipo (solo admin)", () => {
  it("un asesor no puede invitar", async () => {
    expect((await inviteMember(member)).ok).toBe(false);
    expect(db.client.functions.invoke).not.toHaveBeenCalled();
  });

  it("un asesor no puede editar a otros ni activar/desactivar", async () => {
    expect((await updateMember(OTHER_AGENT_ID, member)).ok).toBe(false);
    expect((await setMemberActive(OTHER_AGENT_ID, false)).ok).toBe(false);
    expect(db.calls).toHaveLength(0);
  });

  it("el admin invita con datos normalizados", async () => {
    as(ADMIN);
    vi.stubEnv("NEXT_PUBLIC_PANEL_URL", "https://panel.test");
    expect((await inviteMember(member)).ok).toBe(true);
    expect(db.client.functions.invoke).toHaveBeenCalledWith("invite-team-member", {
      body: { name: "Laura Pérez", first_name: "Laura", email: "laura@isf.test", phone: "88770011", role: "Asesor", redirect_to: "https://panel.test/auth/nueva-contrasena" },
    });
  });

  it.each<[string, Partial<typeof member>]>([
    ["correo inválido", { email: "laura" }],
    ["teléfono inválido", { phone: "123" }],
    ["rol inventado", { role: "SuperAdmin" }],
    ["nombre vacío", { name: "" }],
  ])("el admin no invita con %s", async (_, patch) => {
    as(ADMIN);
    expect((await inviteMember({ ...member, ...patch })).ok).toBe(false);
    expect(db.client.functions.invoke).not.toHaveBeenCalled();
  });

  it("muestra el error que devuelve la Edge Function", async () => {
    as(ADMIN);
    db.client.functions.invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: "Ese email ya pertenece a un miembro del equipo" })) } });
    expect(await inviteMember(member)).toEqual({ ok: false, error: "Ese email ya pertenece a un miembro del equipo" });
  });

  it("el admin no puede quitarse el rol ni desactivarse a sí mismo", async () => {
    as(ADMIN);
    expect(await updateMember(ADMIN.id, { ...member, role: "Asesor" })).toEqual({ ok: false, error: "No puedes quitarte el rol de administrador." });
    expect(await setMemberActive(ADMIN.id, false)).toEqual({ ok: false, error: "No puedes desactivar tu propia cuenta." });
  });

  it("updateMyProfile solo toca la fila propia y no cambia rol ni correo", async () => {
    await updateMyProfile({ name: "Carlos M", phone: "87002200", specialty: "", zones: "", bio: "" });
    const call = db.calls.find((c) => c.name === "agents");
    expect(call?.filters).toEqual([["id", AGENT.id]]);
    expect(call?.payload).not.toHaveProperty("role");
    expect(call?.payload).not.toHaveProperty("email");
    expect(call?.payload).not.toHaveProperty("active");
  });
});

describe("dueño del negocio", () => {
  const ownerRow = (c: Call) => (c.name === "agents" && c.op === "select" ? { data: { is_owner: true }, error: null } : { data: [{ id: "x" }], error: null });

  it("solo un admin elige al dueño (rpc set_owner)", async () => {
    expect((await setOwner(OTHER_AGENT_ID)).ok).toBe(false);
    expect(db.rpcCall("set_owner")).toBeUndefined();
    as(ADMIN);
    expect((await setOwner(OTHER_AGENT_ID)).ok).toBe(true);
    expect(db.rpcCall("set_owner")?.payload).toEqual({ p_agent_id: OTHER_AGENT_ID });
    expect((await setOwner("no-uuid")).ok).toBe(false);
  });

  it("no se le quita el rol de admin al dueño ni se le desactiva", async () => {
    as(ADMIN, ownerRow);
    expect(await updateMember(OTHER_AGENT_ID, { ...member, role: "Asesor" })).toEqual({ ok: false, error: "Es el dueño del negocio: primero marca a otro administrador como dueño." });
    expect((await setMemberActive(OTHER_AGENT_ID, false)).ok).toBe(false);
    expect(db.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("el dueño guarda horario y ubicación del sitio en su perfil", async () => {
    as({ ...ADMIN, isOwner: true });
    await updateMyProfile({ name: "Mariana Solano", phone: "88001100", specialty: "", zones: "", bio: "", contactHours: " Lunes a viernes ", contactLocation: "Cartago" });
    expect(db.calls.find((c) => c.name === "agents")?.payload).toMatchObject({ contact_hours: "Lunes a viernes", contact_location: "Cartago" });
  });

  it("un asesor que no es dueño no puede cambiar el contacto del sitio", async () => {
    await updateMyProfile({ name: "Carlos M", phone: "87002200", specialty: "", zones: "", bio: "", contactHours: "Hackeado", contactLocation: "Hackeado" });
    const payload = db.calls.find((c) => c.name === "agents")?.payload;
    expect(payload).not.toHaveProperty("contact_hours");
    expect(payload).not.toHaveProperty("contact_location");
  });
});

describe("changeMyPassword", () => {
  it("exige la contraseña actual correcta antes de cambiarla", async () => {
    db.client.auth.signInWithPassword.mockResolvedValueOnce({ error: { status: 400, message: "Invalid login credentials" } });
    expect(await changeMyPassword("mala", "NuevaClave123")).toEqual({ ok: false, error: "La contraseña actual no es correcta." });
    expect(db.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("valida el largo de la nueva (8 a 72)", async () => {
    expect((await changeMyPassword("actual", "corta")).ok).toBe(false);
    expect((await changeMyPassword("actual", "x".repeat(73))).ok).toBe(false);
    expect(db.client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("verifica con el correo de la sesión (no uno enviado por el cliente)", async () => {
    await changeMyPassword("actual", "NuevaClave123");
    expect(db.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: AGENT.email, password: "actual" });
  });

  it("manda el token de Turnstile y traduce el rechazo del captcha", async () => {
    db.client.auth.signInWithPassword.mockResolvedValueOnce({ error: { status: 400, message: "captcha protection: request disallowed" } });
    const res = await changeMyPassword("actual", "NuevaClave123", "tok-1");
    expect(db.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: AGENT.email, password: "actual", options: { captchaToken: "tok-1" } });
    expect(res).toEqual({ ok: false, error: expect.stringContaining("robot") });
    expect(db.client.auth.updateUser).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ visitas */

const visit = { clientId: null, clientName: "Cliente Prueba", clientPhone: "8888 7777", propertyId: null, date: "2099-01-10", time: "10:00", mode: "Presencial", status: "Pendiente", agentId: OTHER_AGENT_ID, notes: "" };

describe("visitas", () => {
  it("un asesor agenda siempre a su nombre", async () => {
    await saveVisit(null, visit);
    const call = db.calls.find((c) => c.name === "visits");
    expect(call).toMatchObject({ op: "insert", payload: { agent_id: AGENT.id, source: "panel", client_phone: "88887777" } });
  });

  it("al editar, un asesor no reasigna la visita", async () => {
    await saveVisit("f0000000-0000-4000-8000-000000000001", visit);
    const call = db.calls.find((c) => c.name === "visits");
    expect(call?.op).toBe("update");
    expect((call?.payload as Record<string, unknown>).agent_id).toBeUndefined();
  });

  it("el admin elige el asesor", async () => {
    as(ADMIN);
    await saveVisit(null, visit);
    expect(db.calls.find((c) => c.name === "visits")?.payload).toMatchObject({ agent_id: OTHER_AGENT_ID });
  });

  it.each<[string, Partial<typeof visit>]>([
    ["fecha inválida", { date: "2099-02-31x" }],
    ["hora inválida", { time: "25:00" }],
    ["modalidad inválida", { mode: "Fax" }],
    ["estado inválido", { status: "Borrada" }],
    ["sin teléfono", { clientPhone: "" }],
    ["sin nombre", { clientName: "" }],
    ["notas > 1000", { notes: "x".repeat(1001) }],
    ["cliente no uuid", { clientId: "1" as unknown as null }],
  ])("rechaza %s", async (_, patch) => {
    expect((await saveVisit(null, { ...visit, ...patch })).ok).toBe(false);
    expect(db.calls).toHaveLength(0);
  });

  it("borrar una visita ajena (0 filas) informa el error", async () => {
    as(AGENT, () => ({ data: [], error: null }));
    expect((await deleteVisit("f0000000-0000-4000-8000-000000000005")).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ zonas */

describe("zonas (solo admin)", () => {
  const zone = { label: "Orosi", name: "Paraíso", imageUrl: IMG };
  it("un asesor no gestiona zonas", async () => {
    for (const res of [await saveZone(null, zone), await deleteZone("e0000000-0000-4000-8000-000000000001"), await setZoneVisible("e0000000-0000-4000-8000-000000000001", true), await reorderZones([])]) {
      expect(res).toEqual({ ok: false, error: "Solo un administrador puede hacer esto." });
    }
    expect(db.calls).toHaveLength(0);
  });

  it("el admin no guarda una imagen que no sea https ni un cantón inventado", async () => {
    as(ADMIN);
    expect((await saveZone(null, { ...zone, imageUrl: "javascript:alert(1)" })).ok).toBe(false);
    expect((await saveZone(null, { ...zone, name: "Narnia" })).ok).toBe(false);
  });

  it("reorderZones valida cada id", async () => {
    as(ADMIN);
    expect((await reorderZones(["e0000000-0000-4000-8000-000000000001", "x"])).ok).toBe(false);
    expect(db.rpcCall("reorder_featured_zones")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ clientes */

const client = { name: "Cliente Prueba", email: "", phone: "", status: "Nuevo", assignedAgentId: null, operation: "Venta", propertyTypes: [] as string[], cantons: [] as string[], budgetMin: null as number | null, budgetMax: null as number | null, minBedrooms: 0, minBathrooms: 0, amenityIds: [] as string[], notes: "" };

describe("clientes", () => {
  it("guarda con save_client y valores normalizados", async () => {
    as(AGENT, () => ({ data: "c0000000-0000-4000-8000-0000000000aa", error: null }));
    expect(await saveClient(null, { ...client, email: "X@Y.COM", phone: "8888-7777" })).toEqual({ ok: true, data: { id: "c0000000-0000-4000-8000-0000000000aa" } });
    expect(db.rpcCall("save_client")?.payload).toMatchObject({ p_email: "x@y.com", p_phone: "88887777", p_id: null });
  });

  it.each<[string, Partial<typeof client>]>([
    ["presupuesto mínimo > máximo", { budgetMin: 10, budgetMax: 5 }],
    ["estado inválido", { status: "VIP" }],
    ["operación inválida", { operation: "Trueque" }],
    ["demasiados tipos", { propertyTypes: Array(11).fill("Casa") }],
    ["tipo inventado", { propertyTypes: ["Castillo"] }],
    ["correo inválido", { email: "no-es-correo" }],
    ["comentarios > 2000", { notes: "x".repeat(2001) }],
  ])("rechaza %s", async (_, patch) => {
    expect((await saveClient(null, { ...client, ...patch })).ok).toBe(false);
    expect(db.rpcCall("save_client")).toBeUndefined();
  });

  it("setClientStatus solo acepta estados válidos", async () => {
    expect((await setClientStatus("c0000000-0000-4000-8000-000000000001", "Hackeado")).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ aviso al sitio */

describe("revalidateSite", () => {
  it("llama al sitio con el secreto y las etiquetas, después de responder", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "s".repeat(40));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://sitio.test");
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    revalidateSite(["properties"]);
    await after.mock.calls[0][0]();
    expect(fetchMock).toHaveBeenCalledWith(new URL("http://sitio.test/api/revalidate"), expect.objectContaining({ method: "POST", body: JSON.stringify({ tags: ["properties"] }), headers: expect.objectContaining({ Authorization: "Bearer " + "s".repeat(40) }) }));
  });

  it("prefiere SITE_INTERNAL_URL si existe", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "s".repeat(40));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sitio.test");
    vi.stubEnv("SITE_INTERNAL_URL", "http://web:3000");
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    revalidateSite(["agents"]);
    await after.mock.calls[0][0]();
    expect(fetchMock.mock.calls[0]).toEqual([new URL("http://web:3000/api/revalidate"), expect.anything()]);
  });

  it("si el sitio no responde, no rompe el guardado", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "s".repeat(40));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://sitio.test");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    revalidateSite(["zones"]);
    await expect(after.mock.calls[0][0]()).resolves.toBeUndefined();
  });

  it("sin secreto no envía nada", () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    revalidateSite(["properties"]);
    expect(after).not.toHaveBeenCalled();
  });
});
