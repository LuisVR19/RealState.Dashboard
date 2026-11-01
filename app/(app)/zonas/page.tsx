"use client";

import { notFound } from "next/navigation";
import { deleteZone, reorderZones, setZoneVisible } from "@/app/actions/zones";
import { usePanel } from "@/components/panel-provider";
import { PageHead, Toggle } from "@/components/ui";

/** Zonas destacadas de la portada (solo admin). Cada cambio se refleja en el sitio público al instante. */
export default function ZonesPage() {
  const { zones, catalog, isAdmin, open, run } = usePanel();
  if (!isAdmin) notFound();

  const moveUp = (i: number) => {
    const ids = zones.map((z) => z.id);
    [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
    run(() => reorderZones(ids), "Orden actualizado");
  };

  return (
    <div className="stack-18">
      <PageHead title="Zonas destacadas" sub="Las zonas que aparecen en la portada del sitio, en este orden." action={<button className="btn btn-primary h40" onClick={() => open({ type: "zone" })}><i className="ph ph-plus" style={{ fontSize: 16 }} />Nueva zona</button>} />
      <div className="grid-zones">
        {zones.map((z, i) => {
          const c = catalog.filter((p) => p.status === "Publicada" && p.images.length > 0 && p.canton === z.name).length;
          return (
            <div key={z.id} className="card zone-card" style={{ opacity: z.visible ? 1 : 0.55 }}>
              <div className="zone-card-img"><img src={z.imageUrl} alt="" /><span className="tag zone-order">#{i + 1}</span></div>
              <div className="stack-10" style={{ padding: 14 }}>
                <div><div style={{ fontSize: 15, fontWeight: 500 }}>{z.label}</div><div className="muted-12">Filtra por “{z.name}” · {c} {c === 1 ? "propiedad" : "propiedades"}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Toggle on={z.visible} label="Visible" onToggle={() => run(() => setZoneVisible(z.id, !z.visible), z.visible ? "Zona oculta" : "Zona visible")} />
                  <span style={{ flex: 1, fontSize: 12, color: "var(--color-neutral-400)" }}>{z.visible ? "Visible" : "Oculta"}</span>
                  <button className="btn btn-secondary btn-icon b32" onClick={() => moveUp(i)} disabled={i === 0} title="Subir" aria-label="Subir"><i className="ph ph-arrow-up" style={{ fontSize: 14 }} /></button>
                  <button className="btn btn-secondary btn-icon b32" onClick={() => open({ type: "zone", zone: z })} title="Editar" aria-label="Editar"><i className="ph ph-pencil-simple" style={{ fontSize: 14 }} /></button>
                  <button className="btn btn-secondary btn-icon b32 is-danger" title="Eliminar" aria-label="Eliminar" onClick={() => open({ type: "confirm", title: "Eliminar zona", body: `“${z.label}” dejará de aparecer en la portada.`, ok: "Eliminar", onOk: () => run(() => deleteZone(z.id), "Zona eliminada") })}><i className="ph ph-trash" style={{ fontSize: 14 }} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {!zones.length && <div className="table-empty muted-14">Aún no hay zonas destacadas.</div>}
      </div>
    </div>
  );
}
