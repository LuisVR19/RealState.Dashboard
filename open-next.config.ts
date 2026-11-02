// Configuración de OpenNext para Cloudflare Workers.
// El panel no usa la caché de Next (`use cache` / cacheTag / revalidateTag): cada página lee en vivo
// de Supabase con la sesión del usuario. Por eso no se configura incrementalCache (KV), tagCache (D1)
// ni queue (Durable Object), a diferencia del sitio público (RealState.Web/open-next.config.ts).
// Si se activa la caché, crear un KV y un D1 propios del panel y declararlos en wrangler.jsonc.
// Ver https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
