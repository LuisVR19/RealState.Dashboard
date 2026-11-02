// Refresca la sesión de Supabase en cada petición del panel y manda a /login a quien no tiene sesión.
// Es solo la primera barrera: el layout verifica que el usuario sea un asesor activo y la RLS
// decide qué datos ve y cambia cada uno.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce, CSP_HEADER, CSP_REPORT_PATH } from "./lib/csp";
import { SESSION_COOKIE } from "./lib/supabase/env";

// Los reportes de CSP llegan también desde /login (sin sesión): no se redirigen.
const PUBLIC_PATHS = ["/login", "/auth/", CSP_REPORT_PATH];

export async function proxy(request: NextRequest) {
  // CSP con nonce nuevo por petición (lib/csp.ts). Next lo lee del encabezado de la PETICIÓN y lo
  // aplica a sus scripts; el de la RESPUESTA es el que hace cumplir el navegador.
  const nonce = createNonce();
  const csp = buildCsp({ nonce });
  const next = () => {
    const headers = new Headers(request.headers); // Incluye las cookies refrescadas por setAll.
    headers.set(CSP_HEADER, csp);
    headers.set("x-nonce", nonce);
    return NextResponse.next({ request: { headers } });
  };

  let response = next();

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: SESSION_COOKIE,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // No poner lógica entre createServerClient y getClaims: getClaims refresca el token si venció.
  const { data } = await supabase.auth.getClaims();

  const path = request.nextUrl.pathname;
  if (!data?.claims?.sub && !PUBLIC_PATHS.some((p) => path === p || path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path === "/" ? "" : "?next=" + encodeURIComponent(path + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  response.headers.set(CSP_HEADER, csp);
  return response;
}

export const config = {
  // Todo menos archivos estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
