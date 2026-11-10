"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from "react";
import { saveProperty, type PropertyInput } from "@/app/actions/properties";
import { ago, dayParts } from "@/lib/dates";
import { amenityIcon, CATEGORIES, CATEGORY_ICON, categoryOf, DEFAULT_COUNTRY, DRIVETRAINS, FUELS, itemNoun, OP_LABEL, operationsOf, TRANSMISSIONS, typesOf, VISIT_STATUS_STYLE } from "@/lib/format";
import type { Category, Drivetrain, Fuel, Operation, Property, PropertyStatus, PropertyType, Transmission } from "@/lib/types";
import { DEFAULT_POINT } from "@/lib/geo";
import { imageProblem, uploadImage } from "@/lib/upload";
import { Chip, toggle } from "./Chip";
import { LocationSection } from "./LocationSection";
import { usePanel } from "./panel-provider";
import { PreviewCard } from "./PreviewCard";
import { DateBadge, StatusTag, Toggle } from "./ui";

const blank = (agentId: string): Property => ({
  id: "", code: "", title: "", description: "", operation: "Venta", type: "Casa", category: "Inmueble", status: "Borrador", featured: false, country: DEFAULT_COUNTRY, province: "Cartago", canton: "Paraíso", zone: "", address: "",
  ...DEFAULT_POINT, price: 0, bedrooms: 0, bathrooms: 0, areaM2: 0, parkingSpaces: 0, agentId, amenities: [], images: [], updatedAt: "",
});

/** Archivos elegidos y aún no subidos, por su URL local (blob:) en `d.images`. */
type PendingFiles = Map<string, File>;

/**
 * Editor de propiedad (crear y editar). Los cambios viven en el borrador local y alimentan la vista previa.
 * Al guardar: (1) rpc save_property con los datos y las fotos ya subidas; (2) si hay archivos nuevos,
 * se suben a Storage (property-images/<id>/…, la política exige ser dueño o admin) y (3) se guarda la
 * galería final en el orden elegido. Si la subida falla, los datos quedan guardados y se avisa.
 */
export function PropertyEditor({ property, initialCategory = "Inmueble" }: { property?: Property; initialCategory?: Category }) {
  const { me, team, isAdmin, visits, today, agentName, open, run, flash, amenities } = usePanel();
  const router = useRouter();
  const [d, setD] = useState<Property>(() =>
    property ?? (initialCategory === "Vehículo" ? { ...blank(me.id), category: "Vehículo", type: "Carro" } : blank(me.id)),
  );
  const [files, setFiles] = useState<PendingFiles>(() => new Map());
  const [urlIn, setUrlIn] = useState("");
  // ¿El asesor ya fijó el punto? En un anuncio nuevo el marcador arranca en el punto por defecto.
  const [pinSet, setPinSet] = useState(() => !!property);
  // Baños admite decimales ("2,5"): se edita como texto; si no, la coma se pierde al escribir.
  const [bathText, setBathText] = useState(() => (d.bathrooms ? String(d.bathrooms).replace(".", ",") : ""));
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
    country: x.country, province: x.province, canton: x.canton, zone: x.zone, address: x.address, lat: x.lat, lng: x.lng, price: x.price, maintenanceFee: x.maintenanceFee,
    bedrooms: x.bedrooms, bathrooms: x.bathrooms, areaM2: x.areaM2, parkingSpaces: x.parkingSpaces, guests: x.guests, floor: x.floor,
    yearBuilt: x.yearBuilt, delivery: x.delivery, agentId: x.agentId,
    brand: x.brand, model: x.model, mileageKm: x.mileageKm, transmission: x.transmission, fuel: x.fuel, drivetrain: x.drivetrain,
    engineCc: x.engineCc, color: x.color, doors: x.doors,
    // Solo las amenidades / el equipamiento de la categoría del anuncio.
    amenityIds: amenities.filter((a) => a.category === categoryOf(x.type) && x.amenities.includes(a.name)).map((a) => a.id),
  });

  const cat = categoryOf(d.type);
  const vehicle = cat === "Vehículo";
  const noun = itemNoun(cat);
  /** Cambiar de categoría: primer tipo de la nueva, operación válida y sin amenidades de la otra. */
  const setCategory = (c: Category) => {
    if (c === cat) return;
    const names = new Set(amenities.filter((a) => a.category === c).map((a) => a.name));
    set({ category: c, type: typesOf(c)[0], operation: operationsOf(c).includes(d.operation) ? d.operation : "Venta", amenities: d.amenities.filter((a) => names.has(a)) });
  };
  const text = (k: "brand" | "model" | "color") => (e: ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value });

  /** Quita una foto; si era un archivo local aún no subido, libera su URL blob:. */
  const removeImage = (i: number) => {
    const src = d.images[i];
    if (files.has(src)) {
      URL.revokeObjectURL(src);
      const next = new Map(files);
      next.delete(src);
      setFiles(next);
    }
    set({ images: d.images.filter((_, j) => j !== i) });
  };

  const save = () => {
    // Publicado en el punto por defecto, el anuncio aparecería en el centro de Paraíso en el mapa del sitio.
    if (!pinSet && d.status === "Publicada") {
      flash("Marca la ubicación en el mapa antes de publicar (busca la dirección o haz clic en el mapa).", "error");
      document.getElementById("pe-location")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
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
      flash(property ? "Cambios guardados" : `${noun[0].toUpperCase() + noun.slice(1)} ${code} creado${vehicle ? "" : "a"}`);
      router.push("/propiedades");
    });
  };

  const priceLabel = d.operation === "Alquiler" ? "Precio mensual (₡)" : d.operation === "Vacacional" ? "Precio por noche (₡)" : d.operation === "Preventa" ? "Precio desde (₡)" : "Precio (₡)";
  const pVisits = property ? visits.filter((v) => v.propertyId === property.id && v.date >= today && v.status !== "Cancelada" && v.status !== "Realizada").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 4) : [];

  return (
    <div className="stack-18">
      <div className="editor-bar">
        <Link href="/propiedades" className="btn btn-secondary btn-icon" aria-label="Volver"><i className="ph ph-arrow-left" style={{ fontSize: 16 }} /></Link>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>{property ? `Editar ${noun}` : vehicle ? "Nuevo vehículo" : "Nueva propiedad"}</h1>
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
            <div className="chip-group"><span className="muted-12">¿Qué vas a publicar?</span>
              <div className="chip-row" role="radiogroup" aria-label="Categoría">
                {CATEGORIES.map((c) => <Chip key={c} size="md" label={c} icon={CATEGORY_ICON[c]} on={cat === c} onClick={() => setCategory(c)} />)}
              </div>
            </div>
            <div className="field"><label>Título del anuncio *</label><input className="input h40" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={vehicle ? "Ej. Toyota Hilux 2021 4x4, único dueño" : "Ej. Casa con jardín y vista al valle en Paraíso"} /></div>
            <div className="form-grid form-grid-170">
              <div className="field"><label>Operación</label><select className="input h40" value={d.operation} onChange={(e) => set({ operation: e.target.value as Operation })}>{operationsOf(cat).map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}</select></div>
              <div className="field"><label>Tipo</label><select className="input h40" value={d.type} onChange={(e) => set({ type: e.target.value as PropertyType })}>{typesOf(cat).map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>{priceLabel} *</label><input className="input h40" inputMode="numeric" value={numVal(d.price)} onChange={num("price")} placeholder="0" /></div>
              <div className="field"><label>Etiqueta (opcional)</label><input className="input h40" maxLength={30} value={d.tag ?? ""} onChange={(e) => set({ tag: e.target.value })} placeholder="Exclusiva, Nuevo…" /></div>
            </div>
            <div className="field"><label>Descripción</label><textarea className="input" value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder={vehicle ? "Estado, mantenimientos, extras y motivo de venta." : "Describe distribución, acabados y entorno."} style={{ minHeight: 120 }} /></div>
          </section>

          <section className="card stack-14 pad-20">
            <h2 className="h2-16">Características</h2>
            {vehicle ? (
              <div className="form-grid form-grid-130">
                <div className="field"><label htmlFor="pe-brand">Marca</label><input id="pe-brand" className="input h40" maxLength={40} value={d.brand ?? ""} onChange={text("brand")} placeholder="Toyota" /></div>
                <div className="field"><label htmlFor="pe-model">Modelo</label><input id="pe-model" className="input h40" maxLength={60} value={d.model ?? ""} onChange={text("model")} placeholder="Hilux SR 2.4" /></div>
                <div className="field"><label htmlFor="pe-year">Año</label><input id="pe-year" className="input h40" inputMode="numeric" value={numVal(d.yearBuilt)} onChange={num("yearBuilt")} placeholder="2021" /></div>
                <div className="field"><label htmlFor="pe-km">Kilometraje</label><input id="pe-km" className="input h40" inputMode="numeric" value={d.mileageKm != null ? String(d.mileageKm) : ""} onChange={(e) => { const s = e.target.value.replace(/\D/g, ""); set({ mileageKm: s ? Number(s) : undefined }); }} placeholder="45000" /></div>
                <div className="field"><label htmlFor="pe-trans">Transmisión</label><select id="pe-trans" className="input h40" value={d.transmission ?? ""} onChange={(e) => set({ transmission: (e.target.value || undefined) as Transmission | undefined })}><option value="">—</option>{TRANSMISSIONS.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div className="field"><label htmlFor="pe-fuel">Combustible</label><select id="pe-fuel" className="input h40" value={d.fuel ?? ""} onChange={(e) => set({ fuel: (e.target.value || undefined) as Fuel | undefined })}><option value="">—</option>{FUELS.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div className="field"><label htmlFor="pe-drive">Tracción</label><select id="pe-drive" className="input h40" value={d.drivetrain ?? ""} onChange={(e) => set({ drivetrain: (e.target.value || undefined) as Drivetrain | undefined })}><option value="">—</option>{DRIVETRAINS.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div className="field"><label htmlFor="pe-cc">Cilindrada (cc)</label><input id="pe-cc" className="input h40" inputMode="numeric" value={numVal(d.engineCc)} onChange={num("engineCc")} placeholder="2400" /></div>
                <div className="field"><label htmlFor="pe-color">Color</label><input id="pe-color" className="input h40" maxLength={30} value={d.color ?? ""} onChange={text("color")} placeholder="Blanco" /></div>
                {d.type !== "Moto" && <div className="field"><label htmlFor="pe-doors">Puertas</label><input id="pe-doors" className="input h40" inputMode="numeric" maxLength={1} value={numVal(d.doors)} onChange={num("doors")} placeholder="4" /></div>}
              </div>
            ) : (
            <div className="form-grid form-grid-130">
              <div className="field"><label>Habitaciones</label><input className="input h40" inputMode="numeric" value={numVal(d.bedrooms)} onChange={num("bedrooms")} placeholder="0" /></div>
              <div className="field"><label>Baños</label><input className="input h40" inputMode="decimal" maxLength={4} value={bathText} onChange={(e) => { const s = e.target.value.replace(".", ",").replace(/[^\d,]/g, "").replace(/,(?=.*,)/g, ""); setBathText(s); set({ bathrooms: Number(s.replace(",", ".")) || 0 }); }} placeholder="0" /></div>
              <div className="field"><label>Área (m²)</label><input className="input h40" inputMode="numeric" value={numVal(d.areaM2)} onChange={num("areaM2")} placeholder="0" /></div>
              <div className="field"><label>Parqueos</label><input className="input h40" inputMode="numeric" value={numVal(d.parkingSpaces)} onChange={num("parkingSpaces")} placeholder="0" /></div>
              <div className="field"><label>Año</label><input className="input h40" inputMode="numeric" value={numVal(d.yearBuilt)} onChange={num("yearBuilt")} placeholder="2020" /></div>
              <div className="field"><label>Mantenimiento (₡/mes)</label><input className="input h40" inputMode="numeric" value={numVal(d.maintenanceFee)} onChange={num("maintenanceFee")} placeholder="0" /></div>
              {(d.type === "Apartamento" || d.type === "Oficina") && <div className="field"><label>Piso</label><input className="input h40" maxLength={20} value={d.floor ?? ""} onChange={(e) => set({ floor: e.target.value })} placeholder="3" /></div>}
              {d.operation === "Vacacional" && <div className="field"><label>Huéspedes</label><input className="input h40" inputMode="numeric" value={numVal(d.guests)} onChange={num("guests")} placeholder="0" /></div>}
              {d.operation === "Preventa" && <div className="field"><label>Entrega estimada</label><input className="input h40" value={d.delivery ?? ""} onChange={(e) => set({ delivery: e.target.value })} placeholder="Junio 2027" /></div>}
            </div>
            )}
            <div className="chip-group"><span className="muted-12">{vehicle ? "Equipamiento" : "Amenidades"}</span>
              <div className="chip-row">{amenities.filter((a) => a.category === cat).map(({ id, name: a }) => <Chip key={id} size="md" label={a} icon={amenityIcon(a)} on={d.amenities.includes(a)} onClick={() => set({ amenities: toggle(d.amenities, a) })} />)}</div>
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
                    <button onClick={() => removeImage(i)} title="Quitar" aria-label="Quitar foto" style={{ color: "#8a2f24" }}><i className="ph ph-x" /></button>
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

          <div id="pe-location" style={{ scrollMarginTop: 80 }}>
            <LocationSection
              value={{ country: d.country, province: d.province, canton: d.canton, zone: d.zone, address: d.address, lat: d.lat, lng: d.lng }}
              onChange={set} pinSet={pinSet} onPinSet={() => setPinSet(true)}
            />
          </div>
        </div>

        <div className="editor-side">
          <section className="card stack-14 pad-20">
            <h2 className="h2-16">Publicación</h2>
            <div className="field"><label>Estado</label><select className="input h40" value={d.status} onChange={(e) => set({ status: e.target.value as PropertyStatus })}><option value="Borrador">Borrador</option><option value="Publicada">Publicada</option><option value="Pausada">Pausada</option><option value="Vendida">Vendida</option><option value="Alquilada">Alquilada</option></select></div>
            {d.status === "Publicada" && !d.images.length && <span className="muted-12" style={{ color: "#7a5a12" }}>Sin fotos no aparece en el sitio. Agrega al menos una.</span>}
            {d.status === "Publicada" && !pinSet && <a href="#pe-location" className="muted-12" style={{ color: "#7a5a12" }}>Falta marcar la ubicación en el mapa para publicar.</a>}
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
              {!pVisits.length && <span className="muted-13">Sin visitas próximas para {vehicle ? "este vehículo" : "esta propiedad"}.</span>}
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
