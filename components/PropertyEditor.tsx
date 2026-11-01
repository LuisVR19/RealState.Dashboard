"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from "react";
import { saveProperty, type PropertyInput } from "@/app/actions/properties";
import { ago, dayParts } from "@/lib/dates";
import { amenityIcon, CANTONS, TYPES, VISIT_STATUS_STYLE } from "@/lib/format";
import type { Canton, Operation, Property, PropertyStatus, PropertyType } from "@/lib/types";
import { imageProblem, uploadImage } from "@/lib/upload";
import { Chip, toggle } from "./Chip";
import { usePanel } from "./panel-provider";
import { PreviewCard } from "./PreviewCard";
import { DateBadge, StatusTag, Toggle } from "./ui";

const EditorMap = dynamic(() => import("./EditorMap").then((m) => m.EditorMap), { ssr: false, loading: () => <div className="editor-map" /> });

const blank = (agentId: string): Property => ({
  id: "", code: "", title: "", description: "", operation: "Venta", type: "Casa", status: "Borrador", featured: false, canton: "Paraíso", zone: "", address: "",
  lat: 9.8385, lng: -83.866, price: 0, bedrooms: 0, bathrooms: 0, areaM2: 0, parkingSpaces: 0, agentId, amenities: [], images: [], updatedAt: "",
});

/** Archivos elegidos y aún no subidos, por su URL local (blob:) en `d.images`. */
type PendingFiles = Map<string, File>;

/**
 * Editor de propiedad (crear y editar). Los cambios viven en el borrador local y alimentan la vista previa.
 * Al guardar: (1) rpc save_property con los datos y las fotos ya subidas; (2) si hay archivos nuevos,
 * se suben a Storage (property-images/<id>/…, la política exige ser dueño o admin) y (3) se guarda la
 * galería final en el orden elegido. Si la subida falla, los datos quedan guardados y se avisa.
 */
export function PropertyEditor({ property }: { property?: Property }) {
  const { me, team, isAdmin, visits, today, agentName, open, run, flash, amenities } = usePanel();
  const router = useRouter();
  const [d, setD] = useState<Property>(() => property ?? blank(me.id));
  const [files, setFiles] = useState<PendingFiles>(() => new Map());
  const [urlIn, setUrlIn] = useState("");
  const [saving, startSaving] = useTransition();
  const set = (o: Partial<Property>) => setD((x) => ({ ...x, ...o }));
  const num = (k: keyof Property) => (e: ChangeEvent<HTMLInputElement>) => set({ [k]: Number(e.target.value.replace(/\D/g, "")) || 0 });
  const numVal = (n: number | undefined) => (n ? String(n) : "");
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok = Array.from(list).filter((f) => {
      const problem = imageProblem(f);
      if (problem) flash(problem, "error");
      return !problem;
    });
    const next = new Map(files);
    const urls = ok.map((f) => {
      const u = URL.createObjectURL(f);
      next.set(u, f);
      return u;
    });
    setFiles(next);
    set({ images: d.images.concat(urls) });
  };
  // Libera las URLs locales al salir del editor.
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((_, u) => URL.revokeObjectURL(u)), []);

  const input = (x: Property): PropertyInput => ({
    title: x.title, description: x.description, operation: x.operation, type: x.type, status: x.status, featured: x.featured, tag: x.tag,
    canton: x.canton, zone: x.zone, address: x.address, lat: x.lat, lng: x.lng, price: x.price, maintenanceFee: x.maintenanceFee,
    bedrooms: x.bedrooms, bathrooms: x.bathrooms, areaM2: x.areaM2, parkingSpaces: x.parkingSpaces, guests: x.guests, floor: x.floor,
    yearBuilt: x.yearBuilt, delivery: x.delivery, agentId: x.agentId,
    amenityIds: amenities.filter((a) => x.amenities.includes(a.name)).map((a) => a.id),
  });

  const save = () =>
    startSaving(async () => {
      const pendingFiles = d.images.filter((u) => files.has(u));
      const uploaded = d.images.filter((u) => !files.has(u));
      // Con archivos nuevos, primero se guardan los datos (hace falta el id para la carpeta de Storage);
      // si todavía no hay ninguna foto subida, ese primer paso no publica.
      const firstStatus = pendingFiles.length && !uploaded.length && d.status === "Publicada" ? "Borrador" : d.status;
      const first = await run(() => saveProperty(property?.id ?? null, input({ ...d, status: firstStatus }), uploaded));
      if (!first.ok) return;
      const { id, code } = first.data;
      if (pendingFiles.length) {
        try {
          const final: string[] = [];
          for (const u of d.images) final.push(files.has(u) ? await uploadImage("property-images", id, files.get(u)!) : u);
          const second = await run(() => saveProperty(id, input(d), final));
          if (!second.ok) return router.replace(`/propiedades/${code}`);
        } catch (e) {
          flash(`Los datos se guardaron, pero no las fotos nuevas. ${(e as Error).message}`, "error");
          return router.replace(`/propiedades/${code}`);
        }
      }
      flash(property ? "Cambios guardados" : `Propiedad ${code} creada`);
      router.push("/propiedades");
    });

  const priceLabel = d.operation === "Alquiler" ? "Precio mensual (₡)" : d.operation === "Vacacional" ? "Precio por noche (₡)" : d.operation === "Preventa" ? "Precio desde (₡)" : "Precio (₡)";
  const pVisits = property ? visits.filter((v) => v.propertyId === property.id && v.date >= today && v.status !== "Cancelada" && v.status !== "Realizada").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 4) : [];

  return (
    <div className="stack-18">
      <div className="editor-bar">
        <Link href="/propiedades" className="btn btn-secondary btn-icon" aria-label="Volver"><i className="ph ph-arrow-left" style={{ fontSize: 16 }} /></Link>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>{property ? "Editar propiedad" : "Nueva propiedad"}</h1>
          <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{property ? `${property.code} · actualizada ${ago(property.updatedAt).toLowerCase()}` : `Se guardará como ${d.status.toLowerCase()}`}</span>
        </div>
        {property && d.status === "Publicada" && <button className="btn btn-secondary h40" onClick={() => open({ type: "share", property: d })}><i className="ph ph-share-network" style={{ fontSize: 16 }} />Compartir</button>}
        <Link href="/propiedades" className="btn btn-secondary h40">Cancelar</Link>
        <button className="btn btn-primary h40" onClick={save} disabled={saving}><i className="ph ph-check" style={{ fontSize: 16 }} />{saving ? "Guardando…" : "Guardar"}</button>
      </div>

      <div className="editor-cols">
        <div className="stack-16" style={{ minWidth: 0 }}>
          <section className="card stack-14 pad-20">
            <h2 className="h2-16">Información básica</h2>
            <div className="field"><label>Título del anuncio *</label><input className="input h40" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ej. Casa con jardín y vista al valle en Paraíso" /></div>
            <div className="form-grid form-grid-170">
              <div className="field"><label>Operación</label><select className="input h40" value={d.operation} onChange={(e) => set({ operation: e.target.value as Operation })}><option value="Venta">Venta</option><option value="Alquiler">Alquiler</option><option value="Vacacional">Alquiler vacacional</option><option value="Preventa">Preventa</option></select></div>
              <div className="field"><label>Tipo</label><select className="input h40" value={d.type} onChange={(e) => set({ type: e.target.value as PropertyType })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>{priceLabel} *</label><input className="input h40" inputMode="numeric" value={numVal(d.price)} onChange={num("price")} placeholder="0" /></div>
              <div className="field"><label>Etiqueta (opcional)</label><input className="input h40" maxLength={30} value={d.tag ?? ""} onChange={(e) => set({ tag: e.target.value })} placeholder="Exclusiva, Nuevo…" /></div>
            </div>
            <div className="field"><label>Descripción</label><textarea className="input" value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="Describe distribución, acabados y entorno." style={{ minHeight: 120 }} /></div>
          </section>

          <section className="card stack-14 pad-20">
            <h2 className="h2-16">Características</h2>
            <div className="form-grid form-grid-130">
              <div className="field"><label>Habitaciones</label><input className="input h40" inputMode="numeric" value={numVal(d.bedrooms)} onChange={num("bedrooms")} placeholder="0" /></div>
              <div className="field"><label>Baños</label><input className="input h40" inputMode="decimal" value={d.bathrooms ? String(d.bathrooms).replace(".", ",") : ""} onChange={(e) => set({ bathrooms: Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, "")) || 0 })} placeholder="0" /></div>
              <div className="field"><label>Área (m²)</label><input className="input h40" inputMode="numeric" value={numVal(d.areaM2)} onChange={num("areaM2")} placeholder="0" /></div>
              <div className="field"><label>Parqueos</label><input className="input h40" inputMode="numeric" value={numVal(d.parkingSpaces)} onChange={num("parkingSpaces")} placeholder="0" /></div>
              <div className="field"><label>Año</label><input className="input h40" inputMode="numeric" value={numVal(d.yearBuilt)} onChange={num("yearBuilt")} placeholder="2020" /></div>
              <div className="field"><label>Mantenimiento (₡/mes)</label><input className="input h40" inputMode="numeric" value={numVal(d.maintenanceFee)} onChange={num("maintenanceFee")} placeholder="0" /></div>
              {(d.type === "Apartamento" || d.type === "Oficina") && <div className="field"><label>Piso</label><input className="input h40" maxLength={20} value={d.floor ?? ""} onChange={(e) => set({ floor: e.target.value })} placeholder="3" /></div>}
              {d.operation === "Vacacional" && <div className="field"><label>Huéspedes</label><input className="input h40" inputMode="numeric" value={numVal(d.guests)} onChange={num("guests")} placeholder="0" /></div>}
              {d.operation === "Preventa" && <div className="field"><label>Entrega estimada</label><input className="input h40" value={d.delivery ?? ""} onChange={(e) => set({ delivery: e.target.value })} placeholder="Junio 2027" /></div>}
            </div>
            <div className="chip-group"><span className="muted-12">Amenidades</span>
              <div className="chip-row">{amenities.map(({ id, name: a }) => <Chip key={id} size="md" label={a} icon={amenityIcon(a)} on={d.amenities.includes(a)} onClick={() => set({ amenities: toggle(d.amenities, a) })} />)}</div>
            </div>
          </section>

          <section className="card stack-14 pad-20">
            <div className="row-between" style={{ flexWrap: "wrap" }}><h2 className="h2-16">Fotos *</h2><span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>La primera es la portada. JPG, PNG o WebP de hasta 5 MB, o una URL https.</span></div>
            <div className="photo-grid" onDragOver={(e: DragEvent) => e.preventDefault()} onDrop={(e: DragEvent) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
              {d.images.map((src, i) => (
                <div key={src + i} className="photo" style={{ boxShadow: i === 0 ? "0 0 0 2px var(--color-accent)" : "none" }}>
                  <img src={src} alt="" />
                  {i === 0 && <span className="tag photo-cover">Portada</span>}
                  <div className="photo-actions">
                    {i > 0 && <button onClick={() => { const a = d.images.slice(); a.unshift(a.splice(i, 1)[0]); set({ images: a }); }} title="Usar como portada"><i className="ph ph-star" /></button>}
                    <button onClick={() => set({ images: d.images.filter((_, j) => j !== i) })} title="Quitar" aria-label="Quitar foto" style={{ color: "#8a2f24" }}><i className="ph ph-x" /></button>
                  </div>
                </div>
              ))}
              <label className="photo-add">
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
                <i className="ph ph-upload-simple" style={{ fontSize: 22 }} />Subir fotos
              </label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input h38" value={urlIn} onChange={(e) => setUrlIn(e.target.value)} placeholder="https://… URL de imagen" />
              <button className="btn btn-secondary h38" style={{ flex: "none" }} onClick={() => { if (/^https:\/\/\S+$/.test(urlIn.trim())) { set({ images: d.images.concat(urlIn.trim()) }); setUrlIn(""); } else flash("Pega una URL que empiece con https://", "error"); }}>Agregar</button>
            </div>
          </section>

          <section className="card stack-14 pad-20">
            <h2 className="h2-16">Ubicación</h2>
            <div className="form-grid form-grid-170">
              <div className="field"><label>Cantón</label><select className="input h40" value={d.canton} onChange={(e) => set({ canton: e.target.value as Canton })}>{CANTONS.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label>Distrito o barrio *</label><input className="input h40" value={d.zone} onChange={(e) => set({ zone: e.target.value })} placeholder="Santa Lucía" /></div>
              <div className="field"><label>Dirección de referencia</label><input className="input h40" value={d.address} onChange={(e) => set({ address: e.target.value })} placeholder="200 m sur de la iglesia" /></div>
            </div>
            <EditorMap lat={d.lat} lng={d.lng} onMove={(lat, lng) => set({ lat, lng })} />
            <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>Haz clic en el mapa o arrastra el marcador. Coordenadas: {d.lat.toFixed(4)}, {d.lng.toFixed(4)}. En el sitio público se muestra una zona aproximada.</span>
          </section>
        </div>

        <div className="editor-side">
          <section className="card stack-14 pad-20">
            <h2 className="h2-16">Publicación</h2>
            <div className="field"><label>Estado</label><select className="input h40" value={d.status} onChange={(e) => set({ status: e.target.value as PropertyStatus })}><option value="Borrador">Borrador</option><option value="Publicada">Publicada</option><option value="Pausada">Pausada</option><option value="Vendida">Vendida</option><option value="Alquilada">Alquilada</option></select></div>
            {d.status === "Publicada" && !d.images.length && <span className="muted-12" style={{ color: "#7a5a12" }}>Sin fotos no aparece en el sitio. Agrega al menos una.</span>}
            {isAdmin && <div className="field"><label>Asesor responsable</label><select className="input h40" value={d.agentId} onChange={(e) => set({ agentId: e.target.value })}>{team.filter((u) => u.active || u.id === d.agentId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}
            <div className="row-between">
              <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14 }}>Destacar en portada</span><span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>Aparece en la imagen principal</span></span>
              <Toggle on={d.featured} onToggle={() => set({ featured: !d.featured })} label="Destacar" />
            </div>
          </section>
          {property && (
            <section className="card stack-10 pad-20">
              <div className="row-between"><h2 className="h2-16">Agenda de visitas</h2><Link href={`/visitas?vista=calendario&propiedad=${property.id}`} className="btn btn-ghost" style={{ fontSize: 13 }}>Calendario</Link></div>
              {pVisits.map((v) => (
                <div key={v.id} className="list-row" style={{ padding: "8px 0", gap: 10 }}>
                  <DateBadge {...dayParts(v.date)} mon={undefined} size="sm" />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span className="ellipsis" style={{ fontSize: 13, fontWeight: 500 }}>{v.clientName}</span><span className="muted-12">{v.time} · {v.mode}</span></div>
                  <StatusTag style={VISIT_STATUS_STYLE[v.status]}>{v.status}</StatusTag>
                </div>
              ))}
              {!pVisits.length && <span className="muted-13">Sin visitas próximas para esta propiedad.</span>}
              <button className="btn btn-secondary h38" onClick={() => open({ type: "visit", prefill: { propertyId: property.id, agentId: d.agentId } })}><i className="ph ph-calendar-plus" style={{ fontSize: 16 }} />Agendar visita</button>
            </section>
          )}
          <section className="stack-10">
            <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>Vista previa en el sitio</span>
            <div style={{ maxWidth: 340 }}><PreviewCard p={d} agentName={agentName(d.agentId)} /></div>
          </section>
        </div>
      </div>
    </div>
  );
}
