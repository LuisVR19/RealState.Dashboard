"use client";

import { useRef, useState, useTransition } from "react";
import { changeMyPassword, updateMyProfile } from "@/app/actions/team";
import { usePanel } from "@/components/panel-provider";
import { PasswordInput } from "@/components/PasswordInput";
import { Turnstile, turnstileEnabled, type TurnstileHandle } from "@/components/Turnstile";

/** Perfil del usuario (lo que ven los clientes en el sitio) y cambio de contraseña. */
export default function ProfilePage() {
  const { me, run } = usePanel();
  const [f, setF] = useState({ name: me.name, phone: me.phone, specialty: me.specialty, zones: me.zones, bio: me.bio, contactHours: me.contactHours, contactLocation: me.contactLocation });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [saving, startSaving] = useTransition();
  const [changing, startChanging] = useTransition();
  const set = (o: Partial<typeof f>) => setF((x) => ({ ...x, ...o }));

  const save = () => startSaving(async () => void (await run(() => updateMyProfile(f), "Perfil guardado")));
  // Verificar la contraseña actual es un inicio de sesión: con el captcha activado en Supabase lo exige.
  const captcha = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const changePassword = () =>
    startChanging(async () => {
      const res = await run(() => changeMyPassword(pw.current, pw.next, captcha.current?.token()), "Contraseña actualizada");
      captcha.current?.reset(); // El token es de un solo uso.
      if (res.ok) setPw({ current: "", next: "" });
    });

  return (
    <div className="stack-18" style={{ maxWidth: 760 }}>
      <div><h1 className="page-title">Mi perfil</h1><div className="muted-14">Así te ven los clientes en el sitio.</div></div>
      <section className="card stack-14 pad-20">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="avatar avatar-64">{me.initials}</span>
          <div><div style={{ fontSize: 17, fontWeight: 500 }}>{me.name}</div><div className="muted-13">{me.role === "Admin" ? "Administrador" : "Asesor"} · {me.email}</div></div>
        </div>
        <div className="form-grid">
          <div className="field"><label htmlFor="pf-name">Nombre completo</label><input id="pf-name" className="input h40" value={f.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} /></div>
          <div className="field"><label htmlFor="pf-phone">Teléfono / WhatsApp</label><input id="pf-phone" className="input h40" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="8888 8888" /></div>
          <div className="field"><label htmlFor="pf-spec">Especialidad</label><input id="pf-spec" className="input h40" value={f.specialty} maxLength={80} onChange={(e) => set({ specialty: e.target.value })} /></div>
          <div className="field"><label htmlFor="pf-zones">Zonas que atiendes</label><input id="pf-zones" className="input h40" value={f.zones} maxLength={160} onChange={(e) => set({ zones: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="pf-bio">Biografía</label><textarea id="pf-bio" className="input" value={f.bio} maxLength={1500} onChange={(e) => set({ bio: e.target.value })} style={{ minHeight: 110 }} /></div>
        {me.isOwner && (
          <div className="divider-top stack-14" style={{ paddingTop: 14 }}>
            <div><div style={{ fontSize: 14, fontWeight: 500 }}>Contacto general del sitio</div><div className="muted-12">Eres el dueño: tu teléfono de arriba y estos datos aparecen en "Hablar con un asesor" y en el pie de página.</div></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="pf-hours">Horario de atención</label><input id="pf-hours" className="input h40" value={f.contactHours} maxLength={120} onChange={(e) => set({ contactHours: e.target.value })} placeholder="Lunes a sábado, 8:00 a 18:00" /></div>
              <div className="field"><label htmlFor="pf-loc">Ubicación de la oficina</label><input id="pf-loc" className="input h40" value={f.contactLocation} maxLength={120} onChange={(e) => set({ contactLocation: e.target.value })} placeholder="Paraíso, Cartago, Costa Rica" /></div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-primary h40" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar perfil"}</button></div>
      </section>
      <section className="card stack-14 pad-20">
        <h2 className="h2-16">Cambiar contraseña</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="pf-cur">Contraseña actual</label><PasswordInput id="pf-cur" className="input h40" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div className="field"><label htmlFor="pf-new">Nueva contraseña</label><PasswordInput id="pf-new" className="input h40" autoComplete="new-password" maxLength={72} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="Mínimo 8 caracteres" /></div>
        </div>
        {pw.current && <Turnstile ref={captcha} action="password" onChange={setCaptchaToken} />}
        <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-secondary h40" onClick={changePassword} disabled={changing || !pw.current || pw.next.length < 8 || (turnstileEnabled && !captchaToken)}>{changing ? "Actualizando…" : "Actualizar contraseña"}</button></div>
      </section>
    </div>
  );
}
