"use client";

// Vista previa de un anuncio tal como sale en el sitio público (mismas proporciones y jerarquía que
// RealState.Web/components/Ads.tsx y AdBanner.tsx). Solo para el panel: no enlaza ni mide nada.
import type { CSSProperties } from "react";
import { brandInitials, type AdPlacement } from "@/lib/ads";

export interface PreviewAd {
  placement: AdPlacement;
  brand: string;
  color: string;
  logoUrl?: string | null;
  headline: string;
  body: string;
  cta: string;
  icon: string;
  imageUrl?: string | null;
}

const brandVar = (color: string) => ({ "--ad": /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#1f4e46" }) as CSSProperties;

export function BrandLogo({ brand, color, logoUrl, size = 40 }: { brand: string; color: string; logoUrl?: string | null; size?: number }) {
  return (
    <span className="adp-logo" style={{ ...brandVar(color), width: size, height: size, fontSize: Math.round(size * 0.34) }} aria-hidden>
      {logoUrl ? <img src={logoUrl} alt="" /> : brandInitials(brand) || "?"}
    </span>
  );
}

export function AdPreview({ ad }: { ad: PreviewAd }) {
  const headline = ad.headline.trim() || "Titular del anuncio";
  const body = ad.body.trim();
  const cta = ad.cta.trim() || "Ver más";
  const brand = ad.brand.trim() || "Marca";

  if (ad.placement === "home_banner") {
    return (
      <div className="adp-banner" style={brandVar(ad.color)}>
        <i className={`ph ${ad.icon} adp-banner-mark`} aria-hidden />
        <BrandLogo brand={brand} color={ad.color} logoUrl={ad.logoUrl} size={48} />
        <div className="adp-banner-text">
          <span className="adp-pill">Publicidad · {brand}</span>
          <span className="adp-banner-headline">{headline}</span>
          {body && <span className="adp-banner-body">{body}</span>}
        </div>
        <span className="btn btn-secondary adp-banner-cta">{cta}<i className="ph ph-arrow-right" /></span>
        <span className="adp-banner-close" aria-hidden><i className="ph ph-x" /></span>
      </div>
    );
  }

  if (ad.placement === "search_card") {
    return (
      <div className="adp-card">
        <div className="adp-card-media" style={brandVar(ad.color)}>
          {ad.imageUrl ? <img src={ad.imageUrl} alt="" /> : <i className={`ph ${ad.icon} adp-card-icon`} aria-hidden />}
          <span className="adp-card-shade" />
          <span className="adp-card-tag">Patrocinado</span>
          <span className="adp-card-headline">{headline}</span>
        </div>
        <div className="adp-card-body">
          <div className="adp-card-brand"><BrandLogo brand={brand} color={ad.color} logoUrl={ad.logoUrl} size={26} /><span>{brand}</span></div>
          {body && <p>{body}</p>}
          <span className="adp-cta">{cta}<i className="ph ph-arrow-right" /></span>
        </div>
      </div>
    );
  }

  return (
    <div className="adp-service">
      <BrandLogo brand={brand} color={ad.color} logoUrl={ad.logoUrl} size={40} />
      <span className="adp-service-text">
        <span className="adp-service-brand">{brand}</span>
        <span className="adp-service-title">{headline}</span>
        {body && <span className="adp-service-sub">{body}</span>}
      </span>
      <i className="ph ph-arrow-up-right" style={{ color: "var(--color-neutral-500)" }} aria-hidden />
    </div>
  );
}
