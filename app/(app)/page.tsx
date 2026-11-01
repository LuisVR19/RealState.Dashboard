"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CountKpi } from "@/components/CountKpi";
import { usePanel } from "@/components/panel-provider";
import { DateBadge, StatusTag } from "@/components/ui";
import { dayParts, longDay } from "@/lib/dates";
import { initialsOf, prefShort, VISIT_STATUS_STYLE } from "@/lib/format";

export default function HomePage() {
  const { me, isAdmin, properties, visits, clients, matches, today, propertyTitle, openClient } = usePanel();
  const router = useRouter();
  const pend = visits.filter((v) => v.status === "Pendiente").length;
  const unassigned = clients.filter((c) => !c.assignedAgentId).length;
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Costa_Rica", hour: "numeric", hour12: false }).format(new Date()));
  const greeting = (h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches") + ", " + me.firstName;

  const kpis = [
    { label: "Publicadas", icon: "ph-globe", value: properties.filter((p) => p.status === "Publicada").length, href: "/propiedades?estado=Publicada" },
    { label: "Borradores", icon: "ph-note-pencil", value: properties.filter((p) => p.status === "Borrador").length, href: "/propiedades?estado=Borrador" },
    { label: "Visitas pendientes", icon: "ph-hourglass", value: pend, href: "/visitas?estado=Pendiente" },
    { label: "Visitas próximas", icon: "ph-calendar-check", value: visits.filter((v) => v.date >= today && v.status !== "Cancelada" && v.status !== "Realizada").length, href: "/visitas?vista=calendario" },
    { label: "Clientes nuevos", icon: "ph-user-plus", value: clients.filter((c) => c.status === "Nuevo").length, href: "/clientes?estado=Nuevo" },
    { label: "Matches activos", icon: "ph-sparkle", value: matches.length, href: "/matches" },
  ];
  const upcoming = visits.filter((v) => v.date >= today && (v.status === "Pendiente" || v.status === "Confirmada")).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
  const editHref = (code: string) => `/propiedades/${code}`;
  const tasks = [
    ...properties.filter((p) => p.status === "Borrador").slice(0, 3).map((p) => ({ icon: "ph-note-pencil", title: "Completa y publica: " + p.title, sub: "Borrador · " + p.code, href: editHref(p.code) })),
    ...properties.filter((p) => p.status === "Publicada" && !p.images.length).slice(0, 2).map((p) => ({ icon: "ph-warning", title: "Sin fotos, no aparece en el sitio: " + p.title, sub: "Publicada · " + p.code, href: editHref(p.code) })),
    ...properties.filter((p) => p.status === "Publicada" && p.images.length > 0 && p.images.length < 3).slice(0, 2).map((p) => ({ icon: "ph-images", title: "Agrega más fotos a " + p.title, sub: p.images.length + " foto(s). Recomendamos al menos 5.", href: editHref(p.code) })),
    ...(pend ? [{ icon: "ph-calendar-check", title: `Confirma ${pend} ${pend === 1 ? "visita pendiente" : "visitas pendientes"}`, sub: "Los clientes esperan respuesta por WhatsApp", href: "/visitas?estado=Pendiente" }] : []),
    ...(unassigned ? [{ icon: "ph-user-plus", title: `${unassigned} ${unassigned === 1 ? "cliente nuevo sin asesor" : "clientes nuevos sin asesor"}`, sub: isAdmin ? "Asigna un asesor para que reciban seguimiento" : "Puedes asignártelos desde su ficha", href: "/clientes?asesor=none" }] : []),
  ];
  const matchCount = (cid: string) => matches.filter((m) => m.client.id === cid).length;

  return (
    <div className="stack-22">
      <div className="page-head">
        <div><h1 className="page-title">{greeting}</h1><div className="muted-14">{longDay(today)}{isAdmin ? " · Vista de todo el equipo" : " · Tus propiedades y visitas"}</div></div>
        <Link href="/propiedades/nueva" className="btn btn-primary h40"><i className="ph ph-plus" style={{ fontSize: 16 }} />Nueva propiedad</Link>
      </div>
      <div className="grid-kpis">{kpis.map((k) => <CountKpi key={k.label} {...k} />)}</div>
      <div className="grid-home">
        <section className="card stack-4">
          <div className="row-between" style={{ marginBottom: 8 }}><h2 className="h2-17">Próximas visitas</h2><Link href="/visitas" className="btn btn-ghost" style={{ fontSize: 13 }}>Ver todas</Link></div>
          {upcoming.map((v) => (
            <div key={v.id} className="list-row">
              <DateBadge {...dayParts(v.date)} mon={undefined} />
              <div className="list-row-main"><span style={{ fontSize: 14, fontWeight: 500 }}>{v.clientName} · {v.time}</span><span className="muted-12 ellipsis">{propertyTitle(v.propertyId)}</span></div>
              <StatusTag style={VISIT_STATUS_STYLE[v.status]}>{v.status}</StatusTag>
            </div>
          ))}
          {!upcoming.length && <div className="empty-small">No hay visitas agendadas.</div>}
        </section>
        <section className="card stack-4">
          <h2 className="h2-17" style={{ marginBottom: 8 }}>Pendientes</h2>
          {tasks.map((t) => (
            <button key={t.title} className="list-row list-btn" onClick={() => router.push(t.href)}>
              <i className={`ph ${t.icon}`} style={{ fontSize: 18, color: "var(--color-neutral-500)" }} />
              <span className="list-row-main"><span style={{ fontSize: 14 }}>{t.title}</span><span className="muted-12">{t.sub}</span></span>
              <i className="ph ph-caret-right" style={{ color: "var(--color-neutral-500)" }} />
            </button>
          ))}
          {!tasks.length && <div className="empty-small">Todo al día.</div>}
        </section>
        <section className="card stack-4">
          <div className="row-between" style={{ marginBottom: 8 }}><h2 className="h2-17">Clientes recientes</h2><Link href="/clientes" className="btn btn-ghost" style={{ fontSize: 13 }}>Ver todos</Link></div>
          {clients.slice(0, 5).map((c) => {
            const n = matchCount(c.id);
            return (
              <button key={c.id} className="list-row list-btn" onClick={() => openClient(c.id)}>
                <span className="avatar avatar-36 is-neutral">{initialsOf(c.name)}</span>
                <span className="list-row-main"><span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span><span className="muted-12 ellipsis">{prefShort(c.preferences)}</span></span>
                <StatusTag style={n ? ["var(--color-accent-900)", "var(--color-accent-200)"] : ["var(--color-neutral-900)", "var(--color-neutral-500)"]}>{n} {n === 1 ? "match" : "matches"}</StatusTag>
              </button>
            );
          })}
          {!clients.length && <div className="empty-small">Aún no hay clientes registrados.</div>}
        </section>
      </div>
    </div>
  );
}
