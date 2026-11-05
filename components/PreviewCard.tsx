import { crc, initialsOf, OP_LABEL, placeLine, priceSuffix, specs } from "@/lib/format";
import type { Property } from "@/lib/types";

/** Vista previa de la tarjeta tal como se ve en el sitio público (sin interacción). */
export function PreviewCard({ p, agentName }: { p: Property; agentName: string }) {
  const n = p.images.length;
  return (
    <div className="pcard">
      <div className="pcard-media">
        {p.images[0] && <img src={p.images[0]} alt={p.title} />}
        <div className="pcard-tags"><span className="tag tag-neutral">{OP_LABEL[p.operation]}</span>{p.tag && <span className="tag tag-accent">{p.tag}</span>}</div>
        <span className="pcard-fav"><i className="ph ph-heart" style={{ fontSize: 18 }} /></span>
        {n > 1 && <span className="pcard-counter"><i className="ph ph-camera" style={{ fontSize: 12 }} />1/{n}</span>}
      </div>
      <div className="pcard-body">
        <div className="pcard-price">
          {p.operation === "Preventa" && <span className="muted-12">Desde</span>}
          <span className="pcard-price-main">{p.price ? crc(p.price) : "₡0"}</span>
          <span className="muted-12">{p.price ? priceSuffix(p) : ""}</span>
        </div>
        <div className="pcard-title">{p.title || "Título del anuncio"}</div>
        <div className="pcard-zone"><i className="ph ph-map-pin" style={{ fontSize: 14 }} />{placeLine({ ...p, zone: p.zone || "Zona" })}</div>
        <div className="pcard-specs">{specs(p).map((s) => <span key={s.label}><i className={`ph ${s.icon}`} />{s.label}</span>)}</div>
        <div className="pcard-foot">
          <span className="avatar avatar-28">{initialsOf(agentName)}</span>
          <span className="pcard-agent">{agentName}</span>
          <span className="btn btn-secondary btn-icon"><i className="ph ph-whatsapp-logo" style={{ fontSize: 18 }} /></span>
          <span className="btn btn-primary" style={{ height: 36 }}><i className="ph ph-calendar-check" style={{ fontSize: 16 }} />Agendar</span>
        </div>
      </div>
    </div>
  );
}
