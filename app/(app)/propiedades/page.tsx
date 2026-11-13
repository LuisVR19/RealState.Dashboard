"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { deleteProperty, duplicateProperty } from "@/app/actions/properties";
import { usePanel } from "@/components/panel-provider";
import { CountTab, PageHead, SearchInput, StatusTag } from "@/components/ui";
import { ago } from "@/lib/dates";
import { CATEGORIES, CATEGORY_LABEL, isClosed, itemNoun, OP_LABEL, placeLine, priceMain, pricePeriod, PROPERTY_STATUS_STYLE, vehicleName } from "@/lib/format";
import type { Category, Operation, Property, PropertyStatus } from "@/lib/types";

type Tab = "Todas" | "Publicada" | "Borrador" | "Pausada" | "Cerrada";
const TABS: [Tab, string][] = [["Todas", "Todas"], ["Publicada", "Publicadas"], ["Borrador", "Borradores"], ["Pausada", "Pausadas"], ["Cerrada", "Cerradas"]];
const inTab = (s: PropertyStatus, t: Tab) => t === "Todas" || (t === "Cerrada" ? isClosed(s) : s === t);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function PropertiesView() {
  const { properties, visits, team, isAdmin, today, agentName, open, run } = usePanel();
  const router = useRouter();
  const initial = useSearchParams().get("estado");
  // Todo el inventario del usuario ya está cargado: los filtros se aplican en el navegador.
  const [status, setStatus] = useState<Tab>(TABS.some(([k]) => k === initial) ? (initial as Tab) : "Todas");
  const [q, setQ] = useState("");
  const [op, setOp] = useState<Operation | "Todas">("Todas");
  const [cat, setCat] = useState<Category | "Todas">("Todas");
  const [agent, setAgent] = useState("Todos");
  const nq = norm(q.trim());
  const filtered = properties.filter(
    (p) =>
      (cat === "Todas" || p.category === cat) &&
      (op === "Todas" || p.operation === op) &&
      (agent === "Todos" || p.agentId === agent) &&
      (!nq || norm(`${p.title} ${p.zone} ${p.canton} ${p.province} ${p.country} ${p.code} ${p.type} ${vehicleName(p)}`).includes(nq)),
  );
  const count = (k: Tab) => filtered.filter((p) => inTab(p.status, k)).length;
  const list = filtered.filter((p) => inTab(p.status, status));
  const duplicate = async (p: Property) => {
    const res = await run(() => duplicateProperty(p.id));
    if (res.ok) router.push(`/propiedades/${res.data.code}`);
  };
  const upcoming = (p: Property) => visits.filter((v) => v.propertyId === p.id && v.date >= today && v.status !== "Cancelada" && v.status !== "Realizada").length;
  const edit = (p: Property) => router.push(`/propiedades/${p.code}`);

  return (
    <div className="stack-18">
      <PageHead
        title="Inventario"
        sub={isAdmin ? "Inmuebles, vehículos y servicios de todo el equipo." : "Inmuebles, vehículos y servicios a tu cargo."}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/propiedades/nueva?categoria=servicio" className="btn btn-secondary h40"><i className="ph ph-handshake" style={{ fontSize: 16 }} />Nuevo servicio</Link>
            <Link href="/propiedades/nueva?categoria=vehiculo" className="btn btn-secondary h40"><i className="ph ph-car-profile" style={{ fontSize: 16 }} />Nuevo vehículo</Link>
            <Link href="/propiedades/nueva" className="btn btn-primary h40"><i className="ph ph-plus" style={{ fontSize: 16 }} />Nueva propiedad</Link>
          </div>
        }
      />
      <div className="filters">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por título, marca, zona o código" />
        <div className="tabs-scroll">{TABS.map(([k, l]) => <CountTab key={k} label={l} count={count(k)} on={status === k} onClick={() => setStatus(k)} />)}</div>
        <select className="input select-sm" value={cat} onChange={(e) => setCat(e.target.value as Category | "Todas")} aria-label="Categoría">
          <option value="Todas">Todas las categorías</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select className="input select-sm" value={op} onChange={(e) => setOp(e.target.value as Operation | "Todas")} aria-label="Operación">
          <option value="Todas">Todas las operaciones</option>{Object.entries(OP_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {isAdmin && <select className="input select-sm" value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="Asesor"><option value="Todos">Todos los asesores</option>{team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
      </div>
      <div className="table">
        <div className="table-head">
          <span style={{ flex: "1 1 280px" }}>Anuncio</span><span className="w130">Operación</span><span className="w140">Precio</span><span className="w100">Estado</span>
          {isAdmin && <span className="w130">Asesor</span>}<span className="w90">Actualizada</span><span className="w188" />
        </div>
        {list.map((p) => {
          const n = upcoming(p);
          return (
            <div key={p.id} className="table-row is-hover">
              <div className="prop-cell" onClick={() => edit(p)}>
                <div className="thumb" style={{ width: 72, height: 54 }}>{p.images[0] && <img src={p.images[0]} alt="" />}</div>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{p.title}</span><span className="muted-12">{p.code} · {placeLine(p)}</span></div>
              </div>
              <span className="w130 cell-13">{OP_LABEL[p.operation]} · {p.type}</span>
              <span className="w140" style={{ fontSize: 14, fontWeight: 500 }}>{priceMain(p)}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--color-neutral-500)" }}>{pricePeriod(p) && " " + pricePeriod(p)}</span></span>
              <span className="w100"><StatusTag style={PROPERTY_STATUS_STYLE[p.status]}>{p.status}</StatusTag></span>
              {isAdmin && <span className="w130 cell-13 ellipsis">{agentName(p.agentId)}</span>}
              <span className="w90" style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{ago(p.updatedAt)}</span>
              <div className="w188 row-actions">
                <Link href={`/visitas?vista=calendario&propiedad=${p.id}`} className="btn btn-secondary btn-icon b34" aria-label="Agenda de visitas" title="Agenda de visitas" style={{ position: "relative" }}>
                  <i className="ph ph-calendar-dots" style={{ fontSize: 16 }} />{n > 0 && <span className="mini-badge">{n}</span>}
                </Link>
                <button className="btn btn-secondary btn-icon b34" onClick={() => edit(p)} aria-label="Editar" title="Editar"><i className="ph ph-pencil-simple" style={{ fontSize: 16 }} /></button>
                <button className="btn btn-secondary btn-icon b34" onClick={() => open({ type: "share", property: p })} disabled={p.status !== "Publicada"} aria-label="Compartir" title={p.status === "Publicada" ? "Compartir enlace" : "Solo las publicadas tienen enlace público"}><i className="ph ph-share-network" style={{ fontSize: 16 }} /></button>
                <button className="btn btn-secondary btn-icon b34" onClick={() => duplicate(p)} aria-label="Duplicar" title="Duplicar"><i className="ph ph-copy" style={{ fontSize: 16 }} /></button>
                <button className="btn btn-secondary btn-icon b34 is-danger" aria-label="Eliminar" title="Eliminar"
                  onClick={() => open({ type: "confirm", title: `Eliminar ${itemNoun(p.category)}`, body: `Se eliminará “${p.title}” (${p.code}) del sitio y sus visitas quedarán sin anuncio. Esta acción no se puede deshacer.`, ok: "Eliminar", onOk: () => run(() => deleteProperty(p.id), "Anuncio eliminado") })}>
                  <i className="ph ph-trash" style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          );
        })}
        {!list.length && <div className="table-empty"><span style={{ fontSize: 16, fontWeight: 500 }}>Sin resultados</span><span className="muted-13">Ajusta los filtros o crea un anuncio nuevo.</span></div>}
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  return <Suspense><PropertiesView /></Suspense>;
}
