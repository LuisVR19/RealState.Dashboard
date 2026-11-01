"use client";

import { useState, useTransition } from "react";
import { inviteMember, updateMember } from "@/app/actions/team";
import type { Role, TeamUser } from "@/lib/types";
import { DialogShell } from "../ui";
import { usePanel } from "../panel-provider";

/**
 * Invitar o editar a un miembro del equipo. La invitación la envía la Edge Function
 * `invite-team-member`: el invitado recibe un correo y crea su propia contraseña.
 */
export function UserModal({ user: u }: { user?: TeamUser }) {
  const { close, run } = usePanel();
  const [f, setF] = useState({ name: u?.name ?? "", email: u?.email ?? "", role: (u?.role ?? "Asesor") as Role, phone: u?.phone ?? "", specialty: u?.specialty ?? "", zones: u?.zones ?? "", bio: u?.bio ?? "" });
  const [saving, startSaving] = useTransition();
  const set = (o: Partial<typeof f>) => setF((x) => ({ ...x, ...o }));
  const full = "1 / -1";

  const save = () =>
    startSaving(async () => {
      const res = await run(() => (u ? updateMember(u.id, f) : inviteMember(f)), u ? "Usuario actualizado" : `Invitación enviada a ${f.email}`);
      if (res.ok) close();
    });

  return (
    <DialogShell title={u ? "Editar usuario" : "Invitar al equipo"} onClose={close}
      footer={<div className="dialog-actions"><button className="btn btn-secondary" onClick={close} style={{ height: 40 }}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving} style={{ height: 40 }}>{saving ? "Guardando…" : u ? "Guardar cambios" : "Enviar invitación"}</button></div>}>
      <div className="form-grid">
        <div className="field"><label htmlFor="um-name">Nombre completo *</label><input id="um-name" className="input h40" value={f.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="field"><label htmlFor="um-email">Correo *</label>
          <input id="um-email" className="input h40" type="email" value={f.email} maxLength={254} onChange={(e) => set({ email: e.target.value })} disabled={!!u} title={u ? "Es su usuario de acceso: no se cambia desde aquí." : undefined} />
        </div>
        <div className="field"><label htmlFor="um-role">Rol</label><select id="um-role" className="input h40" value={f.role} onChange={(e) => set({ role: e.target.value as Role })}><option value="Asesor">Asesor</option><option value="Admin">Administrador</option></select></div>
        <div className="field"><label htmlFor="um-phone">Teléfono / WhatsApp *</label><input id="um-phone" className="input h40" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="8888 8888" /></div>
        <div className="field"><label htmlFor="um-spec">Especialidad</label><input id="um-spec" className="input h40" value={f.specialty} maxLength={80} onChange={(e) => set({ specialty: e.target.value })} /></div>
        <div className="field"><label htmlFor="um-zones">Zonas</label><input id="um-zones" className="input h40" value={f.zones} maxLength={160} onChange={(e) => set({ zones: e.target.value })} /></div>
        <div className="field" style={{ gridColumn: full }}><label htmlFor="um-bio">Biografía</label><textarea id="um-bio" className="input" value={f.bio} maxLength={1500} onChange={(e) => set({ bio: e.target.value })} style={{ minHeight: 80 }} /></div>
        {!u && <span className="muted-12" style={{ gridColumn: full }}>Le llegará un correo para crear su contraseña. Hasta entonces no podrá entrar al panel.</span>}
      </div>
    </DialogShell>
  );
}
