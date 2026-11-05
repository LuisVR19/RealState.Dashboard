// Infraestructura común de las Server Actions del panel: sesión obligatoria, validación de entrada,
// errores de la base traducidos a mensajes claros y refresco de la pantalla al terminar.
import "server-only";
import { refresh } from "next/cache";
import { after } from "next/server";
import { getSession } from "./auth";
import type { ServerClient } from "./supabase/server";
import type { TeamUser } from "./types";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** Error con un mensaje apto para mostrar al usuario tal cual. */
export class UserError extends Error {}

interface Ctx {
  supabase: ServerClient;
  me: TeamUser;
  isAdmin: boolean;
}

/** Mensaje para errores de PostgREST/Postgres. Los 22023/P0002 los lanzan nuestras funciones en español. */
function dbMessage(e: { code?: string; message?: string }) {
  switch (e.code) {
    case "22023":
    case "P0002":
      return e.message ?? "Datos inválidos.";
    case "23505":
      return "Ya existe un registro con ese dato (por ejemplo, el mismo correo).";
    case "23503":
      return "No se puede: hay otros registros que dependen de este.";
    case "23514":
    case "22P02":
      return "Algún dato no tiene un formato válido.";
    case "42501":
      return "No tienes permiso para hacer esto.";
    default:
      return null;
  }
}

/** Lanza si la base devolvió error. Úsalo en cada consulta de una acción. */
export function check<T>(res: { data: T; error: { code?: string; message: string } | null }): T {
  if (res.error) throw res.error;
  return res.data;
}

/**
 * Para update/delete: la RLS no da error cuando no deja tocar una fila, simplemente no la toca.
 * Exigir filas afectadas evita reportar como guardado algo que no se guardó.
 */
export function changed<T>(res: { data: T[] | null; error: { code?: string; message: string } | null }): T[] {
  const rows = check(res) ?? [];
  if (!rows.length) throw new UserError("El registro ya no existe o no tienes permiso para cambiarlo.");
  return rows;
}

/**
 * Ejecuta una acción del panel. Exige un asesor activo (la RLS es la última palabra) y, si todo sale
 * bien, refresca la pantalla del usuario para que vea los datos nuevos.
 */
export async function runAction<T>(fn: (ctx: Ctx) => Promise<T>, opts: { adminOnly?: boolean } = {}): Promise<ActionResult<T>> {
  try {
    const { supabase, me } = await getSession();
    if (!me) return { ok: false, error: "Tu sesión venció. Vuelve a iniciar sesión." };
    if (opts.adminOnly && me.role !== "Admin") return { ok: false, error: "Solo un administrador puede hacer esto." };
    const data = await fn({ supabase, me, isAdmin: me.role === "Admin" });
    refresh();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    const msg = e && typeof e === "object" ? dbMessage(e as { code?: string; message?: string }) : null;
    if (!msg) console.error("[panel] acción fallida:", e);
    return { ok: false, error: msg ?? "No se pudo guardar. Intenta de nuevo." };
  }
}

/* ---------- Validación de entrada (todo lo que llega del navegador es no confiable) ---------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const v = {
  uuid(x: unknown, label = "Identificador"): string {
    if (typeof x !== "string" || !UUID_RE.test(x)) throw new UserError(`${label} inválido.`);
    return x;
  },
  optUuid(x: unknown, label?: string): string | null {
    return x == null || x === "" ? null : v.uuid(x, label);
  },
  oneOf<T extends string>(x: unknown, list: readonly T[], label: string): T {
    if (typeof x !== "string" || !list.includes(x as T)) throw new UserError(`${label}: valor no válido.`);
    return x as T;
  },
  text(x: unknown, label: string, max: number, required = false): string {
    const s = typeof x === "string" ? x.trim() : "";
    if (required && !s) throw new UserError(`${label} es obligatorio.`);
    if (s.length > max) throw new UserError(`${label}: máximo ${max} caracteres.`);
    return s;
  },
  /** Nombre de lugar (ciudad, cantón, provincia, país): texto libre de una línea. */
  place(x: unknown, label: string, max = 80, required = false): string {
    const s = v.text(x, label, max, required).replace(/\s+/g, " ");
    if (/[\u0000-\u001f\u007f<>]/.test(s)) throw new UserError(`${label}: contiene caracteres no válidos.`);
    return s;
  },
  num(x: unknown, label: string, min: number, max: number, int = true): number | null {
    if (x == null || x === "") return null;
    const n = Number(x);
    if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new UserError(`${label}: valor fuera de rango.`);
    return n;
  },
  bool(x: unknown): boolean {
    return x === true;
  },
  list<T>(x: unknown, max: number, each: (y: unknown) => T): T[] {
    if (x == null) return [];
    if (!Array.isArray(x) || x.length > max) throw new UserError("Lista inválida.");
    return [...new Set(x.map(each))];
  },
  email(x: unknown, required = false): string {
    const s = v.text(x, "El correo", 254, required).toLowerCase();
    if (s && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) throw new UserError("El correo no es válido.");
    return s;
  },
  phone(x: unknown, required = false): string {
    const s = (typeof x === "string" ? x : "").replace(/\D/g, "").replace(/^506(?=\d{8}$)/, "");
    if (!s && !required) return "";
    if (!/^[245678]\d{7}$/.test(s)) throw new UserError("El teléfono debe tener 8 dígitos de Costa Rica.");
    return s;
  },
  date(x: unknown): string {
    if (typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x) || Number.isNaN(Date.parse(x + "T12:00:00Z"))) throw new UserError("Fecha inválida.");
    return x;
  },
  time(x: unknown): string {
    if (typeof x !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(x)) throw new UserError("Hora inválida.");
    return x;
  },
  httpsUrl(x: unknown, label = "La URL"): string {
    const s = v.text(x, label, 2000, true);
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      throw new UserError(`${label} no es válida.`);
    }
    if (u.protocol !== "https:") throw new UserError(`${label} debe empezar con https://`);
    return u.href;
  },
};

/* ---------- Sitio público ---------- */

/**
 * Pide al sitio público que invalide su caché (POST /api/revalidate con el secreto compartido).
 * Corre después de responder (after) y nunca hace fallar el guardado: si el sitio no responde,
 * los datos se refrescan solos al vencer la caché (1 min propiedades, 1 h el resto).
 */
export function revalidateSite(tags: string[]) {
  const secret = process.env.REVALIDATE_SECRET;
  const site = process.env.SITE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !site || !tags.length) return;
  after(async () => {
    try {
      const res = await fetch(new URL("/api/revalidate", site), {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      if (!res.ok) console.warn("[panel] el sitio respondió", res.status, "al revalidar", tags);
    } catch (e) {
      console.warn("[panel] no se pudo avisar al sitio público:", (e as Error).message);
    }
  });
}

/** URL pública del panel (enlaces de los correos de Auth). */
export const panelUrl = () => process.env.NEXT_PUBLIC_PANEL_URL ?? "http://localhost:3001";
