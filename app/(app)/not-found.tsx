import Link from "next/link";

export default function NotFound() {
  return (
    <div className="table-empty" style={{ paddingTop: 40 }}>
      <span style={{ fontSize: 18, fontWeight: 500 }}>No encontramos esta página</span>
      <span className="muted-14">Puede que no tengas acceso o que el registro ya no exista.</span>
      <Link href="/" className="btn btn-primary h40">Volver al resumen</Link>
    </div>
  );
}
