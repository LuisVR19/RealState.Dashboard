// Recibe los reportes de violaciones de la Content-Security-Policy (report-uri en lib/csp.ts) y los
// deja en el log del Worker (Cloudflare → Observability, buscar "[csp]"). Sirve para ajustar la lista
// de orígenes mientras la CSP está en Report-Only y, ya aplicada, para detectar intentos de XSS.
//
// Formatos: el clásico `application/csp-report` ({"csp-report": {...}}) y la Reporting API
// (`application/reports+json`, [{type, body}]). Las URLs se loguean SIN query string: los enlaces de
// Auth llevan ?code= / ?token_hash= y no deben quedar en los logs.
import { NextResponse, type NextRequest } from "next/server";

const MAX_BYTES = 8 * 1024;
const MAX_REPORTS = 10;

type Report = Record<string, unknown>;

/** Origen + ruta, sin query ni fragmento. Valores no URL ("inline", "eval") quedan tal cual. */
function clean(v: unknown): string | undefined {
  if (typeof v !== "string" || !v) return undefined;
  try {
    const u = new URL(v);
    return (u.origin + u.pathname).slice(0, 300);
  } catch {
    return v.slice(0, 100);
  }
}

function summarize(r: Report) {
  return {
    directive: r["effective-directive"] ?? r["violated-directive"] ?? r.effectiveDirective,
    blocked: clean(r["blocked-uri"] ?? r.blockedURL),
    page: clean(r["document-uri"] ?? r.documentURL),
    source: clean(r["source-file"] ?? r.sourceFile),
    line: r["line-number"] ?? r.lineNumber,
    sample: typeof (r["script-sample"] ?? r.sample) === "string" ? String(r["script-sample"] ?? r.sample).slice(0, 80) : undefined,
    disposition: r.disposition,
  };
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return new NextResponse(null, { status: 413 });
  const text = (await request.text()).slice(0, MAX_BYTES);
  try {
    const body: unknown = JSON.parse(text);
    const reports: Report[] = Array.isArray(body)
      ? body.map((x) => ((x as { body?: Report })?.body ?? {}))
      : [((body as { "csp-report"?: Report })?.["csp-report"] ?? {})];
    for (const r of reports.slice(0, MAX_REPORTS)) console.warn("[csp]", JSON.stringify(summarize(r)));
  } catch {
    // Cuerpo inválido: se ignora (no hay nada que hacer con él).
  }
  return new NextResponse(null, { status: 204 });
}
