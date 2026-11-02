// Barras por día de una sola métrica (sección Actividad). Una serie por gráfico: vistas y contactos
// tienen escalas muy distintas, así que van en gráficos separados (nunca dos ejes en uno).
// Barras en HTML (no SVG) para que se adapten al ancho sin deformarse; cada barra muestra su valor
// al pasar el mouse (title) y el contenedor resume el gráfico para lectores de pantalla.
import { dayParts } from "@/lib/dates";

export interface ChartPoint {
  day: string;
  value: number;
}

const short = (iso: string) => {
  const d = dayParts(iso);
  return `${d.num} ${d.mon}`;
};

export function ActivityChart({ title, unit, points }: { title: string; unit: string; points: ChartPoint[] }) {
  const total = points.reduce((s, p) => s + p.value, 0);
  const peak = points.reduce((m, p) => (p.value > m.value ? p : m), points[0] ?? { day: "", value: 0 });
  const max = Math.max(1, peak.value);
  const summary = total
    ? `${title}: ${total} ${unit} en el período; el día con más fue ${short(peak.day)} con ${peak.value}.`
    : `${title}: sin datos en el período.`;

  return (
    <section className="card stack-12">
      <div className="row-between">
        <h2 className="h2-16">{title}</h2>
        <span className="muted-12">{total} en total</span>
      </div>
      <div className="bars" role="img" aria-label={summary}>
        {points.map((p) => (
          <div key={p.day} className="bar-slot" title={`${short(p.day)}: ${p.value} ${unit}`}>
            <div className="bar" style={{ height: `${(p.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      {points.length > 0 && (
        <div className="bars-axis" aria-hidden="true">
          <span>{short(points[0].day)}</span>
          {total > 0 && <span>Máx. {peak.value} ({short(peak.day)})</span>}
          <span>{short(points[points.length - 1].day)}</span>
        </div>
      )}
    </section>
  );
}
