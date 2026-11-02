"use server";

import { redirect } from "next/navigation";
import { captchaToken, clientIp, rateLimit } from "@/lib/abuse";
import { getSession } from "@/lib/auth";
import { panelUrl } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

type FormState = { error?: string; notice?: string } | null;

const TOO_MANY = "Demasiados intentos. Espera un minuto e intenta de nuevo.";
const CAPTCHA_FAILED = "No pudimos verificar que no eres un robot. Intenta de nuevo o recarga la página.";

/** Ruta interna segura para volver después del login (evita redirecciones abiertas). */
function safeNext(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || /[\x00-\x1f\\]/.test(next)) return "/";
  try {
    const base = "http://panel.local";
    const u = new URL(next, base);
    return u.origin === base ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}

/** Inicio de sesión con correo y contraseña. Solo entra un asesor o administrador activo. */
export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y contraseña." };
  if (email.length > 254 || password.length > 200) return { error: "Correo o contraseña incorrectos." };
  if (!(await rateLimit("AUTH_LIMITER", `login:${await clientIp()}`))) return { error: TOO_MANY };

  const supabase = await createClient();
  const token = captchaToken(form.get("cf-turnstile-response"));
  const { error } = await supabase.auth.signInWithPassword({ email, password, ...(token ? { options: { captchaToken: token } } : {}) });
  if (error) {
    if (error.status === 429) return { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." };
    if (/captcha/i.test(error.message)) return { error: CAPTCHA_FAILED };
    if (error.code === "email_not_confirmed") return { error: "Tu correo aún no está confirmado. Usa el enlace de la invitación." };
    return { error: "Correo o contraseña incorrectos." };
  }

  // Una cuenta de cliente del sitio (o un asesor desactivado) no entra al panel.
  const { data: isAgent } = await supabase.rpc("is_agent");
  if (!isAgent) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Esta cuenta no tiene acceso al panel." };
  }
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

/**
 * Envía el correo para restablecer la contraseña. Responde lo mismo exista o no la cuenta,
 * para no revelar qué correos pertenecen al equipo.
 */
export async function requestPasswordReset(email: string, captcha?: string): Promise<FormState> {
  const clean = String(email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean) || clean.length > 254) return { error: "Escribe un correo válido." };
  if (!(await rateLimit("AUTH_LIMITER", `reset:${await clientIp()}`))) return { error: TOO_MANY };
  const supabase = await createClient();
  const token = captchaToken(captcha);
  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo: `${panelUrl()}/auth/callback?next=/auth/nueva-contrasena`,
    ...(token ? { captchaToken: token } : {}),
  });
  if (error?.status === 429) return { error: "Ya enviamos varios correos. Espera unos minutos." };
  if (error && /captcha/i.test(error.message)) return { error: CAPTCHA_FAILED };
  if (error) console.error("[panel] resetPasswordForEmail:", error.message);
  return { notice: "Si el correo pertenece al equipo, te enviamos un enlace para crear una contraseña nueva." };
}

/** Fija la contraseña de la sesión actual (enlace de invitación o de recuperación). */
export async function setNewPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 8 || password.length > 72) return { error: "La contraseña debe tener entre 8 y 72 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const { supabase, me } = await getSession();
  if (!me) return { error: "El enlace venció o no es de una cuenta del equipo. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "La contraseña nueva debe ser distinta de la anterior." };
    if (error.code === "weak_password") return { error: "La contraseña es muy débil. Usa una más larga o con más variedad." };
    return { error: "No se pudo guardar la contraseña. Intenta de nuevo." };
  }
  redirect("/");
}
