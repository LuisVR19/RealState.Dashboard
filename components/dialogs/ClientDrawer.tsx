"use client";

import { useState, useTransition } from "react";
import { addClientNote, assignClient, assignClientToMe, deleteClient, deleteClientNote, dismissMatch, setClientStatus } from "@/app/actions/clients";
import { ago, dayParts } from "@/lib/dates";
import { CLIENT_STATUSES, crc, initialsOf, firstName, matchWhy, prefChips, pricePeriod, scoreStyle, VISIT_STATUS_STYLE, waNumber } from "@/lib/format";
import type { Client } from "@/lib/types";
import { DateBadge, StatusTag, Thumb } from "../ui";
import { usePanel } from "../panel-provider";

/** Ficha lateral del cliente: datos, preferencias, matches, visitas y notas internas. */
export function ClientDrawer({ client: c }: { client: Client }) {
  const { openClient, open, run, matches, visits, isAdmin, team, me, agentName, propertyTitle } = usePanel();
  const [note, setNote] = useState("");
  const [busy, startBusy] = useTransition();
  const close = () => openClient(null);
  const mine = matches.filter((m) => m.client.id === c.id);
  const cVisits = visits.filter((v) => v.clientId === c.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const hasVisit = (pid: string) => visits.some((v) => v.clientId === c.id && v.propertyId === pid && v.status !== "Cancelada");
  const sub = `${c.status} · ${c.assignedAgentId ? agentName(c.assignedAgentId) : "Sin asesor"}${c.hasAccount ? " · Cuenta en el sitio" : ""}`;
  const act = (fn: () => Promise<unknown>) => startBusy(async () => void (await fn()));

  const addNote = () =>
    act(async () => {
      const res = await run(() => addClientNote(c.id, note), "Nota guardada");
      if (res.ok) setNote("");
    });
  const remove = () =>
    c.hasAccount
      ? open({ type: "confirm", title: "No se puede eliminar", body: `${c.name} tiene cuenta en el sitio. Márcalo como Inactivo para sacarlo de los matches.`, ok: "Entendido" })
      : open({ type: "confirm", title: "Eliminar cliente", body: `Se eliminará la ficha de ${c.name} con sus preferencias y notas. Sus visitas se conservan con su nombre y teléfono.`, ok: "Eliminar",
          onOk: () => act(async () => { if ((await run(() => deleteClient(c.id), "Cliente eliminado")).ok) close(); }) });

  return (
    <div className="drawer z-drawer">
      <div className="drawer-shade" onClick={close} />
      <aside className="drawer-panel client-drawer" aria-busy={busy}>
        <div className="client-drawer-head">
          <span className="avatar avatar-44">{initialsOf(c.name)}</span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 17, fontWeight: 500 }}>{c.name}</span><span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{sub}</span></div>
          {c.phone && <a className="btn btn-secondary btn-icon" href={waNumber(c.phone)} target="_blank" rel="noopener" title="WhatsApp"><i className="ph ph-whatsapp-logo" style={{ fontSize: 17 }} /></a>}
          <button className="btn btn-secondary btn-icon" onClick={close} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button>
        </div>
        <div className="client-drawer-body">
          <section className="card form-grid">
            <div className="kv"><span>Correo</span><span style={{ wordBreak: "break-all" }}>{c.email || "Sin correo"}</span></div>
            <div className="kv"><span>WhatsApp</span><span>{c.phone || "Sin teléfono"}</span></div>
            <div className="field"><label htmlFor="cd-agent">Asesor</label>
              {isAdmin ? (
                <select id="cd-agent" className="input h38" value={c.assignedAgentId ?? ""} disabled={busy}
                  onChange={(e) => act(() => run(() => assignClient(c.id, e.target.value || null), e.target.value ? `Asignado a ${agentName(e.target.value)}` : "Cliente sin asesor"))}>
                  <option value="">Sin asignar</option>{team.filter((u) => u.active || u.id === c.assignedAgentId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38 }}>
                  <span style={{ fontSize: 14, flex: 1 }}>{agentName(c.assignedAgentId)}</span>
                  {!c.assignedAgentId && <button className="btn btn-primary" disabled={busy} onClick={() => act(() => run(() => assignClientToMe(c.id), `Cliente asignado a ${me.firstName}`))} style={{ height: 34, fontSize: 13 }}>Asignarme</button>}
                </div>
              )}
            </div>
            <div className="field"><label htmlFor="cd-status">Estado</label>
              <select id="cd-status" className="input h38" value={c.status} disabled={busy} onChange={(e) => act(() => run(() => setClientStatus(c.id, e.target.value), "Estado actualizado"))}>{CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </section>

          <section className="card stack-10">
            <div className="row-between"><h2 className="h2-16">Preferencias</h2><button className="btn btn-ghost" onClick={() => open({ type: "client", client: c })} style={{ fontSize: 13 }}><i className="ph ph-pencil-simple" style={{ fontSize: 14 }} />Editar</button></div>
            <div className="chip-row">{prefChips(c.preferences).map((l) => <span key={l} className="pref-chip">{l}</span>)}</div>
            {c.preferences.notes && <p className="muted-13" style={{ margin: 0, textWrap: "pretty" }}>“{c.preferences.notes}”</p>}
          </section>

          <section className="card stack-2">
            <h2 className="h2-16" style={{ marginBottom: 6 }}>Propiedades que coinciden <span style={{ color: "var(--color-neutral-500)", fontWeight: 400 }}>({mine.length})</span></h2>
            {mine.map(({ property: p, score }) => (
              <div key={p.id} className="drawer-match">
                <Thumb src={p.images[0]} w={72} h={56} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{p.title}</span>
                  <span className="muted-12">{p.code} · {p.zone}, {p.canton} · {crc(p.price)}{pricePeriod(p)}</span>
                  <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{matchWhy(p, c.preferences)}</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {hasVisit(p.id) ? <StatusTag style={["var(--color-accent-900)", "var(--color-accent-200)"]} extra={{ alignSelf: "center" }}>Visita agendada</StatusTag> : (
                      <button className="btn btn-secondary h32" onClick={() => open({ type: "visit", prefill: { clientId: c.id, clientName: c.name, clientPhone: c.phone, propertyId: p.id, agentId: p.agentId } })}><i className="ph ph-calendar-plus" style={{ fontSize: 15 }} />Agendar visita</button>
                    )}
                    {c.phone && <a className="btn btn-secondary h32" href={waNumber(c.phone, `Hola ${firstName(c.name)}, le escribe ${me.firstName} de Thomas Mata S.A. Según lo que nos contó que busca, le puede interesar "${p.title}" (${p.code}) por ${crc(p.price)}. ¿Le gustaría agendar una visita?`)} target="_blank" rel="noopener"><i className="ph ph-whatsapp-logo" style={{ fontSize: 15 }} />Enviar</a>}
                    <button className="btn btn-ghost h32" disabled={busy} onClick={() => act(() => run(() => dismissMatch(c.id, p.id), "Match descartado"))}>Descartar</button>
                  </div>
                </div>
                <span className="score-pill" style={{ background: scoreStyle(score)[0], color: scoreStyle(score)[1] }}>{score}%</span>
              </div>
            ))}
            {!mine.length && <span className="muted-13" style={{ padding: "6px 0" }}>{c.status === "Cerrado" || c.status === "Inactivo" ? `Los clientes en estado ${c.status.toLowerCase()} no reciben matches.` : "Ninguna propiedad publicada coincide por ahora."}</span>}
          </section>

          <section className="card stack-2">
            <div className="row-between" style={{ marginBottom: 6 }}><h2 className="h2-16">Visitas</h2><button className="btn btn-secondary h34" onClick={() => open({ type: "visit", prefill: { clientId: c.id, clientName: c.name, clientPhone: c.phone } })}><i className="ph ph-calendar-plus" style={{ fontSize: 15 }} />Agendar</button></div>
            {cVisits.map((v) => (
              <div key={v.id} className="list-row is-clickable" onClick={() => open({ type: "visit", visit: v })}>
                <DateBadge {...dayParts(v.date)} size="sm" />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{propertyTitle(v.propertyId)}</span><span className="muted-12">{v.time} · {v.mode} · {agentName(v.agentId)}</span></div>
                <StatusTag style={VISIT_STATUS_STYLE[v.status]}>{v.status}</StatusTag>
              </div>
            ))}
            {!cVisits.length && <span className="muted-13" style={{ padding: "6px 0" }}>Sin visitas registradas.</span>}
          </section>

          <section className="card stack-10">
            <h2 className="h2-16">Notas internas <span style={{ color: "var(--color-neutral-500)", fontWeight: 400, fontSize: 12 }}>· solo el equipo las ve</span></h2>
            {c.notes.map((n) => (
              <div key={n.id} style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom: "1px solid var(--color-neutral-800)" }}>
                <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap", textWrap: "pretty" }}>{n.body}</p>
                <div className="row-between">
                  <span className="muted-12">{agentName(n.agentId)} · {ago(n.createdAt)}</span>
                  {(isAdmin || n.agentId === me.id) && <button className="btn btn-ghost" disabled={busy} style={{ fontSize: 12, height: 26 }} onClick={() => act(() => run(() => deleteClientNote(n.id), "Nota eliminada"))}>Eliminar</button>}
                </div>
              </div>
            ))}
            <textarea className="input" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Escribe una nota para el equipo…" aria-label="Nueva nota interna" style={{ minHeight: 80 }} />
            <div className="row-between">
              {isAdmin && <button className="btn btn-ghost" style={{ fontSize: 13, color: "#8a2f24" }} onClick={remove}><i className="ph ph-trash" style={{ fontSize: 14 }} />Eliminar cliente</button>}
              <button className="btn btn-secondary" onClick={addNote} disabled={busy || !note.trim()} style={{ height: 36, marginLeft: "auto" }}>Agregar nota</button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
