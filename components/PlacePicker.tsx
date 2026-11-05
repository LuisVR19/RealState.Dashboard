"use client";

import { useId, useState } from "react";
import { Chip, toggle } from "./Chip";

/**
 * Selección múltiple de ubicaciones (ciudad / cantón de cualquier país): chips con las conocidas
 * más un campo para agregar una que todavía no esté en la lista.
 */
export function PlacePicker({ value, onChange, suggestions, size = "sm" }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; size?: "sm" | "md" | "lg" }) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const options = [...new Set([...suggestions, ...value])];
  const add = () => {
    const x = draft.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!x) return;
    const known = options.find((o) => o.localeCompare(x, "es", { sensitivity: "base" }) === 0) ?? x;
    if (!value.includes(known)) onChange(value.concat(known));
    setDraft("");
  };
  return (
    <>
      <div className="chip-row">{options.map((c) => <Chip key={c} size={size} label={c} on={value.includes(c)} onClick={() => onChange(toggle(value, c))} />)}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input className="input h38" list={listId} value={draft} maxLength={80} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Otra ciudad o cantón (cualquier país)" aria-label="Agregar ubicación" />
        <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>
        <button type="button" className="btn btn-secondary h38" style={{ flex: "none" }} onClick={add}>Agregar</button>
      </div>
    </>
  );
}
