"use client";

type Size = "sm" | "md" | "lg";

/** Botón seleccionable de filtros y preferencias. */
export function Chip({ label, icon, on, onClick, size }: { label: string; icon?: string; on?: boolean; onClick?: () => void; size?: Size }) {
  return (
    <button type="button" onClick={onClick} className={`chip${size ? " chip-" + size : ""}${on ? " is-on" : ""}`} aria-pressed={!!on}>
      {icon && <i className={`ph ${icon}`} />}
      {label}
    </button>
  );
}

export function ChipGroup({ title, children, strong }: { title: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="chip-group">
      <span className={strong ? "chip-group-title is-strong" : "chip-group-title"}>{title}</span>
      <div className="chip-row">{children}</div>
    </div>
  );
}

/** Alterna un valor dentro de una lista (selección múltiple). */
export const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v));
