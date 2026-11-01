// Destino de los enlaces de los correos de Auth (recuperar contraseña, invitación con token_hash).
// Crea la sesión en cookies y redirige a `next` (solo rutas internas, para evitar redirecciones abiertas).
// Los enlaces de invitación por defecto traen la sesión en el fragmento (#access_token), que no llega
// al servidor: esos los recoge directamente /auth/nueva-contrasena en el navegador.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "magiclink", "email", "email_change"];

function panelOrigin(request: NextRequest) {
  try {
    return new URL(process.env.NEXT_PUBLIC_PANEL_URL ?? request.nextUrl.origin).origin;
  } catch {
    return request.nextUrl.origin;
  }
}

/** Ruta interna segura; se decide sobre la URL ya parseada (tabs, "\" y "//" incluidos). */
function safeTarget(next: string | null, origin: string) {
  const fallback = new URL("/", origin);
  if (!next || /[\x00-\x1f\\]/.test(next)) return fallback;
  try {
    const u = new URL(next, origin);
    return u.origin === origin ? new URL(u.pathname + u.search, origin) : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = panelOrigin(request);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  return NextResponse.redirect(ok ? safeTarget(searchParams.get("next"), origin) : new URL("/login?error=enlace", origin));
}
