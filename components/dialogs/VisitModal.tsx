"use client";

import { useState, useTransition } from "react";
import { saveVisit } from "@/app/actions/visits";
import { VISIT_TIMES } from "@/lib/dates";
import { VISIT_STATUSES } from "@/lib/format";
import type { Visit, VisitMode, VisitStatus } from "@/lib/types";
import { DialogShell } from "../ui";
import { usePanel } from "../panel-provider";

/** Crear o editar una visita (insert/update en `visits`; la RLS valida que le corresponda al asesor). */
export function VisitModal({ visit, prefill }: { visit?: Visit; prefill?: Partial<Visit> }) {
  const { close, run, clients, properties, catalog, team, isAdmin, me, today } = usePanel();
  const init: Partial<Visit> = { date: today, time: "10:00", mode: "Presencial", status: "Confirmada", agentId: me.id, propertyId: properties[0]?.id ?? null, ...prefill, ...visit };
  const [f, setF] = useState({
    clientId: init.clientId ?? "",
    clientName: init.clientName ?? "",
    clientPhone: init.clientPhone ?? "",
    propertyId: init.propertyId ?? "",
    date: init.date ?? today,
    time: init.time ?? "10:00",
    mode: (init.mode ?? "Presencial") as VisitMode,
    status: (init.status ?? "Confirmada") as VisitStatus,
    agentId: init.agentId ?? me.id,
    notes: init.notes ?? "",
  });
  const [saving, startSaving] = useTransition();
  const set = (o: Partial<typeof f>) => setF((x) => ({ ...x, ...o }));
  const full = "1 / -1";
  // Opciones de propiedad: las del usuario, más la de la visita si es de otro asesor.
  const current = f.propertyId ? catalog.find((p) => p.id === f.propertyId) : undefined;
  const propOptions = current && !properties.some((p) => p.id === current.id) ? [current, ...properties] : properties;
  const times = VISIT_TIMES.includes(f.time) ? VISIT_TIMES : [f.time, ...VISIT_TIMES];

  const pickClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    set(c ? { clientId: id, clientName: c.name, clientPhone: c.phone } : { clientId: "" });
  };
  const save = () =>
    startSaving(async () => {
      const res = await run(() => saveVisit(visit?.id ?? null, { ...f, clientId: f.clientId || null, propertyId: f.propertyId || null }), visit ? "Visita actualizada" : "Visita agendada");
      if (res.ok) close();
    });

  return (
    <DialogShell title={visit ? "Editar visita" : "Nueva visita"} onClose={close}
      footer={<div className="dialog-actions"><button className="btn btn-secondary" onClick={close} style={{ height: 40 }}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving} style={{ height: 40 }}>{saving ? "Guardando…" : visit ? "Guardar cambios" : "Agendar visita"}</button></div>}>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: full }}><label htmlFor="vm-client">Cliente registrado</label>
          <select id="vm-client" className="input h40" value={f.clientId} onChange={(e) => pickClient(e.target.value)}><option value="">— Cliente no registrado —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? " · " + c.phone : ""}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="vm-name">Cliente *</label><input id="vm-name" className="input h40" value={f.clientName} maxLength={120} onChange={(e) => set({ clientName: e.target.value })} /></div>
        <div className="field"><label htmlFor="vm-phone">WhatsApp *</label><input id="vm-phone" className="input h40" inputMode="tel" value={f.clientPhone} onChange={(e) => set({ clientPhone: e.target.value })} placeholder="8888 8888" /></div>
        <div className="field" style={{ gridColumn: full }}><label htmlFor="vm-prop">Propiedad</label>
          <select id="vm-prop" className="input h40" value={f.propertyId} onChange={(e) => set({ propertyId: e.target.value })}><option value="">— Reunión con asesor (sin propiedad) —</option>{propOptions.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="vm-date">Fecha</label><input id="vm-date" className="input h40" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></div>
        <div className="field"><label htmlFor="vm-time">Hora</label><select id="vm-time" className="input h40" value={f.time} onChange={(e) => set({ time: e.target.value })}>{times.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="vm-mode">Modalidad</label><select id="vm-mode" className="input h40" value={f.mode} onChange={(e) => set({ mode: e.target.value as VisitMode })}><option>Presencial</option><option>Videollamada</option></select></div>
        <div className="field"><label htmlFor="vm-status">Estado</label><select id="vm-status" className="input h40" value={f.status} onChange={(e) => set({ status: e.target.value as VisitStatus })}>{VISIT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        {isAdmin && (
          <div className="field" style={{ gridColumn: full }}><label htmlFor="vm-agent">Asesor</label>
            <select id="vm-agent" className="input h40" value={f.agentId} onChange={(e) => set({ agentId: e.target.value })}>{team.filter((u) => u.active || u.id === f.agentId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          </div>
        )}
        <div className="field" style={{ gridColumn: full }}><label htmlFor="vm-notes">Notas</label><textarea id="vm-notes" className="input" value={f.notes} maxLength={1000} onChange={(e) => set({ notes: e.target.value })} style={{ minHeight: 80 }} /></div>
      </div>
    </DialogShell>
  );
}
