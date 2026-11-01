// Fechas en hora de Costa Rica, para que servidor y navegador calculen lo mismo.
const TZ = "America/Costa_Rica";

/** Hoy (YYYY-MM-DD) en Costa Rica. */
export const todayISO = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);

export const isoDaysFromToday = (n: number) => {
  const d = new Date(todayISO() + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DOW_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MON_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const atNoon = (iso: string) => new Date(iso.slice(0, 10) + "T12:00:00Z");
export const dayParts = (iso: string) => {
  const d = atNoon(iso);
  return { dow: DOW[d.getUTCDay()], num: d.getUTCDate(), mon: MON[d.getUTCMonth()] };
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Viernes 30 de octubre" */
export const longDay = (iso: string) => {
  const d = atNoon(iso);
  return `${cap(DOW_LONG[d.getUTCDay()])} ${d.getUTCDate()} de ${MON_LONG[d.getUTCMonth()]}`;
};
export const monthLabel = (year: number, month: number) => `${cap(MON_LONG[month])} ${year}`;

/** "Hoy", "Ayer", "Hace 5 d" */
export const ago = (iso: string) => {
  const d = Math.round((atNoon(todayISO()).getTime() - atNoon(iso).getTime()) / 864e5);
  return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} d`;
};

export const VISIT_TIMES = ["08:30", "10:00", "11:30", "14:00", "15:30", "17:00"];
