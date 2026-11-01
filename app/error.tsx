"use client";

/** Falla al cargar datos del panel (red, Supabase caído…). No muestra detalles internos. */
export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="table-empty" style={{ paddingTop: 40 }}>
      <span style={{ fontSize: 18, fontWeight: 500 }}>No pudimos cargar el panel</span>
      <span className="muted-14">Revisa tu conexión e intenta de nuevo. Si sigue fallando, avisa al administrador.</span>
      <button className="btn btn-primary h40" onClick={reset}>Reintentar</button>
    </div>
  );
}
