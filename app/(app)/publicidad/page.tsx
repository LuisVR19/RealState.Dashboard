// Publicidad del sitio público (solo administradores): marcas anunciantes, anuncios y sus métricas.
// Datos: tablas advertisers, ads y ad_daily_stats (la RLS también exige ser admin).
import { notFound, redirect } from "next/navigation";
import { AdsManager } from "@/components/AdsManager";
import { getAdsPanelData, type AdsPanelData } from "@/lib/ads";
import { getSession } from "@/lib/auth";

export default async function AdsPage() {
  const { supabase, me } = await getSession();
  if (!me) redirect("/login");
  if (me.role !== "Admin") notFound();

  let data: AdsPanelData;
  try {
    data = await getAdsPanelData(supabase);
  } catch (e) {
    console.error("[panel] publicidad:", e);
    return (
      <div className="table-empty card">
        <span style={{ fontSize: 16, fontWeight: 500 }}>No pudimos cargar la publicidad</span>
        <span className="muted-14">Intenta de nuevo en un momento.</span>
      </div>
    );
  }
  return <AdsManager data={data} />;
}
