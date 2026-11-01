"use client";

import { useState } from "react";
import { crc, decimal, pricePeriod } from "@/lib/format";
import type { Property } from "@/lib/types";
import { usePanel } from "../panel-provider";

/** Enlace público de la propiedad (sitio de clientes). */
const siteUrl = (p: Property) => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") + "/propiedades/" + p.code;

export function ShareDialog({ property: p }: { property: Property }) {
  const { close } = usePanel();
  const [copied, setCopied] = useState(false);
  const url = siteUrl(p);

  const price = crc(p.price) + pricePeriod(p);
  const desc =
    [p.operation === "Vacacional" ? "Alquiler vacacional" : p.operation, p.type, p.bedrooms ? `${p.bedrooms} hab.` : null, p.bathrooms ? `${decimal(p.bathrooms)} baños` : null, p.areaM2 ? `${p.areaM2} m²` : null]
      .filter(Boolean)
      .join(" · ") + `. ${p.zone}, ${p.canton}. ${price}.`;
  let domain = "innovacionsf.cr";
  try { domain = new URL(url).host || domain; } catch {}
  const text = `${p.title} · ${price}\n${url}`;
  const targets = [
    { label: "WhatsApp", icon: "ph-whatsapp-logo", href: "https://wa.me/?text=" + encodeURIComponent(text) },
    { label: "Facebook", icon: "ph-facebook-logo", href: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url) },
    { label: "Correo", icon: "ph-envelope-simple", href: "mailto:?subject=" + encodeURIComponent(p.title) + "&body=" + encodeURIComponent(desc + "\n\n" + url) },
    { label: "Más", icon: "ph-share-network", href: url, native: true },
  ];

  return (
    <div className="dialog-backdrop z-share" onClick={close}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", gap: 18, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span className="dialog-title">Compartir propiedad</span>
          <button className="btn btn-secondary btn-icon" onClick={close} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>Así se verá al compartir el enlace</span>
          <div className="og-card">
            <div className="og-card-img"><img src={p.images[0]} alt="" /></div>
            <div className="og-card-body">
              <span className="og-card-domain">{domain}</span>
              <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{p.title} | Thomas Mata S.A.</span>
              <span className="og-card-desc">{desc}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 0, height: 42, fontSize: 13, color: "var(--color-neutral-300)" }} />
          <button className="btn btn-primary" onClick={() => { navigator.clipboard?.writeText(url).catch(() => {}); setCopied(true); }} style={{ height: 42, flex: "none" }}>
            <i className={`ph ${copied ? "ph-check" : "ph-link"}`} style={{ fontSize: 16 }} />{copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="share-targets">
          {targets.map((t) => (
            <a key={t.label} href={t.href} target="_blank" rel="noopener" className="share-target"
              onClick={t.native ? (e) => { if (navigator.share) { e.preventDefault(); navigator.share({ title: p.title, text: desc, url }).catch(() => {}); } } : undefined}>
              <i className={`ph ${t.icon}`} />{t.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
