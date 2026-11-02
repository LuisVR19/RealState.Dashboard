"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { login, requestPasswordReset } from "../actions/auth";
import { PasswordInput } from "@/components/PasswordInput";
import { Turnstile, turnstileEnabled, type TurnstileHandle } from "@/components/Turnstile";

export function LoginForm({ siteUrl, next, linkError }: { siteUrl: string; next?: string; linkError?: boolean }) {
  const [state, action, busy] = useActionState(login, null);
  const [reset, setReset] = useState<{ error?: string; notice?: string } | null>(null);
  const [sending, startSending] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);
  // El captcha va dentro del form (campo cf-turnstile-response). El token es de un solo uso:
  // después de cada intento de login o de recuperación se pide uno nuevo.
  const captcha = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const verified = !turnstileEnabled || captchaToken !== "";
  useEffect(() => {
    if (state) captcha.current?.reset();
  }, [state]);

  const forgot = () =>
    startSending(async () => {
      const email = emailRef.current?.value ?? "";
      if (!email) return setReset({ error: "Escribe tu correo arriba y vuelve a tocar «¿Olvidaste tu contraseña?»." });
      if (!verified) return setReset({ error: "Espera un momento: estamos verificando que no eres un robot." });
      setReset(await requestPasswordReset(email, captcha.current?.token()));
      captcha.current?.reset();
    });

  return (
    <form action={action} className="login-form">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="brand-mark" style={{ width: 34, height: 34 }}><i className="ph ph-house-line" style={{ fontSize: 18 }} /></span>
        <span style={{ fontSize: 17, fontWeight: 500 }}>Thomas Mata S.A.</span>
      </div>
      <div><h1 style={{ fontSize: 28, margin: "12px 0 4px" }}>Inicia sesión</h1><div className="muted-14">Acceso para asesores y administradores.</div></div>
      {(state?.error || linkError) && (
        <div className="alert-error" role="alert"><i className="ph ph-warning-circle" style={{ fontSize: 16 }} />{state?.error ?? "El enlace no es válido o ya venció. Pide uno nuevo."}</div>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      <div className="field"><label htmlFor="login-email">Correo</label><input id="login-email" ref={emailRef} className="input h42" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="nombre@innovacionsf.cr" /></div>
      <div className="field"><label htmlFor="login-pass">Contraseña</label>
        <PasswordInput id="login-pass" className="input h42" name="password" autoComplete="current-password" required maxLength={200} placeholder="••••••••" />
      </div>
      <div className="row-between" style={{ fontSize: 13 }}>
        <span />
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} disabled={sending} onClick={forgot}>{sending ? "Enviando…" : "¿Olvidaste tu contraseña?"}</button>
      </div>
      {reset?.notice && <div className="muted-13" role="status">{reset.notice}</div>}
      {reset?.error && <div className="muted-13" role="alert" style={{ color: "#8a2f24" }}>{reset.error}</div>}
      <Turnstile ref={captcha} action="login" onChange={setCaptchaToken} />
      <button type="submit" className="btn btn-primary" disabled={busy || !verified} style={{ height: 44, fontSize: 15 }}>{busy ? "Entrando…" : verified ? "Entrar" : "Verificando…"}</button>
      <a href={siteUrl} style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}><i className="ph ph-arrow-left" />Volver al sitio</a>
    </form>
  );
}
