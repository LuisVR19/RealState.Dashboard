"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { usePanel } from "./panel-provider";

const TITLES: Record<string, string> = { "/": "Resumen", "/propiedades": "Propiedades", "/clientes": "Clientes", "/matches": "Matches", "/visitas": "Visitas", "/asesores": "Asesores", "/zonas": "Zonas", "/actividad": "Actividad del sitio", "/perfil": "Mi perfil" };

export function AppShell({ children, siteUrl }: { children: ReactNode; siteUrl: string }) {
  const { me, isAdmin, properties, clients, matches, visits, team, zones } = usePanel();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [pathname]);

  const nav: [string, string, string, number?][] = [
    ["/", "Resumen", "ph-squares-four"],
    ["/propiedades", "Propiedades", "ph-house-line", properties.length],
    ["/clientes", "Clientes", "ph-users", clients.filter((c) => c.status === "Nuevo").length],
    ["/matches", "Matches", "ph-sparkle", matches.length],
    ["/visitas", "Visitas", "ph-calendar-check", visits.filter((v) => v.status === "Pendiente").length],
    ...(isAdmin ? ([["/asesores", "Asesores", "ph-users-three", team.length], ["/zonas", "Zonas", "ph-map-pin-area", zones.length], ["/actividad", "Actividad", "ph-chart-line-up", 0]] as [string, string, string, number][]) : []),
    ["/perfil", "Mi perfil", "ph-user-circle"],
  ];
  const section = "/" + (pathname.split("/")[1] ?? "");
  const title = pathname.startsWith("/propiedades/") ? "Editor" : TITLES[section] ?? "";

  return (
    <div className="shell">
      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar${navOpen ? " is-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark" style={{ width: 30, height: 30 }}><i className="ph ph-house-line" style={{ fontSize: 16 }} /></span>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Thomas Mata S.A.</span>
            <span style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>{isAdmin ? "Administración" : "Panel de asesor"}</span>
          </span>
        </div>
        {nav.map(([href, label, icon, count]) => (
          <Link key={href} href={href} className={`side-link${section === href ? " is-active" : ""}`}>
            <i className={`ph ${icon}`} /><span style={{ flex: 1 }}>{label}</span>
            {!!count && <span className="side-count">{count}</span>}
          </Link>
        ))}
        <div className="sidebar-foot">
          <a href={siteUrl} target="_blank" rel="noopener" className="side-site"><i className="ph ph-arrow-square-out" style={{ fontSize: 17 }} />Ver sitio público</a>
          <div className="side-me">
            <span className="avatar avatar-34">{me.initials}</span>
            <span className="side-me-text"><span>{me.name}</span><span>{me.email}</span></span>
            <form action={logout}><button className="btn btn-icon" aria-label="Cerrar sesión" style={{ width: 32, height: 32, color: "var(--color-neutral-400)" }}><i className="ph ph-sign-out" style={{ fontSize: 17 }} /></button></form>
          </div>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <button className="btn btn-secondary btn-icon" onClick={() => setNavOpen(true)} aria-label="Menú"><i className="ph ph-list" style={{ fontSize: 18 }} /></button>
          <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{title}</span>
          <span className="avatar avatar-32">{me.initials}</span>
        </div>
        <div className="main-scroll">
          <div className="page">{children}</div>
        </div>
      </div>
    </div>
  );
}
