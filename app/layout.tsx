import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { connection } from "next/server";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/fill";
import "./styles/ds.css";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Panel · Thomas Mata S.A.",
  description: "Panel interno para asesores y administradores.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Todo el panel se renderiza por petición: la CSP lleva un nonce nuevo en cada una (proxy.ts) y una
  // página prerenderizada en el build no lo tendría, así que sus scripts quedarían bloqueados.
  await connection();
  return (
    <html lang="es" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
