"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { usePanel } from "@/components/panel-provider";
import { CountTab, PageHead, SearchInput, StatusTag } from "@/components/ui";
import { ago } from "@/lib/dates";
import { CLIENT_STATUS_STYLE, CLIENT_STATUSES, initialsOf, prefShort } from "@/lib/format";
import type { ClientStatus } from "@/lib/types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function ClientsView() {
  const { clients, matches, visits, team, isAdmin, me, agentName, open, openClient } = usePanel();
  const sp = useSearchParams();
  const [status, setStatus] = useState<ClientStatus | "Todos">((sp.get("estado") as ClientStatus) ?? "Todos");
  const [agent, setAgent] = useState(sp.get("asesor") ?? "Todos");
  const [q, setQ] = useState("");
  const nq = norm(q.trim());
  const byAgent = clients.filter((c) => (agent === "Todos" || (agent === "none" ? !c.assignedAgentId : c.assignedAgentId === agent)) && (!nq || norm(`${c.name} ${c.email} ${c.phone}`).includes(nq)));
  const list = status === "Todos" ? byAgent : byAgent.filter((c) => c.status === status);
  const count = (k: ClientStatus | "Todos") => (k === "Todos" ? byAgent.length : byAgent.filter((c) => c.status === k).length);

  return (
    <div className="stack-18">
      <PageHead title="Clientes" sub={isAdmin ? "Todos los clientes registrados en el sitio o agregados por el equipo." : "Tus clientes y los nuevos que aún no tienen asesor."}
        action={<button className="btn btn-primary h40" onClick={() => open({ type: "client" })}><i className="ph ph-user-plus" style={{ fontSize: 16 }} />Nuevo cliente</button>} />
      <div className="filters">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar nombre, correo o teléfono" maxWidth={340} />
        <div className="tabs-scroll">{(["Todos", ...CLIENT_STATUSES] as const).map((k) => <CountTab key={k} label={k} count={count(k)} on={status === k} onClick={() => setStatus(k)} />)}</div>
        <select className="input select-sm" value={agent} onChange={(e) => setAgent(e.target.value)}>
          <option value="Todos">Todos los asesores</option><option value="none">Sin asignar</option>
          {isAdmin ? team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>) : <option value={me.id}>Mis clientes</option>}
        </select>
      </div>
      <div className="table">
        <div className="table-head">
          <span style={{ flex: "1 1 230px" }}>Cliente</span><span style={{ flex: "1 1 260px" }}>Busca</span><span className="w100">Matches</span><span className="w70">Visitas</span><span className="w130">Asesor</span><span className="w120">Estado</span><span className="w70">Alta</span>
        </div>
        {list.map((c) => {
          const n = matches.filter((m) => m.client.id === c.id).length;
          return (
            <div key={c.id} className="table-row is-hover is-clickable" onClick={() => openClient(c.id)}>
              <div style={{ flex: "1 1 230px", minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                <span className="avatar avatar-38 is-neutral">{initialsOf(c.name)}</span>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span><span className="muted-12 ellipsis">{c.email || "Sin correo"} · {c.phone || "Sin teléfono"}</span></div>
              </div>
              <span className="cell-13" style={{ flex: "1 1 260px", minWidth: 0, lineHeight: 1.4 }}>{prefShort(c.preferences)}</span>
              <span className="w100"><StatusTag style={n ? ["var(--color-accent-900)", "var(--color-accent-200)"] : ["var(--color-neutral-900)", "var(--color-neutral-500)"]}>{n} {n === 1 ? "match" : "matches"}</StatusTag></span>
              <span className="w70 cell-13">{visits.filter((v) => v.clientId === c.id).length}</span>
              <span className="w130 ellipsis" style={{ fontSize: 13, color: c.assignedAgentId ? "var(--color-neutral-300)" : "#7a5a12" }}>{agentName(c.assignedAgentId)}</span>
              <span className="w120"><StatusTag style={CLIENT_STATUS_STYLE[c.status]}>{c.status}</StatusTag></span>
              <span className="w70" style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{ago(c.createdAt)}</span>
            </div>
          );
        })}
        {!list.length && <div className="table-empty muted-14">No hay clientes con este filtro.</div>}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return <Suspense><ClientsView /></Suspense>;
}
