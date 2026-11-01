// Cliente de Supabase para el navegador. El panel lo usa solo para subir imágenes a Storage
// (las políticas del bucket validan dueño/admin) y para tomar la sesión de un enlace de invitación.
// Lecturas y escrituras de datos van por el servidor (layout y Server Actions).
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SESSION_COOKIE } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookieOptions: SESSION_COOKIE });
  }
  return client;
}
