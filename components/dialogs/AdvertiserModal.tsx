"use client";

import { useState, useTransition } from "react";
import { saveAdvertiser } from "@/app/actions/ads";
import type { Advertiser } from "@/lib/ads";
import { uploadImage } from "@/lib/upload";
import { BrandLogo } from "../AdPreview";
import { usePanel } from "../panel-provider";
import { DialogShell, Toggle } from "../ui";

const SWATCHES = ["#1f4e46", "#1d3a5f", "#2f5b3a", "#6b3f22", "#7a2e46", "#5a4a1c", "#3d3a73", "#17191c"];

/** Crear o editar una marca anunciante (`advertisers`; el logo va al bucket ad-images o es una URL). */
export function AdvertiserModal({ advertiser: a, onClose }: { advertiser?: Advertiser; onClose: () => void }) {
  const { run, flash } = usePanel();
  const [name, setName] = useState(a?.name ?? "");
  const [contactName, setContactName] = useState(a?.contactName ?? "");
  const [email, setEmail] = useState(a?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(a?.whatsapp ?? "");
  const [website, setWebsite] = useState(a?.website ?? "");
  const [logoUrl, setLogoUrl] = useState(a?.logoUrl ?? "");
  const [color, setColor] = useState(a?.color ?? SWATCHES[0]);
  const [notes, setNotes] = useState(a?.notes ?? "");
  const [active, setActive] = useState(a?.active ?? true);
  const [busy, startBusy] = useTransition();

  const upload = (file: File | undefined) =>
    file &&
    startBusy(async () => {
      try {
        setLogoUrl(await uploadImage("ad-images", "logos", file));
      } catch (e) {
        flash((e as Error).message, "error");
      }
    });

  const save = () =>
    startBusy(async () => {
      const res = await run(() => saveAdvertiser(a?.id ?? null, { name, contactName, email, whatsapp, website, logoUrl, color, notes, active }), a ? "Marca actualizada" : "Marca creada");
      if (res.ok) onClose();
    });

  const validColor = /^#[0-9a-fA-F]{6}$/.test(color);

  return (
    <DialogShell title={a ? "Editar marca" : "Nueva marca"} onClose={onClose} width={600}
      footer={<div className="dialog-actions"><button className="btn btn-secondary" onClick={onClose} style={{ height: 40 }}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={busy || !name.trim()} style={{ height: 40 }}>{busy ? "Guardando…" : a ? "Guardar cambios" : "Crear marca"}</button></div>}>
      <div className="adm-brand-head">
        <BrandLogo brand={name || "Marca"} color={validColor ? color : SWATCHES[0]} logoUrl={/^https:\/\//.test(logoUrl) ? logoUrl : null} size={56} />
        <div className="field" style={{ flex: 1 }}><label htmlFor="am-name">Nombre de la marca *</label><input id="am-name" className="input h40" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Banco Horizonte" autoFocus /></div>
      </div>

      <div className="form-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="am-logo">Logo</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="am-logo" className="input h40" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://… o sube un archivo (cuadrado, JPG, PNG o WebP)" />
            <label className="btn btn-secondary h40" style={{ flex: "none" }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
              <i className="ph ph-upload-simple" style={{ fontSize: 16 }} />Subir
            </label>
          </div>
          <span className="muted-12">Sin logo se muestran las iniciales sobre el color de la marca.</span>
        </div>

        <div className="field" style={{ gridColumn: "1 / -1" }}><span className="field-label">Color de marca *</span>
          <div className="adm-swatches">
            {SWATCHES.map((c) => <button key={c} type="button" className={`adm-swatch${color.toLowerCase() === c ? " is-on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Color ${c}`} />)}
            <label className="adm-swatch-custom" title="Otro color"><input type="color" value={validColor ? color : SWATCHES[0]} onChange={(e) => setColor(e.target.value)} aria-label="Elegir otro color" /></label>
            <input className="input h34" value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} style={{ width: 96 }} aria-label="Color en hexadecimal" />
          </div>
          <span className="muted-12">Se usa para el logo de respaldo y el fondo de sus anuncios. Mejor un tono oscuro: el texto va en blanco encima.</span>
        </div>

        <div className="field"><label htmlFor="am-contact">Persona de contacto</label><input id="am-contact" className="input h40" value={contactName} maxLength={80} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre y apellido" /></div>
        <div className="field"><label htmlFor="am-wa">WhatsApp</label><input id="am-wa" className="input h40" value={whatsapp} inputMode="tel" onChange={(e) => setWhatsapp(e.target.value)} placeholder="8888 8888" /></div>
        <div className="field"><label htmlFor="am-email">Correo</label><input id="am-email" className="input h40" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder="mercadeo@marca.cr" /></div>
        <div className="field"><label htmlFor="am-web">Sitio web</label><input id="am-web" className="input h40" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://marca.cr" /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="am-notes">Notas internas</label><textarea id="am-notes" className="input" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Acuerdo, monto, fechas pactadas…" style={{ minHeight: 70 }} /></div>
      </div>

      <div className="adm-toggle-row">
        <Toggle on={active} label="Marca activa" onToggle={() => setActive(!active)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{active ? "Marca activa" : "Marca inactiva"}</span>
          <span className="muted-12">{active ? "Sus anuncios activos pueden salir en el sitio." : "Ninguno de sus anuncios sale en el sitio, aunque estén activos."}</span>
        </div>
      </div>
      <span className="muted-12"><i className="ph ph-lock-simple" /> El contacto y las notas son privados: nunca se muestran en el sitio.</span>
    </DialogShell>
  );
}
