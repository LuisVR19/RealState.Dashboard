"use client";

// Captcha de Cloudflare Turnstile (modo Managed: casi siempre se resuelve solo, sin que el usuario
// haga nada). El token es de un solo uso: llama a reset() después de cada envío.
// Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no se muestra nada y token() devuelve "" (desarrollo).
// Dentro de un <form> agrega además el campo oculto `cf-turnstile-response`.
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileHandle {
  /** Token vigente ("" si aún no hay o venció). */
  token(): string;
  /** Pide un token nuevo (los tokens son de un solo uso). */
  reset(): void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
/** true si el captcha está configurado: los formularios esperan el token antes de enviar. */
export const turnstileEnabled = SITE_KEY !== "";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loader: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  loader ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile no cargó")));
    script.onerror = () => {
      loader = null; // Permite reintentar en el próximo montaje.
      reject(new Error("Turnstile no cargó"));
    };
    document.head.appendChild(script);
  });
  return loader;
}

export function Turnstile({ ref, action, onChange }: { ref?: Ref<TurnstileHandle>; action: string; onChange?: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const current = useRef("");
  const notify = useRef(onChange);
  useEffect(() => {
    notify.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    token: () => current.current,
    reset: () => {
      current.current = "";
      notify.current?.("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    },
  }), []);

  useEffect(() => {
    if (!turnstileEnabled) return;
    let cancelled = false;
    const set = (t: string) => {
      current.current = t;
      notify.current?.(t);
    };
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !box.current) return;
        widgetId.current = ts.render(box.current, {
          sitekey: SITE_KEY,
          action,
          language: "es",
          theme: "light",
          size: "flexible",
          callback: set,
          "expired-callback": () => set(""),
          "error-callback": () => set(""),
        });
      })
      .catch(() => set(""));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      set(""); // Sin widget no hay token válido.
    };
  }, [action]);

  if (!turnstileEnabled) return null;
  return <div ref={box} className="turnstile" style={{ minHeight: 65, width: "100%" }} />;
}
