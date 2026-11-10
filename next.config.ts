import type { NextConfig } from "next";

// Cabeceras de seguridad. El panel es interno: no se incrusta en ningún iframe ni lo indexan buscadores.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  // geolocation=(self): botón "Mi ubicación" del editor de anuncios (solo el propio panel, nunca iframes).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (bucket de imágenes de propiedades)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
