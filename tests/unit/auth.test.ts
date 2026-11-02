// Login, recuperación de contraseña, callback de Auth y proxy del panel.
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT, fakeSupabase } from "./helpers";

const state = vi.hoisted(() => ({ db: null as unknown, session: { supabase: null as unknown, userId: null as string | null, me: null as unknown }, claims: null as { sub: string } | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.db }));
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
const abuse = vi.hoisted(() => ({ rateLimit: vi.fn(async (..._args: unknown[]) => true), clientIp: vi.fn(async () => "203.0.113.7") }));
vi.mock("@/lib/abuse", async (orig) => ({ ...(await orig<typeof import("@/lib/abuse")>()), ...abuse }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
// redirect() de Next lanza para cortar la acción; aquí lo convertimos en un error inspeccionable.
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getClaims: async () => ({ data: state.claims ? { claims: state.claims } : null }) } }) }));

const { login, requestPasswordReset, setNewPassword } = await import("@/app/actions/auth");
const { GET: callback } = await import("@/app/auth/callback/route");
const { proxy } = await import("@/proxy");

let db = fakeSupabase();
const form = (x: Record<string, string>) => {
  const f = new FormData();
  Object.entries(x).forEach(([k, v]) => f.set(k, v));
  return f;
};
const redirectOf = async (p: Promise<unknown>) => {
  try {
    return { result: await p, redirect: null };
  } catch (e) {
    const m = /^REDIRECT:(.*)$/.exec((e as Error).message);
    if (!m) throw e;
    return { result: null, redirect: m[1] };
  }
};

beforeEach(() => {
  db = fakeSupabase((c) => (c.name === "is_agent" ? { data: true, error: null } : { data: null, error: null }));
  state.db = db.client;
  state.session = { supabase: db.client, userId: null, me: null };
  state.claims = null;
  abuse.rateLimit.mockReset().mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------ abuso (H-02) */
describe("rate limit y captcha", () => {
  const ok = { email: "carlos@isf.test", password: "Asesor123!" };

  it("el login limita por IP y manda el token de Turnstile a Supabase", async () => {
    await redirectOf(login(null, form({ ...ok, "cf-turnstile-response": "tok-123" })));
    expect(abuse.rateLimit).toHaveBeenCalledWith("AUTH_LIMITER", "login:203.0.113.7");
    expect(db.client.auth.signInWithPassword).toHaveBeenCalledWith({ ...ok, options: { captchaToken: "tok-123" } });
  });

  it("superado el límite no llega a Supabase", async () => {
    abuse.rateLimit.mockResolvedValue(false);
    expect((await login(null, form(ok)))?.error).toContain("Espera un minuto");
    expect(db.client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("captcha rechazado por Supabase: mensaje claro", async () => {
    db.client.auth.signInWithPassword.mockResolvedValueOnce({ error: { status: 400, code: "captcha_failed", message: "captcha protection: request disallowed" } });
    expect((await login(null, form(ok)))?.error).toContain("robot");
  });

  it("la recuperación limita por IP y manda el token", async () => {
    await requestPasswordReset("carlos@isf.test", "tok-9");
    expect(abuse.rateLimit).toHaveBeenCalledWith("AUTH_LIMITER", "reset:203.0.113.7");
    expect(db.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("carlos@isf.test", expect.objectContaining({ captchaToken: "tok-9" }));
  });

  it("recuperación sobre el límite no envía correos", async () => {
    abuse.rateLimit.mockResolvedValue(false);
    expect((await requestPasswordReset("carlos@isf.test"))?.error).toContain("Espera un minuto");
    expect(db.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
afterEach(() => vi.unstubAllEnvs());

/* ------------------------------------------------------------------ login */

describe("login", () => {
  const ok = { email: "Carlos@ISF.test ", password: "Asesor123!" };

  it("normaliza el correo y entra al panel", async () => {
    const { redirect } = await redirectOf(login(null, form(ok)));
    expect(db.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: "carlos@isf.test", password: "Asesor123!" });
    expect(redirect).toBe("/");
  });

  it.each([
    ["/clientes?estado=Nuevo", "/clientes?estado=Nuevo"],
    ["//evil.com", "/"],
    ["///evil.com", "/"],
    ["https://evil.com", "/"],
    ["/\\evil.com", "/"],
    ["\\\\evil.com", "/"],
    ["/\t/evil.com", "/"],
    ["javascript:alert(1)", "/"],
    ["evil.com", "/"],
  ])("next=%s → %s (sin redirección abierta)", async (next, to) => {
    const { redirect } = await redirectOf(login(null, form({ ...ok, next })));
    expect(redirect).toBe(to);
  });

  it("una cuenta de cliente del sitio no entra y su sesión se cierra", async () => {
    db = fakeSupabase((c) => (c.name === "is_agent" ? { data: false, error: null } : { data: null, error: null }));
    state.db = db.client;
    const { result, redirect } = await redirectOf(login(null, form(ok)));
    expect(redirect).toBeNull();
    expect(result).toEqual({ error: "Esta cuenta no tiene acceso al panel." });
    expect(db.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("credenciales inválidas: mensaje genérico (no revela si el correo existe)", async () => {
    db.client.auth.signInWithPassword.mockResolvedValueOnce({ error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" } });
    expect(await login(null, form(ok))).toEqual({ error: "Correo o contraseña incorrectos." });
  });

  it("límite de intentos (429)", async () => {
    db.client.auth.signInWithPassword.mockResolvedValueOnce({ error: { status: 429, message: "rate limit" } });
    expect(await login(null, form(ok))).toEqual({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." });
  });

  it("rechaza entradas vacías o enormes sin llamar a Auth", async () => {
    expect(await login(null, form({ email: "", password: "" }))).toEqual({ error: "Escribe tu correo y contraseña." });
    expect((await login(null, form({ email: "a@b.co", password: "x".repeat(201) })))?.error).toBeTruthy();
    expect((await login(null, form({ email: "a".repeat(250) + "@b.co", password: "x" })))?.error).toBeTruthy();
    expect(db.client.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("recuperar contraseña", () => {
  it("responde lo mismo exista o no la cuenta (sin enumeración)", async () => {
    const a = await requestPasswordReset("carlos@isf.test");
    db.client.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { status: 400, message: "User not found" } });
    const b = await requestPasswordReset("nadie@isf.test");
    expect(a).toEqual(b);
    expect(a?.notice).toBeTruthy();
  });

  it("el enlace vuelve al panel por /auth/callback", async () => {
    vi.stubEnv("NEXT_PUBLIC_PANEL_URL", "https://panel.test");
    await requestPasswordReset("carlos@isf.test");
    expect(db.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("carlos@isf.test", { redirectTo: "https://panel.test/auth/callback?next=/auth/nueva-contrasena" });
  });

  it("valida el correo", async () => {
    expect((await requestPasswordReset("no-es-correo"))?.error).toBeTruthy();
    expect(db.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("nueva contraseña", () => {
  it("valida largo y confirmación", async () => {
    expect((await setNewPassword(null, form({ password: "corta", confirm: "corta" })))?.error).toBeTruthy();
    expect((await setNewPassword(null, form({ password: "LargaSegura1", confirm: "Otra" })))?.error).toBe("Las contraseñas no coinciden.");
  });

  it("solo una sesión del equipo puede fijarla (no un cliente del sitio)", async () => {
    expect((await setNewPassword(null, form({ password: "LargaSegura1", confirm: "LargaSegura1" })))?.error).toMatch(/no es de una cuenta del equipo/);
    expect(db.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("con sesión del equipo guarda y entra", async () => {
    state.session = { supabase: db.client, userId: "u", me: AGENT };
    const { redirect } = await redirectOf(setNewPassword(null, form({ password: "LargaSegura1", confirm: "LargaSegura1" })));
    expect(db.client.auth.updateUser).toHaveBeenCalledWith({ password: "LargaSegura1" });
    expect(redirect).toBe("/");
  });
});

/* ------------------------------------------------------------------ /auth/callback */

describe("/auth/callback", () => {
  const PANEL = "https://panel.test";
  const call = async (qs: string) => (await callback(new NextRequest(`http://interno:3001/auth/callback?${qs}`))).headers.get("location") ?? "";
  const authMock = () => (db.client.auth as unknown as Record<string, unknown>);

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PANEL_URL", PANEL);
    authMock().exchangeCodeForSession = vi.fn(async () => ({ error: null }));
    authMock().verifyOtp = vi.fn(async () => ({ error: null }));
  });

  it("redirige a la ruta interna pedida", async () => {
    expect(await call("token_hash=x&type=recovery&next=/auth/nueva-contrasena")).toBe(`${PANEL}/auth/nueva-contrasena`);
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "\t//evil.com", "https://panel.test@evil.com"])("next=%s se queda en el panel", async (next) => {
    expect(new URL(await call(`code=x&next=${encodeURIComponent(next)}`)).origin).toBe(PANEL);
  });

  it("enlace inválido → /login?error=enlace", async () => {
    authMock().exchangeCodeForSession = vi.fn(async () => ({ error: { message: "expired" } }));
    expect(await call("code=x")).toBe(`${PANEL}/login?error=enlace`);
  });

  it("type=signup no se acepta en el panel (no hay registro público)", async () => {
    expect(await call("token_hash=x&type=signup")).toBe(`${PANEL}/login?error=enlace`);
  });
});

/* ------------------------------------------------------------------ proxy */

describe("proxy (primera barrera)", () => {
  const run = async (path: string) => {
    const res = await proxy(new NextRequest(`http://localhost:3001${path}`));
    return { status: res.status, location: res.headers.get("location") };
  };

  it.each(["/clientes", "/asesores", "/propiedades/ISF-0001", "/api/cualquier"])("sin sesión %s redirige a /login con next", async (path) => {
    const { status, location } = await run(path + "?x=1");
    expect(status).toBe(307);
    expect(location).toBe(`http://localhost:3001/login?next=${encodeURIComponent(path + "?x=1")}`);
  });

  it("sin sesión / redirige a /login sin next", async () => {
    expect((await run("/")).location).toBe("http://localhost:3001/login");
  });

  it.each(["/login", "/auth/callback", "/auth/nueva-contrasena"])("%s es público", async (path) => {
    expect((await run(path)).location).toBeNull();
  });

  it("con sesión deja pasar (el layout y la RLS deciden lo demás)", async () => {
    state.claims = { sub: "b0000000-0000-4000-8000-000000000002" };
    expect((await run("/clientes")).location).toBeNull();
  });
});
