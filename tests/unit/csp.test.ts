// CSP del panel: política estricta con nonce por petición (lib/csp.ts + proxy.ts).
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ claims: null as { sub: string } | null }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getClaims: async () => ({ data: state.claims ? { claims: state.claims } : null }) } }) }));

const { buildCsp, CSP_ENFORCE, CSP_HEADER } = await import("@/lib/csp");
const { proxy } = await import("@/proxy");

const dir = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(name + " ")) ?? "";
const run = (path: string) => proxy(new NextRequest(`http://localhost:3001${path}`));
const nonceOf = (csp: string | null) => /'nonce-([^']+)'/.exec(csp ?? "")?.[1];

beforeEach(() => {
  state.claims = { sub: "b0000000-0000-4000-8000-000000000001" };
});

describe("buildCsp", () => {
  const csp = buildCsp({ nonce: "abc123", dev: false, supabase: "https://ref.supabase.co" });

  it("solo ejecuta scripts con el nonce (strict-dynamic), sin comodines ni eval", () => {
    const s = dir(csp, "script-src").split(" ");
    expect(s).toContain("'nonce-abc123'");
    expect(s).toContain("'strict-dynamic'");
    for (const bad of ["*", "https:", "'unsafe-inline'", "'unsafe-eval'"]) expect(s).not.toContain(bad);
  });

  it("el navegador solo se conecta al propio panel, a Supabase y a Turnstile", () => {
    expect(dir(csp, "connect-src")).toBe("connect-src 'self' https://ref.supabase.co wss://ref.supabase.co https://challenges.cloudflare.com");
  });

  it("no se puede incrustar, ni cambiar la base, ni enviar formularios afuera", () => {
    expect(dir(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(dir(csp, "object-src")).toBe("object-src 'none'");
    expect(dir(csp, "base-uri")).toBe("base-uri 'self'");
    expect(dir(csp, "form-action")).toBe("form-action 'self'");
    // upgrade-insecure-requests solo al aplicar (en Report-Only el navegador la ignora).
    expect(csp.includes("upgrade-insecure-requests")).toBe(CSP_ENFORCE);
    expect(dir(csp, "report-uri")).toBe("report-uri /api/csp-report");
  });

  it("'unsafe-eval' solo en desarrollo", () => {
    expect(dir(buildCsp({ nonce: "x", dev: true, supabase: "https://ref.supabase.co" }), "script-src")).toContain("'unsafe-eval'");
  });
});

describe("proxy", () => {
  it("envía la CSP con un nonce distinto en cada petición", async () => {
    const [a, b] = await Promise.all([run("/clientes"), run("/clientes")]);
    const [na, nb] = [nonceOf(a.headers.get(CSP_HEADER)), nonceOf(b.headers.get(CSP_HEADER))];
    expect(na).toMatch(/^[A-Za-z0-9+/=]{24,}$/);
    expect(nb).toBeTruthy();
    expect(na).not.toBe(nb);
  });

  it("pasa el mismo nonce a Next en la petición (para que lo ponga en sus scripts)", async () => {
    const res = await run("/clientes");
    const nonce = nonceOf(res.headers.get(CSP_HEADER));
    // NextResponse.next({ request: { headers } }) deja los encabezados de la petición en x-middleware-request-*.
    expect(res.headers.get(`x-middleware-request-${CSP_HEADER.toLowerCase()}`)).toContain(`'nonce-${nonce}'`);
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });

  it("los reportes de CSP no se redirigen a /login aunque no haya sesión", async () => {
    state.claims = null;
    const res = await run("/api/csp-report");
    expect(res.headers.get("location")).toBeNull();
  });
});
