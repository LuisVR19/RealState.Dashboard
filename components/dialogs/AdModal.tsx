"use client";

import { useState, useTransition } from "react";
import { saveAd } from "@/app/actions/ads";
import { AD_ICONS, AD_PLACEMENTS, AD_STATUSES, PLACEMENT_INFO, type AdItem, type AdPlacement, type AdStatus, type Advertiser } from "@/lib/ads";
import { CANTONS } from "@/lib/format";
import type { Canton } from "@/lib/types";
import { uploadImage } from "@/lib/upload";
import { AdPreview } from "../AdPreview";
import { Chip, toggle } from "../Chip";
import { usePanel } from "../panel-provider";
import { DialogShell } from "../ui";

const STATUS_HINT: Record<AdStatus, string> = {
  Borrador: "No sale en el sitio. Úsalo mientras preparas el anuncio.",
  Activa: "Sale en el sitio dentro de sus fechas.",
  Pausada: "Deja de salir hasta que lo vuelvas a activar.",
  Finalizada: "Campaña terminada. Se conserva con sus métricas.",
};

/** Contador de caracteres que cambia de color al acercarse al máximo. */
const Count = ({ value, max }: { value: string; max: number }) => (
  <span className={`adm-count${value.length > max * 0.9 ? " is-near" : ""}`}>{value.length}/{max}</span>
);

/** Crear o editar un anuncio (`ads`). La imagen del creativo va al bucket ad-images o es una URL. */
export function AdModal({ ad, advertisers, defaultAdvertiserId, onClose }: { ad?: AdItem; advertisers: Advertiser[]; defaultAdvertiserId?: string; onClose: () => void }) {
  const { run, flash } = usePanel();
  const [advertiserId, setAdvertiserId] = useState(ad?.advertiserId ?? defaultAdvertiserId ?? advertisers[0]?.id ?? "");
  const [placement, setPlacement] = useState<AdPlacement>(ad?.placement ?? "home_banner");
  const [status, setStatus] = useState<AdStatus>(ad?.status ?? "Borrador");
  const [headline, setHeadline] = useState(ad?.headline ?? "");
  const [body, setBody] = useState(ad?.body ?? "");
  const [cta, setCta] = useState(ad?.cta ?? "Ver más");
  const [href, setHref] = useState(ad?.href ?? "");
  const [imageUrl, setImageUrl] = useState(ad?.imageUrl ?? "");
  const [icon, setIcon] = useState(ad?.icon ?? "ph-megaphone");
  const [startsOn, setStartsOn] = useState(ad?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(ad?.endsOn ?? "");
  const [weight, setWeight] = useState(String(ad?.weight ?? 50));
  const [cantons, setCantons] = useState<Canton[]>(ad?.cantons ?? []);
  const [busy, startBusy] = useTransition();

  const brand = advertisers.find((a) => a.id === advertiserId);

  const upload = (file: File | undefined) =>
    file &&
    startBusy(async () => {
      try {
        setImageUrl(await uploadImage("ad-images", "creatives", file));
      } catch (e) {
        flash((e as Error).message, "error");
      }
    });

  const save = () =>
    startBusy(async () => {
      const res = await run(
        () => saveAd(ad?.id ?? null, { advertiserId, placement, status, headline, body, cta, href, imageUrl, icon, startsOn, endsOn, weight: Number(weight), cantons }),
        ad ? "Anuncio actualizado" : "Anuncio creado",
      );
      if (res.ok) onClose();
    });

  const canSave = !!advertiserId && !!headline.trim() && !!cta.trim() && !!href.trim() && !busy;

  return (
    <DialogShell title={ad ? "Editar anuncio" : "Nuevo anuncio"} onClose={onClose} width={980}
      footer={<div className="dialog-actions"><button className="btn btn-secondary" onClick={onClose} style={{ height: 40 }}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={!canSave} style={{ height: 40 }}>{busy ? "Guardando…" : ad ? "Guardar cambios" : "Crear anuncio"}</button></div>}>
      <div className="adm-cols">
        <div className="stack-16" style={{ minWidth: 0 }}>
          <div className="form-grid">
            <div className="field"><label htmlFor="ad-brand">Marca *</label>
              <select id="ad-brand" className="input h40" value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
                {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}{a.active ? "" : " (inactiva)"}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="ad-status">Estado *</label>
              <select id="ad-status" className="input h40" value={status} onChange={(e) => setStatus(e.target.value as AdStatus)}>
                {AD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="muted-12">{STATUS_HINT[status]}</span>
            </div>
          </div>

          <div className="field"><span className="field-label">Espacio *</span>
            <div className="adm-placements" role="radiogroup" aria-label="Espacio del anuncio">
              {AD_PLACEMENTS.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={placement === p} className={`adm-placement${placement === p ? " is-on" : ""}`} onClick={() => setPlacement(p)}>
                  <i className={`ph ${PLACEMENT_INFO[p].icon}`} />
                  <span className="adm-placement-label">{PLACEMENT_INFO[p].label}</span>
                  <span className="adm-placement-where">{PLACEMENT_INFO[p].where}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field"><label htmlFor="ad-headline" className="adm-label-row">Titular * <Count value={headline} max={60} /></label>
            <input id="ad-headline" className="input h40" value={headline} maxLength={60} onChange={(e) => setHeadline(e.target.value)} placeholder="Tu crédito de vivienda, aprobado en 72 horas" />
          </div>
          <div className="field"><label htmlFor="ad-body" className="adm-label-row">Texto <Count value={body} max={120} /></label>
            <textarea id="ad-body" className="input" value={body} maxLength={120} onChange={(e) => setBody(e.target.value)} placeholder="Una frase que explique la oferta." style={{ minHeight: 64 }} />
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="ad-cta" className="adm-label-row">Botón * <Count value={cta} max={24} /></label>
              <input id="ad-cta" className="input h40" value={cta} maxLength={24} onChange={(e) => setCta(e.target.value)} placeholder="Cotizar" />
            </div>
            <div className="field"><label htmlFor="ad-href">Enlace *</label>
              <input id="ad-href" className="input h40" value={href} maxLength={500} onChange={(e) => setHref(e.target.value)} placeholder="https://marca.cr/oferta" />
              <span className="muted-12">Sitio de la marca (https://) o una página de este sitio (/propiedades).</span>
            </div>
          </div>

          <div className="field"><span className="field-label">Icono del creativo</span>
            <div className="adm-icons">
              {AD_ICONS.map(([i, label]) => (
                <button key={i} type="button" className={`adm-icon${icon === i ? " is-on" : ""}`} onClick={() => setIcon(i)} title={label} aria-label={label} aria-pressed={icon === i}><i className={`ph ${i}`} /></button>
              ))}
            </div>
            <span className="muted-12">Se ve como marca de agua en el banner y en la tarjeta cuando no hay imagen.</span>
          </div>

          {placement === "search_card" && (
            <div className="field"><label htmlFor="ad-img">Imagen de la tarjeta (opcional)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="ad-img" className="input h40" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… o sube un archivo (horizontal 4:3)" />
                <label className="btn btn-secondary h40" style={{ flex: "none" }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
                  <i className="ph ph-upload-simple" style={{ fontSize: 16 }} />Subir
                </label>
                {imageUrl && <button type="button" className="btn btn-secondary btn-icon h40" onClick={() => setImageUrl("")} aria-label="Quitar imagen" title="Quitar imagen"><i className="ph ph-x" /></button>}
              </div>
            </div>
          )}

          <div className="form-grid form-grid-130">
            <div className="field"><label htmlFor="ad-start">Desde</label><input id="ad-start" type="date" className="input h40" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div>
            <div className="field"><label htmlFor="ad-end">Hasta</label><input id="ad-end" type="date" className="input h40" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)} /></div>
            <div className="field"><label htmlFor="ad-weight">Prioridad (0–100)</label><input id="ad-weight" type="number" min={0} max={100} className="input h40" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          </div>
          <span className="muted-12" style={{ marginTop: -8 }}>Sin fechas sale desde ya y sin fin. Con varios anuncios en el mismo espacio, sale primero el de mayor prioridad.</span>

          <div className="field"><span className="field-label">Cantones</span>
            <div className="chip-row">{CANTONS.map((c) => <Chip key={c} size="sm" label={c} on={cantons.includes(c)} onClick={() => setCantons(toggle(cantons, c))} />)}</div>
            <span className="muted-12">{cantons.length ? "Solo en fichas de esos cantones y en búsquedas filtradas por uno de ellos." : "Sin cantones: sale en toda la provincia."}</span>
          </div>
        </div>

        <aside className="adm-preview">
          <span className="field-label">Vista previa</span>
          <div className={`adm-preview-stage is-${placement}`}>
            <AdPreview ad={{ placement, brand: brand?.name ?? "", color: brand?.color ?? "#1f4e46", logoUrl: brand?.logoUrl, headline, body, cta, icon, imageUrl: /^https:\/\//.test(imageUrl) ? imageUrl : null }} />
          </div>
          <span className="muted-12">{PLACEMENT_INFO[placement].where}</span>
          {brand && !brand.active && <span className="adm-warn"><i className="ph ph-warning" />La marca está inactiva: el anuncio no saldrá hasta activarla.</span>}
        </aside>
      </div>
    </DialogShell>
  );
}
