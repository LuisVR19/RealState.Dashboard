// POST /api/csp-report: registra las violaciones de CSP sin datos sensibles y nunca falla.
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/csp-report/route";

const warn = vi.fn();
beforeEach(() => {
  warn.mockReset();
  vi.spyOn(console, "warn").mockImplementation(warn);
});

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new NextRequest("https://sitio.test/api/csp-report", { method: "POST", body, headers: { "content-type": "application/csp-report", ...headers } }));
const logged = () => warn.mock.calls.map((c) => JSON.parse(c[1] as string));

describe("csp-report", () => {
  it("registra el formato clásico (csp-report) y responde 204", async () => {
    const res = await post(JSON.stringify({ "csp-report": { "effective-directive": "script-src-elem", "blocked-uri": "https://malo.example/x.js", "document-uri": "https://sitio.test/propiedades", disposition: "report" } }));
    expect(res.status).toBe(204);
    expect(logged()).toEqual([expect.objectContaining({ directive: "script-src-elem", blocked: "https://malo.example/x.js", page: "https://sitio.test/propiedades", disposition: "report" })]);
  });

  it("registra el formato de la Reporting API (lista)", async () => {
    await post(JSON.stringify([{ type: "csp-violation", body: { effectiveDirective: "connect-src", blockedURL: "https://espia.example/collect", documentURL: "https://sitio.test/" } }]), { "content-type": "application/reports+json" });
    expect(logged()).toEqual([expect.objectContaining({ directive: "connect-src", blocked: "https://espia.example/collect" })]);
  });

  it("no guarda query strings (tokens de los enlaces de Auth)", async () => {
    await post(JSON.stringify({ "csp-report": { "effective-directive": "img-src", "blocked-uri": "https://x.example/a.png?secret=1", "document-uri": "https://sitio.test/auth/callback?code=abc123&token_hash=zzz#frag" } }));
    const line = warn.mock.calls[0][1] as string;
    expect(line).not.toContain("abc123");
    expect(line).not.toContain("secret");
    expect(logged()[0].page).toBe("https://sitio.test/auth/callback");
  });

  it("ignora cuerpos inválidos sin fallar", async () => {
    expect((await post("esto no es json")).status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("rechaza cuerpos enormes (413) y limita la cantidad de reportes", async () => {
    expect((await post("x", { "content-length": String(64 * 1024) })).status).toBe(413);
    const many = Array.from({ length: 50 }, () => ({ body: { effectiveDirective: "img-src" } }));
    await post(JSON.stringify(many));
    expect(warn.mock.calls.length).toBeLessThanOrEqual(10);
  });
});
