// Content-Security-Policy del panel (auditoría H-04, plan Fase 2).
//
// Nonce por petición (lo genera proxy.ts): Next lo toma del encabezado CSP de la petición y lo pone
// en sus propios <script>. Con 'strict-dynamic', solo corren esos scripts y los que ellos carguen
// (p. ej. Turnstile); un <script> inyectado por un XSS no tiene el nonce y el navegador lo bloquea.
// Por eso todas las páginas del panel se renderizan por petición (connection() en app/layout.tsx).
//
// style-src sin nonce: el código usa style={{…}} y Leaflet estilos inline; con un nonce en style-src
// el navegador ignora 'unsafe-inline' y esos estilos se romperían. El riesgo real está en los scripts.
//
// img-src admite cualquier https: los admins pueden pegar URLs externas de imágenes (zonas y propiedades).
//
// Nota: el beacon de Cloudflare Web Analytics (static.cloudflareinsights.com) lo inyecta Cloudflare sin
// nonce, así que con 'strict-dynamic' queda bloqueado. Para el panel interno no hace falta analítica:
// si aparece en los reportes, desactivar Web Analytics para panel.thomasmatasa.com.

/** Paso 2.6 del plan: poner en true cuando los reportes estén limpios (pasa de solo reportar a bloquear). */
export const CSP_ENFORCE: boolean = false;
export const CSP_HEADER = CSP_ENFORCE ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
export const CSP_REPORT_PATH = "/api/csp-report";

const TURNSTILE = "https://challenges.cloudflare.com";

/** Origen del proyecto de Supabase (https://<ref>.supabase.co) o el comodín si falta la variable. */
export function supabaseOrigin(url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  try {
    return new URL(url ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
}

/** Nonce aleatorio de 128 bits en base64 (Web Crypto: funciona en Workers y en Node). */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildCsp({ nonce, dev = process.env.NODE_ENV === "development", supabase = supabaseOrigin() }: { nonce: string; dev?: boolean; supabase?: string }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir errores del servidor.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", TURNSTILE, ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    // supabase-js en el navegador (subida de imágenes, sesión de invitación) y Turnstile.
    "connect-src": ["'self'", supabase, supabase.replace(/^https:/, "wss:"), TURNSTILE],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "report-uri": [CSP_REPORT_PATH],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // El navegador la ignora (con un aviso en consola) en Report-Only: solo va al aplicar la política.
  if (!dev && CSP_ENFORCE) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
