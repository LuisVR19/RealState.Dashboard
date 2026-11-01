import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PanelProvider } from "@/components/panel-provider";
import { getSession } from "@/lib/auth";
import { getPanelData } from "@/lib/data";
import { todayISO } from "@/lib/dates";

/** Protege el panel (solo asesores activos) y carga sus datos con la sesión del usuario (RLS). */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, me } = await getSession();
  if (!me) redirect("/login");
  const data = await getPanelData(supabase, me);
  return (
    <PanelProvider data={data} today={todayISO()}>
      <AppShell siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}>{children}</AppShell>
    </PanelProvider>
  );
}
