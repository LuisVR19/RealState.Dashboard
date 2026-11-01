// Cabeceras del panel: interno, sin iframes y sin indexar.
import { describe, expect, it } from "vitest";
import config from "@/next.config";
import { SESSION_COOKIE } from "@/lib/supabase/env";

describe("next.config del panel", () => {
  it("no anuncia el framework", () => {
    expect(config.poweredByHeader).toBe(false);
  });

  it("cabeceras de seguridad en todas las rutas", async () => {
    const rules = await config.headers!();
    const h = Object.fromEntries(rules.find((r) => r.source === "/:path*")!.headers.map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-robots-tag"]).toContain("noindex");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("same-origin");
    expect(h["strict-transport-security"]).toMatch(/max-age=\d{8,}/);
  });

  it("la cookie de sesión del panel no se mezcla con la del sitio", () => {
    expect(SESSION_COOKIE.name).toBe("sb-isf-panel-auth");
  });
});
