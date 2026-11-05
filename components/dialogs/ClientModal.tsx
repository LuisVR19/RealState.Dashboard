"use client";

import { useState, useTransition } from "react";
import { saveClient } from "@/app/actions/clients";
import { CLIENT_STATUSES, dots, OP_LABEL, TYPES } from "@/lib/format";
import { PlacePicker } from "../PlacePicker";
import type { Amenity, Canton, Client, ClientStatus, Operation, PropertyType } from "@/lib/types";
import { Chip, toggle } from "../Chip";
import { DialogShell } from "../ui";
import { usePanel } from "../panel-provider";

type Op = Operation | "Todas";
const toAmount = (s: string) => Number(s.replace(/\D/g, "")) || null;

/** Crear o editar un cliente y lo que busca (rpc save_client: cliente + preferencias en una transacción). */
export function ClientModal({ client: c }: { client?: Client }) {
  const { close, run, team, isAdmin, amenities, openClient, places } = usePanel();
  const p = c?.preferences;
  const [name, setName] = useState(c?.name ?? "");
  const [email, setEmail] = useState(c?.email ?? "");
  const [phone, setPhone] = useState(c?.phone ?? "");
  const [agentId, setAgentId] = useState(c?.assignedAgentId ?? "");
  const [status, setStatus] = useState<ClientStatus>(c?.status ?? "Nuevo");
  const [op, setOp] = useState<Op>(p?.operation ?? "Venta");
  const [types, setTypes] = useState<PropertyType[]>(p?.propertyTypes ?? []);
  const [cantons, setCantons] = useState<Canton[]>(p?.cantons ?? []);
  const [min, setMin] = useState(p?.budgetMin ? dots(p.budgetMin) : "");
  const [max, setMax] = useState(p?.budgetMax ? dots(p.budgetMax) : "");
  const [beds, setBeds] = useState(p?.minBedrooms ?? 0);
  const [baths, setBaths] = useState(p?.minBathrooms ?? 0);
  const [amen, setAmen] = useState<Amenity[]>(p?.requiredAmenities ?? []);
  const [notes, setNotes] = useState(p?.notes ?? "");
  const [saving, startSaving] = useTransition();

  const save = () =>
    startSaving(async () => {
      const res = await run(
        () =>
          saveClient(c?.id ?? null, {
            name, email, phone, status,
            assignedAgentId: agentId || null,
            operation: op, propertyTypes: types, cantons,
            budgetMin: toAmount(min), budgetMax: toAmount(max),
            minBedrooms: beds, minBathrooms: baths,
            amenityIds: amenities.filter((a) => amen.includes(a.name)).map((a) => a.id),
            notes,
          }),
        c ? "Cliente actualizado" : "Cliente creado",
      );
      if (res.ok) {
        close();
        if (!c) openClient(res.data.id);
      }
    });
  const fmt = (s: string, setter: (x: string) => void) => () => setter(toAmount(s) ? dots(toAmount(s)!) : "");

  return (
    <DialogShell title={c ? "Editar cliente" : "Nuevo cliente"} onClose={close}
      footer={<div className="dialog-actions"><button className="btn btn-secondary" onClick={close} style={{ height: 40 }}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving} style={{ height: 40 }}>{saving ? "Guardando…" : c ? "Guardar cambios" : "Crear cliente"}</button></div>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="cm-name">Nombre *</label><input id="cm-name" className="input h40" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="cm-email">Correo</label>
            <input id="cm-email" className="input h40" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} disabled={c?.hasAccount} title={c?.hasAccount ? "Es el usuario de su cuenta en el sitio: solo el cliente puede cambiarlo." : undefined} />
          </div>
          <div className="field"><label htmlFor="cm-phone">WhatsApp</label><input id="cm-phone" className="input h40" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8888 8888" /></div>
          {isAdmin && (
            <div className="field"><label htmlFor="cm-agent">Asesor</label>
              <select id="cm-agent" className="input h40" value={agentId} onChange={(e) => setAgentId(e.target.value)}><option value="">Sin asignar</option>{team.filter((u) => u.active || u.id === agentId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
            </div>
          )}
          <div className="field"><label htmlFor="cm-status">Estado</label><select id="cm-status" className="input h40" value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>{CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="divider-top" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Qué busca</span>
          <div className="chip-group"><span className="muted-12">Operación</span>
            <div className="chip-row">{(["Venta", "Alquiler", "Vacacional", "Preventa", "Todas"] as Op[]).map((k) => <Chip key={k} size="sm" label={k === "Todas" ? "Cualquiera" : OP_LABEL[k]} on={op === k} onClick={() => setOp(k)} />)}</div>
          </div>
          <div className="chip-group"><span className="muted-12">Tipo</span>
            <div className="chip-row">{TYPES.map((t) => <Chip key={t} size="sm" label={t} on={types.includes(t)} onClick={() => setTypes(toggle(types, t))} />)}</div>
          </div>
          <div className="chip-group"><span className="muted-12">Ubicaciones (ciudad o cantón)</span>
            <PlacePicker value={cantons} onChange={setCantons} suggestions={places.cantons} />
          </div>
          <div className="form-grid form-grid-120">
            <div className="field"><label htmlFor="cm-min">Presupuesto mín. (₡)</label><input id="cm-min" className="input h40" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} onBlur={fmt(min, setMin)} placeholder="0" /></div>
            <div className="field"><label htmlFor="cm-max">Presupuesto máx. (₡)</label><input id="cm-max" className="input h40" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} onBlur={fmt(max, setMax)} placeholder="Sin tope" /></div>
            <div className="field"><label htmlFor="cm-beds">Habitaciones</label><select id="cm-beds" className="input h40" value={beds} onChange={(e) => setBeds(Number(e.target.value))}>{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n ? n + "+" : "Cualquiera"}</option>)}</select></div>
            <div className="field"><label htmlFor="cm-baths">Baños</label><select id="cm-baths" className="input h40" value={baths} onChange={(e) => setBaths(Number(e.target.value))}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n ? n + "+" : "Cualquiera"}</option>)}</select></div>
          </div>
          <div className="chip-group"><span className="muted-12">Imprescindibles</span>
            <div className="chip-row">{amenities.map((a) => <Chip key={a.id} size="sm" label={a.name} on={amen.includes(a.name)} onClick={() => setAmen(toggle(amen, a.name))} />)}</div>
          </div>
          <div className="field"><label htmlFor="cm-notes">Comentarios del cliente</label><textarea id="cm-notes" className="input" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 70 }} /></div>
        </div>
      </div>
    </DialogShell>
  );
}
