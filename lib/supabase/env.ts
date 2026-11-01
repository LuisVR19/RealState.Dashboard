// Configuración de Supabase compartida por servidor, navegador y proxy.

/** Variables públicas de Supabase. Fallan pronto y con un mensaje claro si faltan. */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).");
  }
  return { url, key };
}

/**
 * Nombre propio para la cookie de sesión del panel. Sin esto, el panel y el sitio público (mismo
 * proyecto de Supabase) compartirían la cookie cuando corren en el mismo host (p. ej. localhost),
 * y cerrar sesión en uno cerraría la del otro.
 */
export const SESSION_COOKIE = { name: "sb-isf-panel-auth" };
