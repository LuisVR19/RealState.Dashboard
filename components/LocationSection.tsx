"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { reversePlace, searchPlaces } from "@/app/actions/geocode";
import { placesFor } from "@/lib/format";
import { applyPlace, canonical, parseCoords, placeDiff, round6, type KnownPlaces, type LatLng, type PlaceFields, type PlaceResult } from "@/lib/geo";
import { usePanel } from "./panel-provider";

const EditorMap = dynamic(() => import("./EditorMap").then((m) => m.EditorMap), { ssr: false, loading: () => <div className="editor-map" /> });

type Value = PlaceFields & LatLng;

const FIELD_LABEL: Record<keyof PlaceFields, string> = { country: "país", province: "provincia", canton: "cantón", zone: "distrito o barrio", address: "dirección" };
/** Espera tras soltar el marcador antes de consultar qué lugar es (evita una consulta por cada ajuste). */
const REVERSE_DELAY_MS = 700;

const fieldsOf = (x: Value): PlaceFields => ({ country: x.country, province: x.province, canton: x.canton, zone: x.zone, address: x.address });

/**
 * Sección "Ubicación" del editor de anuncios:
 *  1. Buscador: dirección o lugar (OpenStreetMap), o coordenadas / enlace de Google Maps pegados.
 *  2. Mapa: clic o arrastrar el marcador; "Mi ubicación" usa el GPS del dispositivo.
 *  3. Al mover el punto se consulta qué lugar es: rellena los campos vacíos y propone cambiar los demás.
 *  4. Campos con sugerencias según el país elegido; los nombres se ajustan a la forma ya usada en el
 *     inventario ("paraiso" → "Paraíso"), así el filtro del sitio público no ve dos cantones distintos.
 */
export function LocationSection({ value, onChange, pinSet, onPinSet }: { value: Value; onChange: (v: Partial<Value>) => void; pinSet: boolean; onPinSet: () => void }) {
  const { flash, places } = usePanel();
  const uid = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [active, setActive] = useState(0);
  const [searching, startSearch] = useTransition();
  const [locating, setLocating] = useState(false);
  const [suggestion, setSuggestion] = useState<{ place: PlaceResult; fields: (keyof PlaceFields)[] } | null>(null);
  const [copied, setCopied] = useState(false);

  // Valor actual para las respuestas asíncronas (la geocodificación inversa llega después).
  const cur = useRef(value);
  cur.current = value;
  const reverseSeq = useRef(0);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reverseTimer.current) clearTimeout(reverseTimer.current); }, []);

  const scoped = useMemo(() => placesFor(places, value.country, value.province), [places, value.country, value.province]);
  const known: KnownPlaces = useMemo(() => ({ countries: places.countries, provinces: places.provinces, cantons: places.cantons }), [places]);

  /** Aplica un lugar elegido (búsqueda o sugerencia): campos y, si se pide, el punto. */
  const applyResult = (r: PlaceResult, withPoint = true) => {
    const next = applyPlace(fieldsOf(cur.current), r.fields, known);
    onChange({ ...next, ...(withPoint ? { lat: r.lat, lng: r.lng } : {}) });
    onPinSet();
    setSuggestion(null);
    reverseSeq.current++; // una consulta inversa pendiente ya no aplica
  };

  /** Consulta qué lugar hay en el punto: rellena lo vacío y sugiere cambiar lo que difiera. */
  const lookup = (p: LatLng) => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    const seq = ++reverseSeq.current;
    reverseTimer.current = setTimeout(async () => {
      const res = await reversePlace(p.lat, p.lng);
      if (seq !== reverseSeq.current || !res.ok || !res.data) return; // hay una consulta más nueva, o sin datos
      const place = res.data;
      const now = fieldsOf(cur.current);
      // 1) Los campos vacíos se completan solos.
      const empties = Object.fromEntries(Object.entries(place.fields).filter(([k]) => !now[k as keyof PlaceFields].trim()));
      const filled = applyPlace(now, empties, known);
      if (Object.keys(empties).length) onChange(filled);
      // 2) Lo que ya tenía otro valor se propone, sin pisarlo (la dirección escrita a mano nunca se propone cambiar).
      const fields = placeDiff(filled, place.fields, known).filter((k) => k !== "address");
      setSuggestion(fields.length ? { place, fields } : null);
    }, REVERSE_DELAY_MS);
  };

  const moveTo = (p: LatLng) => {
    onChange({ lat: round6(p.lat), lng: round6(p.lng) });
    onPinSet();
    lookup(p);
  };

  const search = () => {
    const q = query.trim();
    if (!q) return;
    const coords = parseCoords(q);
    if (coords) {
      moveTo(coords);
      setResults(null);
      setQuery("");
      flash("Punto ubicado con las coordenadas pegadas");
      return;
    }
    startSearch(async () => {
      const res = await searchPlaces(q);
      if (!res.ok) return flash(res.error, "error");
      setResults(res.data);
      setActive(0);
    });
  };

  const pick = (r: PlaceResult) => {
    applyResult(r);
    setResults(null);
    setQuery("");
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const list = results ?? [];
    if (e.key === "Enter") {
      e.preventDefault();
      if (list.length) pick(list[active]);
      else search();
    } else if (e.key === "ArrowDown" && list.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % list.length);
    } else if (e.key === "ArrowUp" && list.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + list.length) % list.length);
    } else if (e.key === "Escape" && results) {
      e.preventDefault();
      setResults(null);
    }
  };

  const locate = () => {
    if (!("geolocation" in navigator)) return flash("Este navegador no permite obtener la ubicación.", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        moveTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        flash(pos.coords.accuracy > 100 ? `Ubicación aproximada (±${Math.round(pos.coords.accuracy)} m): ajusta el marcador` : "Ubicación del dispositivo aplicada");
      },
      (err) => {
        setLocating(false);
        flash(err.code === err.PERMISSION_DENIED ? "Permiso de ubicación denegado. Actívalo en el navegador o busca la dirección." : "No se pudo obtener la ubicación. Intenta de nuevo o busca la dirección.", "error");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      flash("No se pudo copiar", "error");
    }
  };

  /** Normaliza al salir del campo: espacios y la forma conocida del nombre. */
  const tidy = (k: "country" | "province" | "canton", list: readonly string[]) => () => {
    const x = canonical(value[k], list);
    if (x !== value[k]) onChange({ [k]: x });
  };

  const setCountry = (country: string) => {
    // Otro país: la provincia anterior ya no aplica.
    const changed = country.trim().localeCompare(value.country.trim(), "es", { sensitivity: "base" }) !== 0;
    onChange(changed && value.province ? { country, province: "" } : { country });
  };

  const listId = `${uid}-results`;
  const cr = /^costa rica$/i.test(value.country.trim());
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`;

  return (
    <section className="card stack-14 pad-20">
      <div className="row-between" style={{ flexWrap: "wrap", gap: 8 }}>
        <h2 className="h2-16">Ubicación</h2>
        {pinSet
          ? <span className="loc-status is-ok"><i className="ph-fill ph-check-circle" />Punto marcado</span>
          : <span className="loc-status is-warn"><i className="ph-fill ph-warning" />Falta marcar el punto</span>}
      </div>

      {/* 1. Buscador */}
      <div className="loc-search">
        <div className="loc-search-row">
          <div className="loc-search-box">
            <i className="ph ph-magnifying-glass" aria-hidden />
            <input
              className="input h40" value={query} maxLength={300}
              onChange={(e) => { setQuery(e.target.value); if (results) setResults(null); }}
              onKeyDown={onSearchKey}
              onBlur={() => setTimeout(() => setResults(null), 150)}
              placeholder="Dirección, lugar, coordenadas o enlace de Google Maps"
              aria-label="Buscar ubicación" role="combobox" aria-expanded={!!results} aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={results?.length ? `${listId}-${active}` : undefined}
            />
            {query && <button type="button" className="loc-clear" onClick={() => { setQuery(""); setResults(null); }} aria-label="Borrar búsqueda"><i className="ph ph-x" /></button>}
          </div>
          <button type="button" className="btn btn-primary h40" onClick={search} disabled={searching || !query.trim()} style={{ flex: "none" }}>
            <i className={`ph ${searching ? "ph-spinner loc-spin" : "ph-magnifying-glass"}`} />Buscar
          </button>
          <button type="button" className="btn btn-secondary h40" onClick={locate} disabled={locating} style={{ flex: "none" }} title="Usar la ubicación de este dispositivo (si estás en el lugar)" aria-label="Mi ubicación">
            <i className={`ph ${locating ? "ph-spinner loc-spin" : "ph-crosshair"}`} /><span className="loc-hide-sm">Mi ubicación</span>
          </button>
        </div>
        {results && (
          <ul id={listId} role="listbox" className="loc-results" aria-label="Resultados de la búsqueda">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                className={i === active ? "is-active" : undefined} onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(r); }}>
                <i className="ph ph-map-pin" aria-hidden />
                <span className="loc-result-text"><span className="ellipsis" style={{ fontWeight: 500 }}>{r.name}</span><span className="muted-12 ellipsis">{r.label}</span></span>
              </li>
            ))}
            {!results.length && <li className="loc-empty">Sin resultados. Prueba con menos palabras (“Santa Lucía, Paraíso”) o marca el punto en el mapa.</li>}
          </ul>
        )}
      </div>

      {/* 2. Mapa */}
      <div className={`loc-map${pinSet ? "" : " is-unset"}`}>
        <EditorMap lat={value.lat} lng={value.lng} onMove={(lat, lng) => moveTo({ lat, lng })} />
        <div className="loc-coords">
          <span>{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
          <button type="button" onClick={copy} aria-label="Copiar coordenadas" title="Copiar coordenadas"><i className={`ph ${copied ? "ph-check" : "ph-copy"}`} /></button>
          <a href={gmaps} target="_blank" rel="noopener noreferrer" aria-label="Ver en Google Maps" title="Ver en Google Maps"><i className="ph ph-arrow-square-out" /></a>
        </div>
        {!pinSet && <div className="loc-hint"><i className="ph ph-hand-pointing" />Busca la dirección o haz clic en el mapa</div>}
      </div>

      {/* 3. Sugerencia desde el mapa */}
      {suggestion && (
        <div className="loc-suggest" role="status">
          <i className="ph-fill ph-map-pin-area" aria-hidden style={{ fontSize: 20, color: "var(--color-accent)" }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13 }}>El punto está en <b>{suggestion.place.label.split(",").slice(0, 3).join(",")}</b></span>
            <span className="muted-12">¿Actualizar {suggestion.fields.map((k) => FIELD_LABEL[k]).join(", ")}?</span>
          </span>
          <button type="button" className="btn btn-primary h32" onClick={() => applyResult(suggestion.place, false)}>Actualizar</button>
          <button type="button" className="btn btn-ghost btn-icon b32" onClick={() => setSuggestion(null)} aria-label="Descartar sugerencia"><i className="ph ph-x" /></button>
        </div>
      )}

      {/* 4. Campos */}
      <div className="form-grid form-grid-170">
        <div className="field"><label htmlFor="pe-country">País *</label><input id="pe-country" className="input h40" list="pe-countries" maxLength={60} autoComplete="off" value={value.country} onChange={(e) => setCountry(e.target.value)} onBlur={tidy("country", places.countries)} placeholder="Costa Rica" /></div>
        <div className="field"><label htmlFor="pe-province">Provincia o estado</label><input id="pe-province" className="input h40" list="pe-provinces" maxLength={80} autoComplete="off" value={value.province} onChange={(e) => onChange({ province: e.target.value })} onBlur={tidy("province", scoped.provinces)} placeholder={cr ? "Cartago" : "Florida, Chiriquí…"} /></div>
        <div className="field"><label htmlFor="pe-canton">Ciudad o cantón *</label><input id="pe-canton" className="input h40" list="pe-cantons" maxLength={80} autoComplete="off" value={value.canton} onChange={(e) => onChange({ canton: e.target.value })} onBlur={tidy("canton", [...scoped.cantons, ...places.cantons])} placeholder={cr ? "Paraíso" : "Miami, Boquete…"} /></div>
        <div className="field"><label htmlFor="pe-zone">Distrito o barrio *</label><input id="pe-zone" className="input h40" maxLength={80} value={value.zone} onChange={(e) => onChange({ zone: e.target.value })} onBlur={() => { const z = value.zone.trim().replace(/\s+/g, " "); if (z !== value.zone) onChange({ zone: z }); }} placeholder="Santa Lucía" /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="pe-address">Dirección de referencia</label><input id="pe-address" className="input h40" maxLength={200} value={value.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="200 m sur de la iglesia, portón negro" /></div>
        <datalist id="pe-countries">{places.countries.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="pe-provinces">{scoped.provinces.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="pe-cantons">{scoped.cantons.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <span className="muted-12">La dirección de referencia se ve en la ficha pública; el punto exacto no: el mapa del sitio muestra una zona aproximada.</span>
    </section>
  );
}
