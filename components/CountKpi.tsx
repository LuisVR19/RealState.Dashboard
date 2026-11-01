import Link from "next/link";

export function CountKpi({ label, icon, value, href }: { label: string; icon: string; value: number; href: string }) {
  return (
    <Link href={href} className="kpi">
      <span className="kpi-label"><i className={`ph ${icon}`} />{label}</span>
      <span className="kpi-value">{value}</span>
    </Link>
  );
}
