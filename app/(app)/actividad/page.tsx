// Actividad del sitio público (solo administradores): tráfico anónimo, contactos y conversiones.
// Datos: rpc get_site_activity (la base también exige ser admin). Ver docs/PLAN-ACTIVIDAD-PANEL.md.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActivityChart } from "@/components/ActivityChart";
import { conversion, delta, getSiteActivity, parsePeriod, PERIODS, type Metric, type RecentItem, type SiteActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { longDay } from "@/lib/dates";

const KPIS: { metric: Metric; label: string; icon: string; hint: string }[] = [
  { metric: "page_view", label: "Páginas vistas", icon: "ph-browser", hint: "Cada página del sitio que alguien abrió" },
  { metric: "property_view", label: "Vistas de propiedades", icon: "ph-house-line", hint: "Fichas de propiedades abiertas (una por persona y pestaña)" },
  { metric: "whatsapp_click", label: "Clics a WhatsApp", icon: "ph-whatsapp-logo", hint: "Toques a cualquier botón de WhatsApp del sitio" },
  { metric: "visit_request", label: "Solicitudes de visita", icon: "ph-calendar-check", hint: "Pedidas desde el sitio" },
  { metric: "signup", label: "Cuentas nuevas", icon: "ph-user-plus", hint: "Clientes que se registraron en el sitio" },
  { metric: "favorite", label: "Propiedades guardadas", icon: "ph-heart", hint: "Veces que un cliente guardó una propiedad" },
];

const when = new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function recentText(r: RecentItem) {
  const who = r.who || "Alguien";
  const prop = r.code ? ` ${r.code}` : "";
  if (r.type === "visit_request") return { icon: "ph-calendar-check", text: `${who} pidió una visita${r.code ? " a" + prop : ""}`, href: "/visitas?estado=Pendiente" };
  if (r.type === "signup") return { icon: "ph-user-plus", text: `${who} creó una cuenta en el sitio`, href: "/clientes" };
  return { icon: "ph-heart", text: `${who} guardó${prop || " una propiedad"}`, href: "/clientes" };
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, me } = await getSession();
  if (!me) redirect("/login");
  if (me.role !== "Admin") notFound();

  const days = parsePeriod((await searchParams).dias);
  let data: SiteActivity;
  try {
    data = await getSiteActivity(supabase, days);
  } catch {
    return (
      <div className="table-empty card">
        <span style={{ fontSize: 16, fontWeight: 500 }}>No pudimos cargar la actividad</span>
        <span className="muted-14">Intenta de nuevo en un momento.</span>
      </div>
    );
  }
  const { current: cur, previous: prev } = data;
  const contacts = data.series.map((d) => ({ day: d.day, value: d.whatsapp_click + d.visit_request }));

  return (
    <div className="stack-18">
      <div className="row-between" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">Actividad del sitio</h1>
          <div className="muted-14">Últimos {days} días · comparado con los {days} días anteriores</div>
        </div>
        <nav className="chip-row" aria-label="Período">
          {PERIODS.map((p) => (
            <Link key={p} href={`/actividad?dias=${p}`} className={`chip chip-md${p === days ? " is-on" : ""}`} aria-current={p === days ? "page" : undefined}>
              {p} días
            </Link>
          ))}
        </nav>
      </div>

      {!data.trackingSince && (
        <div className="card muted-14" role="status">
          <i className="ph ph-info" /> Todavía no hay datos de tráfico. La medición del sitio empieza a contar desde que se activa; las solicitudes, cuentas y favoritos sí se muestran desde antes.
        </div>
      )}

      <div className="grid-kpis">
        {KPIS.map((k) => {
          const d = delta(cur[k.metric], prev[k.metric]);
          return (
            <div key={k.metric} className="kpi" title={k.hint}>
              <span className="kpi-label"><i className={`ph ${k.icon}`} />{k.label}</span>
              <span className="kpi-value">{cur[k.metric].toLocaleString("es-CR")}</span>
              <span className="kpi-delta">
                <i className={`ph ${d.trend === "up" ? "ph-arrow-up-right" : d.trend === "down" ? "ph-arrow-down-right" : "ph-minus"}`} aria-hidden="true" />
                {d.text}
              </span>
            </div>
          );
        })}
      </div>
      <div className="muted-13">
        También en el período: {cur.share_click} {cur.share_click === 1 ? "vez compartida una propiedad" : "veces compartidas propiedades"} · {cur.search} {cur.search === 1 ? "búsqueda" : "búsquedas"} con filtros.
      </div>

      <div className="activity-charts">
        <ActivityChart title="Vistas de propiedades por día" unit="vistas" points={data.series.map((d) => ({ day: d.day, value: d.property_view }))} />
        <ActivityChart title="Contactos por día" unit="contactos (WhatsApp + solicitudes)" points={contacts} />
      </div>

      <section className="stack-12">
        <h2 className="h2-17">Propiedades con más interés</h2>
        <div className="table">
          <div className="table-head">
            <span style={{ flex: "1 1 280px" }}>Propiedad</span>
            <span className="w90">Vistas</span><span className="w90">WhatsApp</span><span className="w90">Guardada</span><span className="w90">Visitas</span>
            <span className="w100" title="% de vistas que terminan en WhatsApp o en una solicitud de visita">Conversión</span>
          </div>
          {data.topProperties.map((p) => (
            <div key={p.id} className="table-row is-hover">
              <Link href={`/propiedades/${p.code}`} className="prop-cell" style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</span>
                  <span className="muted-12">{p.code}</span>
                </span>
              </Link>
              <span className="w90 cell-13"><span className="only-mobile">Vistas: </span>{p.views}</span>
              <span className="w90 cell-13"><span className="only-mobile">WhatsApp: </span>{p.whatsapp}</span>
              <span className="w90 cell-13"><span className="only-mobile">Guardada: </span>{p.favorites}</span>
              <span className="w90 cell-13"><span className="only-mobile">Visitas: </span>{p.visit_requests}</span>
              <span className="w100 cell-13"><span className="only-mobile">Conversión: </span>{conversion(p)}</span>
            </div>
          ))}
          {!data.topProperties.length && (
            <div className="table-empty">
              <span style={{ fontSize: 15, fontWeight: 500 }}>Sin actividad en este período</span>
              <span className="muted-13">Cuando alguien vea, guarde o pida visita a una propiedad, aparecerá aquí.</span>
            </div>
          )}
        </div>
      </section>

      <section className="card stack-12">
        <h2 className="h2-17">Actividad reciente</h2>
        {data.recent.length ? (
          <div>
            {data.recent.map((r, i) => {
              const t = recentText(r);
              return (
                <Link key={i} href={t.href} className="list-row" style={{ textDecoration: "none", color: "inherit" }}>
                  <i className={`ph ${t.icon}`} style={{ fontSize: 18, color: "var(--color-accent)" }} aria-hidden="true" />
                  <span className="list-row-main">
                    <span style={{ fontSize: 14 }}>{t.text}</span>
                    {r.title && <span className="muted-12">{r.title}</span>}
                  </span>
                  <span className="muted-12" style={{ whiteSpace: "nowrap" }}>{when.format(new Date(r.at))}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <span className="muted-14">Todavía no hay solicitudes, cuentas nuevas ni propiedades guardadas desde el sitio.</span>
        )}
      </section>

      <p className="muted-12">
        Cifras anónimas: el sitio cuenta páginas, propiedades vistas y toques a WhatsApp sin cookies ni datos personales
        {data.trackingSince ? `, desde el ${longDay(data.trackingSince).toLowerCase()}` : ""}. No cuenta bots ni a quien bloquea JavaScript,
        así que puede diferir de otras herramientas de analítica.
      </p>
    </div>
  );
}
