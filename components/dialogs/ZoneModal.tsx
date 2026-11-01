"use client";

import { useState, useTransition } from "react";
import { saveZone } from "@/app/actions/zones";
import { CANTONS } from "@/lib/format";
import type { Canton, FeaturedZone } from "@/lib/types";
import { uploadImage } from "@/lib/upload";
import { DialogShell } from "../ui";
import { usePanel } from "../panel-provider";

/** Crear o editar una zona destacada (`featured_zones`; la imagen va al bucket zone-images o es una URL). */
export function ZoneModal({ zone: z }: { zone?: FeaturedZone }) {
  const { close, run, flash } = usePanel();
  const [label, setLabel] = useState(z?.label ?? "");
  const [name, setName] = useState<Canton>(z?.name ?? CANTONS[0]);
  const [url, setUrl] = useState(z?.imageUrl ?? "");
  const [busy, startBusy] = useTransition();

  const upload = (file: File | undefined) =>
    file &&
    startBusy(async () => {
      try {
        setUrl(await uploadImage("zone-images", "zones", file));
      } catch (e) {
        flash((e as Error).message, "error");
      }
    });
  const save = () =>
    startBusy(async () => {
      const res = await run(() => saveZone(z?.id ?? null, { label, name, imageUrl: url }), z ? "Zona actualizada" : "Zona creada");
      if (res.ok) close();
    });

  return (
    <DialogShell title={z ? "Editar zona" : "Nueva zona"} onClose={close}
      footer={<div className="dialog-actions"><button className="btn btn-secondary" onClick={close} style={{ height: 40 }}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={busy} style={{ height: 40 }}>{busy ? "Guardando…" : z ? "Guardar cambios" : "Crear zona"}</button></div>}>
      <div className="form-grid">
        <div className="field"><label htmlFor="zm-label">Nombre visible *</label><input id="zm-label" className="input h40" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder="Cachí y Ujarrás" /></div>
        <div className="field"><label htmlFor="zm-name">Cantón que filtra *</label><select id="zm-name" className="input h40" value={name} onChange={(e) => setName(e.target.value as Canton)}>{CANTONS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="zm-url">Imagen *</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="zm-url" className="input h40" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… o sube un archivo" />
            <label className="btn btn-secondary h40" style={{ flex: "none" }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
              <i className="ph ph-upload-simple" style={{ fontSize: 16 }} />Subir
            </label>
          </div>
        </div>
        {/^https:\/\//.test(url) && <div className="zone-preview"><img src={url} alt="" /></div>}
      </div>
    </DialogShell>
  );
}
