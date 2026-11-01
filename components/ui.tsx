"use client";

import type { CSSProperties, ReactNode } from "react";

/** Etiqueta de estado con colores [fondo, texto]. */
export const StatusTag = ({ style: [bg, fg], children, extra }: { style: [string, string]; children: ReactNode; extra?: CSSProperties }) => (
  <span className="tag" style={{ background: bg, color: fg, ...extra }}>{children}</span>
);

/** Interruptor encendido/apagado. */
export const Toggle = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
  <button type="button" onClick={onToggle} aria-label={label} aria-pressed={on} className={`toggle${on ? " is-on" : ""}`}><span /></button>
);

/** Fecha en bloque (día de la semana, número y mes). */
export const DateBadge = ({ dow, num, mon, size = "md" }: { dow: string; num: number; mon?: string; size?: "sm" | "md" | "lg" }) => (
  <div className={`date-badge date-badge-${size}`}>
    <span className="date-badge-dow">{dow}</span>
    <span className="date-badge-num">{num}</span>
    {mon && <span className="date-badge-mon">{mon}</span>}
  </div>
);

/** Pestaña con contador (filtros por estado). */
export const CountTab = ({ label, count, on, onClick }: { label: string; count: number; on: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={`chip count-tab${on ? " is-on" : ""}`}>{label}<span className="count-tab-n">{count}</span></button>
);

export const SearchInput = ({ value, onChange, placeholder, maxWidth = 360 }: { value: string; onChange: (v: string) => void; placeholder: string; maxWidth?: number }) => (
  <div className="search-input" style={{ maxWidth }}>
    <i className="ph ph-magnifying-glass" />
    <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const PageHead = ({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) => (
  <div className="page-head">
    <div><h1 className="page-title">{title}</h1><div className="muted-14">{sub}</div></div>
    {action}
  </div>
);

export const Thumb = ({ src, w, h }: { src?: string; w: number; h: number }) => (
  <div className="thumb" style={{ width: w, height: h }}>{src && <img src={src} alt="" />}</div>
);

export function DialogShell({ title, onClose, width = 560, children, footer }: { title: string; onClose: () => void; width?: number; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="dialog-backdrop z-modal" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: `min(${width}px,100%)`, maxHeight: "calc(100dvh - 32px)", overflowY: "auto", gap: 16, padding: 22 }}>
        <div className="row-between"><span className="dialog-title">{title}</span><button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Cerrar"><i className="ph ph-x" style={{ fontSize: 16 }} /></button></div>
        {children}
        {footer}
      </div>
    </div>
  );
}
