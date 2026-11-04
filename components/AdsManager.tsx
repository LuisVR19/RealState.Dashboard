"use client";

// Sección Publicidad del panel (solo admin): anuncios por espacio, marcas y métricas de 30 días.
// Los datos llegan del servidor (app/(app)/publicidad/page.tsx); cada acción refresca la página.
import { useMemo, useState } from "react";
import { deleteAd, deleteAdvertiser, setAdStatus, setAdvertiserActive } from "@/app/actions/ads";
import { ctrText, LIVE_STATE_INFO, liveState, PLACEMENT_INFO, STATS_DAYS, type AdItem, type AdPlacement, type Advertiser, type AdsPanelData } from "@/lib/ads";
import { dayParts } from "@/lib/dates";
import { BrandLogo } from "./AdPreview";
import { AdModal } from "./dialogs/AdModal";
import { AdvertiserModal } from "./dialogs/AdvertiserModal";
import { usePanel } from "./panel-provider";
import { CountTab, PageHead, StatusTag, Toggle } from "./ui";

type Tab = "ads" | "brands";
type Modal = { type: "ad"; ad?: AdItem; advertiserId?: string } | { type: "brand"; advertiser?: Advertiser } | null;

const n = (x: number) => x.toLocaleString("es-CR");
const shortDate = (iso: string) => { const d = dayParts(iso); return `${d.num} ${d.mon}`; };

function dateRange(a: AdItem) {
  if (!a.startsOn && !a.endsOn) return "Sin fechas";
  if (a.startsOn && a.endsOn) return `${shortDate(a.startsOn)} – ${shortDate(a.endsOn)}`;
  return a.startsOn ? `Desde ${shortDate(a.startsOn)}` : `Hasta ${shortDate(a.endsOn!)}`;
}

export function AdsManager({ data }: { data: AdsPanelData }) {
  const { open, run, flash } = usePanel();
  const [tab, setTab] = useState<Tab>("ads");
  const [filter, setFilter] = useState<AdPlacement | "all">("all");
  const [modal, setModal] = useState<Modal>(null);

  const brandOf = useMemo(() => new Map(data.advertisers.map((a) => [a.id, a])), [data.advertisers]);
  const stateOf = (ad: AdItem) => liveState(ad, brandOf.get(ad.advertiserId)?.active ?? false, data.today);
  const liveCount = data.ads.filter((a) => stateOf(a) === "live").length;
  const shown = filter === "all" ? data.ads : data.ads.filter((a) => a.placement === filter);
  const adsOf = (id: string) => data.ads.filter((a) => a.advertiserId === id);

  const newAd = (advertiserId?: string) => {
    if (!data.advertisers.length) {
      flash("Primero crea la marca que va a anunciar");
      return setModal({ type: "brand" });
    }
    setModal({ type: "ad", advertiserId });
  };

  const toggleAd = (ad: AdItem) =>
    ad.status === "Activa"
      ? run(() => setAdStatus(ad.id, "Pausada"), "Anuncio pausado")
      : run(() => setAdStatus(ad.id, "Activa"), "Anuncio activado");

  const removeAd = (ad: AdItem) =>
    open({ type: "confirm", title: "Eliminar anuncio", body: `“${ad.headline}” se borrará junto con sus métricas. Si solo quieres que deje de salir, mejor páusalo.`, ok: "Eliminar", onOk: () => run(() => deleteAd(ad.id), "Anuncio eliminado") });

  const removeBrand = (b: Advertiser) => {
    const count = adsOf(b.id).length;
    open({ type: "confirm", title: "Eliminar marca", body: count ? `Se borrarán “${b.name}”, sus ${count} ${count === 1 ? "anuncio" : "anuncios"} y todas sus métricas. Si solo quieres que deje de salir, desactívala.` : `Se borrará “${b.name}”.`, ok: "Eliminar", onOk: () => run(() => deleteAdvertiser(b.id), "Marca eliminada") });
  };

  const kpis = [
    { label: "En el sitio ahora", icon: "ph-broadcast", value: n(liveCount), hint: "Anuncios activos, vigentes y de marcas activas" },
    { label: "Impresiones", icon: "ph-eye", value: n(data.totals.impressions), hint: "Veces que un anuncio estuvo a la vista al menos 1 segundo" },
    { label: "Clics", icon: "ph-cursor-click", value: n(data.totals.clicks), hint: "Clics en el botón o la tarjeta de un anuncio" },
    { label: "Tasa de clics", icon: "ph-percent", value: ctrText(data.totals), hint: "Clics ÷ impresiones" },
  ];

  return (
    <div className="stack-18">
      <PageHead
        title="Publicidad"
        sub={`Marcas y anuncios del sitio público. Métricas de los últimos ${STATS_DAYS} días.`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary h40" onClick={() => setModal({ type: "brand" })}><i className="ph ph-buildings" style={{ fontSize: 16 }} />Nueva marca</button>
            <button className="btn btn-primary h40" onClick={() => newAd()}><i className="ph ph-plus" style={{ fontSize: 16 }} />Nuevo anuncio</button>
          </div>
        }
      />

      <div className="grid-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="kpi" title={k.hint}>
            <span className="kpi-label"><i className={`ph ${k.icon}`} />{k.label}</span>
            <span className="kpi-value">{k.value}</span>
          </div>
        ))}
      </div>

      <div className="segmented" role="tablist" style={{ alignSelf: "flex-start" }}>
        <button role="tab" aria-selected={tab === "ads"} className={tab === "ads" ? "is-on" : ""} onClick={() => setTab("ads")}><i className="ph ph-megaphone" />Anuncios · {data.ads.length}</button>
        <button role="tab" aria-selected={tab === "brands"} className={tab === "brands" ? "is-on" : ""} onClick={() => setTab("brands")}><i className="ph ph-buildings" />Marcas · {data.advertisers.length}</button>
      </div>

      {tab === "ads" ? (
        <>
          <div className="chip-row">
            <CountTab label="Todos" count={data.ads.length} on={filter === "all"} onClick={() => setFilter("all")} />
            {(Object.keys(PLACEMENT_INFO) as AdPlacement[]).map((p) => (
              <CountTab key={p} label={PLACEMENT_INFO[p].label} count={data.ads.filter((a) => a.placement === p).length} on={filter === p} onClick={() => setFilter(p)} />
            ))}
          </div>

          {shown.length ? (
            <div className="table">
              <div className="table-head ads-head">
                <span style={{ flex: "1 1 300px" }}>Anuncio</span>
                <span className="ads-col-state">Estado</span>
                <span className="ads-col-dates">Fechas</span>
                <span className="ads-col-stats">Impresiones · clics</span>
                <span className="ads-col-actions" />
              </div>
              {shown.map((ad) => {
                const b = brandOf.get(ad.advertiserId);
                const st = LIVE_STATE_INFO[stateOf(ad)];
                return (
                  <div key={ad.id} className="table-row is-hover">
                    <div className="ads-main" onClick={() => setModal({ type: "ad", ad })} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setModal({ type: "ad", ad })}>
                      <BrandLogo brand={b?.name ?? "?"} color={b?.color ?? "#1f4e46"} logoUrl={b?.logoUrl} size={40} />
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className="ellipsis" style={{ fontSize: 14, fontWeight: 500 }}>{ad.headline}</span>
                        <span className="muted-12 ellipsis"><i className={`ph ${PLACEMENT_INFO[ad.placement].icon}`} /> {PLACEMENT_INFO[ad.placement].label} · {b?.name ?? "Marca eliminada"}{ad.cantons.length ? ` · ${ad.cantons.join(", ")}` : ""}</span>
                      </div>
                    </div>
                    <span className="ads-col-state"><StatusTag style={st.style}>{st.label}</StatusTag></span>
                    <span className="ads-col-dates muted-13">{dateRange(ad)}</span>
                    <span className="ads-col-stats">
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{n(ad.stats.impressions)} · {n(ad.stats.clicks)}</span>
                      <span className="muted-12">CTR {ctrText(ad.stats)}{ad.placement === "home_banner" && ad.stats.dismissals ? ` · ${n(ad.stats.dismissals)} cierres` : ""}</span>
                    </span>
                    <span className="ads-col-actions row-actions">
                      {ad.status !== "Finalizada" && (
                        <button className="btn btn-secondary btn-icon b32" onClick={() => toggleAd(ad)} title={ad.status === "Activa" ? "Pausar" : "Activar"} aria-label={ad.status === "Activa" ? `Pausar ${ad.headline}` : `Activar ${ad.headline}`}>
                          <i className={`ph ${ad.status === "Activa" ? "ph-pause" : "ph-play"}`} style={{ fontSize: 14 }} />
                        </button>
                      )}
                      <button className="btn btn-secondary btn-icon b32" onClick={() => setModal({ type: "ad", ad })} title="Editar" aria-label={`Editar ${ad.headline}`}><i className="ph ph-pencil-simple" style={{ fontSize: 14 }} /></button>
                      <button className="btn btn-secondary btn-icon b32 is-danger" onClick={() => removeAd(ad)} title="Eliminar" aria-label={`Eliminar ${ad.headline}`}><i className="ph ph-trash" style={{ fontSize: 14 }} /></button>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card table-empty">
              <i className="ph ph-megaphone" style={{ fontSize: 28, color: "var(--color-neutral-500)" }} />
              <span style={{ fontSize: 16, fontWeight: 500 }}>{data.ads.length ? "No hay anuncios en este espacio" : "Aún no hay anuncios"}</span>
              <span className="muted-14" style={{ maxWidth: 480 }}>Crea una marca y su anuncio. Mientras no haya anuncios activos, el sitio no muestra ningún espacio de publicidad.</span>
              <button className="btn btn-primary h40" onClick={() => newAd()}><i className="ph ph-plus" style={{ fontSize: 16 }} />Nuevo anuncio</button>
            </div>
          )}
        </>
      ) : data.advertisers.length ? (
        <div className="grid-cards-280">
          {data.advertisers.map((b) => {
            const list = adsOf(b.id);
            const live = list.filter((a) => stateOf(a) === "live").length;
            const imp = list.reduce((s, a) => s + a.stats.impressions, 0);
            const clk = list.reduce((s, a) => s + a.stats.clicks, 0);
            return (
              <div key={b.id} className="card stack-14 pad-18" style={{ opacity: b.active ? 1 : 0.6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <BrandLogo brand={b.name} color={b.color} logoUrl={b.logoUrl} size={46} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>{b.name}</span>
                    <span className="muted-12 ellipsis">{b.contactName || b.email || "Sin contacto"}</span>
                  </div>
                </div>
                <div className="kv-grid">
                  <span>Anuncios</span><span>{list.length}{live ? ` · ${live} en el sitio` : ""}</span>
                  <span>{STATS_DAYS} días</span><span>{n(imp)} impresiones · {n(clk)} clics</span>
                  {b.whatsapp && <><span>WhatsApp</span><span><a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener">+{b.whatsapp}</a></span></>}
                  {b.website && <><span>Sitio</span><span className="ellipsis"><a href={b.website} target="_blank" rel="noopener">{b.website.replace(/^https:\/\//, "")}</a></span></>}
                </div>
                <div className="card-foot">
                  <Toggle on={b.active} label="Marca activa" onToggle={() => run(() => setAdvertiserActive(b.id, !b.active), b.active ? "Marca desactivada" : "Marca activada")} />
                  <span style={{ flex: 1, fontSize: 13, color: "var(--color-neutral-400)" }}>{b.active ? "Activa" : "Inactiva"}</span>
                  <button className="btn btn-secondary h34" style={{ fontSize: 13 }} onClick={() => newAd(b.id)}><i className="ph ph-plus" />Anuncio</button>
                  <button className="btn btn-secondary btn-icon b34" onClick={() => setModal({ type: "brand", advertiser: b })} title="Editar" aria-label={`Editar ${b.name}`}><i className="ph ph-pencil-simple" style={{ fontSize: 16 }} /></button>
                  <button className="btn btn-secondary btn-icon b34 is-danger" onClick={() => removeBrand(b)} title="Eliminar" aria-label={`Eliminar ${b.name}`}><i className="ph ph-trash" style={{ fontSize: 16 }} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card table-empty">
          <i className="ph ph-buildings" style={{ fontSize: 28, color: "var(--color-neutral-500)" }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Aún no hay marcas</span>
          <span className="muted-14" style={{ maxWidth: 480 }}>Registra la marca anunciante con su logo, color y contacto. Luego creas sus anuncios.</span>
          <button className="btn btn-primary h40" onClick={() => setModal({ type: "brand" })}><i className="ph ph-plus" style={{ fontSize: 16 }} />Nueva marca</button>
        </div>
      )}

      {modal?.type === "ad" && <AdModal ad={modal.ad} advertisers={data.advertisers} defaultAdvertiserId={modal.advertiserId} onClose={() => setModal(null)} />}
      {modal?.type === "brand" && <AdvertiserModal advertiser={modal.advertiser} onClose={() => setModal(null)} />}
    </div>
  );
}
