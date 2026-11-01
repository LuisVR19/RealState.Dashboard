"use client";

import { useActionState, useEffect, useState } from "react";
import { setNewPassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

/**
 * Formulario de contraseña nueva. Si el enlace del correo trae la sesión en el fragmento
 * (#access_token=…, formato de las invitaciones), la guarda en cookies antes de mostrar el formulario
 * y borra el fragmento de la barra de direcciones.
 */
export function SetPasswordForm() {
  const [state, action, busy] = useActionState(setNewPassword, null);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const hashError = hash.get("error_description");
    history.replaceState(null, "", window.location.pathname);
    if (hashError) {
      setLinkError("El enlace no es válido o ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».");
      return setReady(true);
    }
    if (!access_token || !refresh_token) return setReady(true);
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => error && setLinkError("El enlace no es válido o ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?»."))
      .finally(() => setReady(true));
  }, []);

  return (
    <form action={action} className="login-form">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="brand-mark" style={{ width: 34, height: 34 }}><i className="ph ph-house-line" style={{ fontSize: 18 }} /></span>
        <span style={{ fontSize: 17, fontWeight: 500 }}>Thomas Mata S.A.</span>
      </div>
      <div><h1 style={{ fontSize: 28, margin: "12px 0 4px" }}>Crea tu contraseña</h1><div className="muted-14">Con ella entrarás al panel de asesores.</div></div>
      {(linkError || state?.error) && <div className="alert-error" role="alert"><i className="ph ph-warning-circle" style={{ fontSize: 16 }} />{linkError || state?.error}</div>}
      <div className="field"><label htmlFor="np-pass">Contraseña nueva</label><PasswordInput id="np-pass" className="input h42" name="password" autoComplete="new-password" minLength={8} maxLength={72} required placeholder="Mínimo 8 caracteres" /></div>
      <div className="field"><label htmlFor="np-confirm">Repite la contraseña</label><PasswordInput id="np-confirm" className="input h42" name="confirm" autoComplete="new-password" minLength={8} maxLength={72} required /></div>
      <button type="submit" className="btn btn-primary" disabled={!ready || busy} style={{ height: 44, fontSize: 15 }}>{busy ? "Guardando…" : "Guardar y entrar"}</button>
      <a href="/login" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}><i className="ph ph-arrow-left" />Volver a iniciar sesión</a>
    </form>
  );
}
