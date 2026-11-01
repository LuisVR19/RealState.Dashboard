"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { deleteVisit, setVisitStatus } from "@/app/actions/visits";
import { usePanel } from "@/components/panel-provider";
import { CountTab, DateBadge, PageHead, SearchInput, StatusTag, Thumb } from "@/components/ui";
import { dayParts, longDay, MON_LONG, monthLabel } from "@/lib/dates";
import { firstName, VISIT_STATUS_STYLE, waNumber } from "@/lib/format";
import type { Visit, VisitStatus } from "@/lib/types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const STATUSES: (VisitStatus | "Todas")[] = ["Todas", "Pendiente", "Confirmada", "Realizada", "Cancelada"];
const isoOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 12)).toISOString().slice(0, 10);

function VisitsView() {
  const { visits, properties, clients, isAdmin, me, today, agentName, propertyTitle, propertyById, open, openClient, run } = usePanel();
  const sp = useSearchParams();
  const [mode, setMode] = useState<"list" | "cal">(sp.get("vista") === "calendario" ? "cal" : "list");
  const [status, setStatus] = useState<VisitStatus | "Todas">((sp.get("estado") as VisitStatus) ?? "Todas");
  const [prop, setProp] = useState(sp.get("propiedad") ?? "Todas");
  const [q, setQ] = useState("");
  const nq = norm(q.trim());
  const [ym, setYm] = useState(() => { const [y, m] = today.split("-").map(Number); return y * 12 + m - 1; });
  const [day, setDay] = useState(today);

  const byProp = visits.filter((v) => (prop === "Todas" || v.propertyId === prop) && (!nq || norm(`${v.clientName} ${v.clientPhone} ${propertyTitle(v.propertyId)}`).includes(nq)));
  const list = (status === "Todas" ? byProp : byProp.filter((v) => v.status === status)).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const count = (k: VisitStatus | "Todas") => (k === "Todas" ? byProp.length : byProp.filter((v) => v.status === k).length);
  const isReg = (v: Visit) => !!v.clientId && clients.some((c) => c.id === v.clientId);
  const wa = (v: Visit) => waNumber(v.clientPhone, `Hola ${firstName(v.clientName)}, le escribe ${me.firstName} de Thomas Mata S.A. sobre su visita del ${dayParts(v.date).num} de ${MON_LONG[Number(v.date.slice(5, 7)) - 1]} a las ${v.time}.`);
  const selProp = prop !== "Todas" ? propertyById(prop) : null;

  // Calendario mensual (semana de lunes a domingo)
  const y = Math.floor(ym / 12), m = ym % 12;
  const start = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: start + dim > 35 ? 42 : 35 }, (_, i) => isoOf(y, m, 1 - start + i));
  const byDay = (iso: string) => list.filter((v) => v.date === iso).sort((a, b) => a.time.localeCompare(b.time));
  const dayItems = byDay(day);

  return (
    <div className="stack-18">
      <PageHead title="Visitas" sub="Solicitudes del sitio y visitas agendadas por el equipo." action={<button className="btn btn-primary h40" onClick={() => open({ type: "visit" })}><i className="ph ph-plus" style={{ fontSize: 16 }} />Nueva visita</button>} />
      <div className="filters">
        <div className="segmented">
          {([["list", "Lista", "ph-list-bullets"], ["cal", "Calendario", "ph-calendar-dots"]] as const).map(([k, l, ic]) => (
            <button key={k} onClick={() => setMode(k)} className={mode === k ? "is-on" : ""}><i className={`ph ${ic}`} style={{ fontSize: 15 }} />{l}</button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar cliente o propiedad" maxWidth={300} />
        <select className="input select-sm" value={prop} onChange={(e) => setProp(e.target.value)} style={{ maxWidth: 280 }}>
          <option value="Todas">Todas las propiedades</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
        </select>
        <div className="tabs-scroll">{STATUSES.map((k) => <CountTab key={k} label={k === "Todas" ? "Todas" : k + "s"} count={count(k)} on={status === k} onClick={() => setStatus(k)} />)}</div>
      </div>

      {selProp && (
        <div className="card row-card">
          <Thumb src={selProp.images[0]} w={64} h={48} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Agenda de {selProp.title}</span>
            <span className="muted-12">{selProp.code} · {(() => { const vv = visits.filter((v) => v.propertyId === selProp.id), up = vv.filter((v) => v.date >= today && v.status !== "Cancelada" && v.status !== "Realizada").length; return `${up} ${up === 1 ? "visita próxima" : "visitas próximas"} · ${vv.length} en total`; })()}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => setProp("Todas")} style={{ fontSize: 13 }}>Ver todas</button>
        </div>
      )}

      {mode === "cal" && (
        <div className="cal-layout">
          <section className="card stack-12 pad-16" style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 18, margin: 0, flex: 1 }}>{monthLabel(y, m)}</h2>
              <button className="btn btn-secondary h34" style={{ fontSize: 13 }} onClick={() => { const [ty, tm] = today.split("-").map(Number); setYm(ty * 12 + tm - 1); setDay(today); }}>Hoy</button>
              <button className="btn btn-secondary btn-icon b34" onClick={() => setYm(ym - 1)} aria-label="Mes anterior"><i className="ph ph-caret-left" style={{ fontSize: 15 }} /></button>
              <button className="btn btn-secondary btn-icon b34" onClick={() => setYm(ym + 1)} aria-label="Mes siguiente"><i className="ph ph-caret-right" style={{ fontSize: 15 }} /></button>
            </div>
            <div className="cal-grid">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d} className="cal-dow">{d}</span>)}
              {cells.map((iso) => {
                const its = byDay(iso), sel = iso === day, inMonth = Number(iso.slice(5, 7)) - 1 === m;
                return (
                  <button key={iso} onClick={() => { setDay(iso); const [cy, cm] = iso.split("-").map(Number); setYm(cy * 12 + cm - 1); }} className={`cal-cell${sel ? " is-sel" : ""}`} style={{ opacity: inMonth ? 1 : 0.4 }}>
                    <span className={`cal-num${iso === today ? " is-today" : ""}`}>{Number(iso.slice(8))}</span>
                    {its.slice(0, 3).map((v) => <span key={v.id} className="cal-item" style={{ background: VISIT_STATUS_STYLE[v.status][0], color: VISIT_STATUS_STYLE[v.status][1] }}>{v.time} {firstName(v.clientName)}</span>)}
                    {its.length > 3 && <span className="cal-more">+{its.length - 3} más</span>}
                    {its.length > 0 && <span className="cal-dot">● {its.length}</span>}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="card stack-4 pad-16">
            <div className="row-between" style={{ marginBottom: 6 }}><h2 className="h2-16">{longDay(day)}</h2><button className="btn btn-secondary btn-icon b34" onClick={() => open({ type: "visit", prefill: { date: day, ...(selProp ? { propertyId: selProp.id } : {}) } })} aria-label="Agendar este día" title="Agendar este día"><i className="ph ph-plus" style={{ fontSize: 16 }} /></button></div>
            {dayItems.map((v) => (
              <div key={v.id} className="day-item">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{v.time} · {v.clientName}</span><StatusTag style={VISIT_STATUS_STYLE[v.status]}>{v.status}</StatusTag></div>
                <span className="muted-12">{propertyTitle(v.propertyId)}</span>
                <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{v.mode} · {agentName(v.agentId)}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <a className="btn btn-secondary btn-icon b32" href={wa(v)} target="_blank" rel="noopener" title="WhatsApp"><i className="ph ph-whatsapp-logo" style={{ fontSize: 15 }} /></a>
                  <button className="btn btn-secondary btn-icon b32" onClick={() => open({ type: "visit", visit: v })} title="Editar"><i className="ph ph-pencil-simple" style={{ fontSize: 15 }} /></button>
                  {isReg(v) && <button className="btn btn-secondary btn-icon b32" onClick={() => openClient(v.clientId)} title="Ficha del cliente"><i className="ph ph-user" style={{ fontSize: 15 }} /></button>}
                </div>
              </div>
            ))}
            {!dayItems.length && <span className="muted-13" style={{ padding: "6px 0" }}>Sin visitas este día.</span>}
          </section>
        </div>
      )}

      {mode === "list" && (
        <div className="table">
          {list.map((v) => {
            const d = dayParts(v.date);
            return (
              <div key={v.id} className="table-row">
                <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                  <DateBadge {...d} />
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {isReg(v) ? <button className="link-btn" onClick={() => openClient(v.clientId)}>{v.clientName}</button> : <span style={{ fontSize: 14, fontWeight: 500 }}>{v.clientName}</span>}
                      {v.source === "sitio_web" && <StatusTag style={["var(--color-neutral-900)", "var(--color-neutral-400)"]}>Sitio web</StatusTag>}
                      {v.notes && <i className="ph ph-note" title={v.notes} aria-label="Tiene notas" style={{ color: "var(--color-neutral-500)" }} />}
                    </span>
                    <span className="muted-12">{v.time} · {v.mode} · {v.clientPhone}</span>
                  </div>
                </div>
                <span className="cell-13 ellipsis" style={{ flex: "1 1 220px", minWidth: 0 }}><i className="ph ph-house-line" style={{ color: "var(--color-neutral-500)" }} /> {propertyTitle(v.propertyId)}</span>
                {isAdmin && <span className="w130 cell-13 ellipsis">{agentName(v.agentId)}</span>}
                <select className="input status-select" value={v.status} aria-label="Estado de la visita" onChange={(e) => run(() => setVisitStatus(v.id, e.target.value), "Visita marcada como " + e.target.value.toLowerCase())} style={{ background: VISIT_STATUS_STYLE[v.status][0], color: VISIT_STATUS_STYLE[v.status][1] }}>
                  {STATUSES.slice(1).map((s) => <option key={s}>{s}</option>)}
                </select>
                <div style={{ display: "flex", gap: 4 }}>
                  <a className="btn btn-secondary btn-icon b34" href={wa(v)} target="_blank" rel="noopener" title="WhatsApp"><i className="ph ph-whatsapp-logo" style={{ fontSize: 16 }} /></a>
                  <button className="btn btn-secondary btn-icon b34" onClick={() => open({ type: "visit", visit: v })} title="Editar"><i className="ph ph-pencil-simple" style={{ fontSize: 16 }} /></button>
                  <button className="btn btn-secondary btn-icon b34 is-danger" title="Eliminar" onClick={() => open({ type: "confirm", title: "Eliminar visita", body: `Se eliminará la visita de ${v.clientName}.`, ok: "Eliminar", onOk: () => run(() => deleteVisit(v.id), "Visita eliminada") })}><i className="ph ph-trash" style={{ fontSize: 16 }} /></button>
                </div>
              </div>
            );
          })}
          {!list.length && <div className="table-empty muted-14">No hay visitas con este filtro.</div>}
        </div>
      )}
    </div>
  );
}

export default function VisitsPage() {
  return <Suspense><VisitsView /></Suspense>;
}
