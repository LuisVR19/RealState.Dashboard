"use client";

import { useState } from "react";
import { dismissMatch } from "@/app/actions/clients";
import { usePanel } from "@/components/panel-provider";
import { CountTab, PageHead, StatusTag, Thumb } from "@/components/ui";
import { crc, firstName, matchWhy, prefShort, pricePeriod, scoreStyle, waNumber } from "@/lib/format";

export default function MatchesPage() {
  const { matches, visits, me, open, openClient, run } = usePanel();
  const [min, setMin] = useState(60);
  const [prop, setProp] = useState("Todas");
  const [hide, setHide] = useState(false);
  const hasVisit = (cid: string, pid: string) => visits.some((v) => v.clientId === cid && v.propertyId === pid && v.status !== "Cancelada");
  const base = matches.filter((m) => (prop === "Todas" || m.property.id === prop) && (!hide || !hasVisit(m.client.id, m.property.id)));
  const rows = base.filter((m) => m.score >= min);
  // Propiedades con al menos un match (pueden ser de otros asesores: el match es del cliente).
  const published = [...new Map(matches.map((m) => [m.property.id, m.property])).values()].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="stack-18">
      <PageHead title="Matches" sub="Propiedades publicadas que coinciden con las preferencias de cada cliente." />
      <div className="filters">
        <div style={{ display: "flex", gap: 6 }}>{([[60, "Todos"], [75, "75% o más"], [90, "90% o más"]] as const).map(([n, l]) => <CountTab key={n} label={l} count={base.filter((m) => m.score >= n).length} on={min === n} onClick={() => setMin(n)} />)}</div>
        <select className="input select-sm" value={prop} onChange={(e) => setProp(e.target.value)} style={{ maxWidth: 280 }}>
          <option value="Todas">Todas las propiedades</option>{published.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
        </select>
        <label className="check-label" style={{ color: "var(--color-text)", padding: "0 4px" }}><input type="checkbox" checked={hide} onChange={() => setHide(!hide)} />Ocultar los que ya tienen visita</label>
      </div>
      <div className="table">
        {rows.map(({ client: c, property: p, score }) => {
          const [sb, sf] = scoreStyle(score), hv = hasVisit(c.id, p.id);
          return (
            <div key={c.id + p.id} className="table-row match-row">
              <span className="score-circle" style={{ background: sb, color: sf }}>{score}%</span>
              <button className="match-client" onClick={() => openClient(c.id)}><span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span><span className="muted-12" style={{ lineHeight: 1.35 }}>{prefShort(c.preferences)}</span></button>
              <i className="ph ph-arrows-left-right" style={{ fontSize: 16, color: "var(--color-neutral-500)" }} />
              <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                <Thumb src={p.images[0]} w={64} h={48} />
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{p.title}</span>
                  <span className="muted-12">{p.code} · {crc(p.price)}{pricePeriod(p)}</span>
                  <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{matchWhy(p, c.preferences)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {hv ? <StatusTag style={["var(--color-accent-900)", "var(--color-accent-200)"]}>Visita agendada</StatusTag> : (
                  <button className="btn btn-secondary h34" style={{ fontSize: 13 }} onClick={() => open({ type: "visit", prefill: { clientId: c.id, clientName: c.name, clientPhone: c.phone, propertyId: p.id, agentId: p.agentId } })}><i className="ph ph-calendar-plus" style={{ fontSize: 15 }} />Agendar</button>
                )}
                {c.phone && <a className="btn btn-secondary btn-icon b34" href={waNumber(c.phone, `Hola ${firstName(c.name)}, le escribe ${me.firstName} de Thomas Mata S.A. Según lo que nos contó que busca, le puede interesar "${p.title}" (${p.code}) por ${crc(p.price)}. ¿Le gustaría agendar una visita?`)} target="_blank" rel="noopener" title="Enviar por WhatsApp"><i className="ph ph-whatsapp-logo" style={{ fontSize: 16 }} /></a>}
                <button className="btn btn-secondary btn-icon b34" onClick={() => run(() => dismissMatch(c.id, p.id), "Match descartado")} title="Descartar" aria-label="Descartar"><i className="ph ph-x" style={{ fontSize: 15 }} /></button>
              </div>
            </div>
          );
        })}
        {!rows.length && <div className="table-empty muted-14">No hay coincidencias con este filtro.</div>}
      </div>
    </div>
  );
}
