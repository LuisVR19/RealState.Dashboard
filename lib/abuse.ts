// Límite de frecuencia por IP para el login y la recuperación de contraseña del panel (auditoría H-02).
// Estas acciones corren en el Worker, así que Supabase ve la IP de Cloudflare y no la del usuario: sus
// límites por IP no distinguen a un atacante de los demás. Este límite sí (cf-connecting-ip).
// El captcha (Turnstile) lo verifica Supabase Auth con el captchaToken que mandan las acciones.
// Sin el binding (next dev, pruebas) o si falla, se deja pasar: quedan los límites de Supabase.
import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type LimiterName = "AUTH_LIMITER";

/** IP del usuario según Cloudflare (o el primer salto de x-forwarded-for fuera de Cloudflare). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** true si la petición está dentro del límite. */
export async function rateLimit(name: LimiterName, key: string): Promise<boolean> {
  let limiter: RateLimiter | undefined;
  try {
    limiter = (getCloudflareContext().env as unknown as Record<string, RateLimiter | undefined>)[name];
  } catch {
    return true;
  }
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch (e) {
    console.warn("[panel] rate limit no disponible:", (e as Error).message);
    return true;
  }
}

/** Token de Turnstile que llega del navegador, saneado (undefined si no hay). */
export function captchaToken(x: unknown): string | undefined {
  return typeof x === "string" && x.length > 0 && x.length <= 2048 ? x : undefined;
}
