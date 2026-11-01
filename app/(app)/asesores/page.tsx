"use client";

import { notFound } from "next/navigation";
import { setMemberActive, setOwner } from "@/app/actions/team";
import { usePanel } from "@/components/panel-provider";
import { PageHead, StatusTag, Toggle } from "@/components/ui";

/**
 * Equipo (solo admin). Los miembros no se borran (sus propiedades, clientes y visitas dependen de
 * ellos): se desactivan, lo que les corta el acceso y los saca del sitio al instante.
 */
export default function TeamPage() {
  const { team, catalog, isAdmin, me, open, run, flash } = usePanel();
  if (!isAdmin) notFound();

  const toggleActive = (id: string, name: string, active: boolean) =>
    id === me.id
      ? flash("No puedes desactivar tu propia cuenta", "error")
      : active
        ? open({ type: "confirm", title: "Desactivar cuenta", body: `${name} ya no podrá entrar al panel y dejará de aparecer en el sitio. Sus propiedades, clientes y visitas se conservan para que las reasignes.`, ok: "Desactivar", onOk: () => run(() => setMemberActive(id, false), "Cuenta desactivada") })
        : run(() => setMemberActive(id, true), "Cuenta activada");

  return (
    <div className="stack-18">
      <PageHead title="Asesores y usuarios" sub="Cuentas con acceso al panel y perfiles visibles en el sitio." action={<button className="btn btn-primary h40" onClick={() => open({ type: "user" })}><i className="ph ph-user-plus" style={{ fontSize: 16 }} />Invitar</button>} />
      <div className="grid-cards-280">
        {team.map((u) => (
          <div key={u.id} className="card stack-14 pad-18" style={{ opacity: u.active ? 1 : 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="avatar avatar-46">{u.initials}</span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 15, fontWeight: 500 }}>{u.name}</span><span className="muted-12 ellipsis">{u.email}</span></div>
              {u.isOwner && <StatusTag style={["var(--color-accent)", "#fff"]}>Dueño</StatusTag>}
              <StatusTag style={u.role === "Admin" ? ["var(--color-text)", "#fff"] : ["var(--color-accent-900)", "var(--color-accent-200)"]}>{u.role === "Admin" ? "Administrador" : "Asesor"}</StatusTag>
            </div>
            {u.isOwner && <span className="muted-12">Su teléfono, horario y ubicación son el contacto general del sitio.</span>}
            <div className="kv-grid">
              <span>Especialidad</span><span>{u.specialty || "—"}</span>
              <span>Zonas</span><span>{u.zones || "—"}</span>
              <span>Propiedades</span><span>{catalog.filter((p) => p.agentId === u.id).length}</span>
            </div>
            <div className="card-foot">
              <Toggle on={u.active} label="Activo" onToggle={() => toggleActive(u.id, u.name, u.active)} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--color-neutral-400)" }}>{u.active ? "Activo" : "Desactivado"}</span>
              {u.role === "Admin" && u.active && !u.isOwner && (
                <button className="btn btn-secondary h34" style={{ fontSize: 13 }}
                  onClick={() => open({ type: "confirm", title: "Cambiar dueño", body: `${u.name} pasará a ser el dueño: su teléfono, horario y ubicación serán el contacto general del sitio. El dueño actual sigue siendo administrador.`, ok: "Hacer dueño", onOk: () => run(() => setOwner(u.id), `${u.firstName} es ahora el dueño`) })}>
                  Hacer dueño
                </button>
              )}
              <button className="btn btn-secondary btn-icon b34" onClick={() => open({ type: "user", user: u })} title="Editar" aria-label={`Editar a ${u.name}`}><i className="ph ph-pencil-simple" style={{ fontSize: 16 }} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
