"use client";

// Contexto del panel: datos cargados por el layout (con la sesión del usuario), diálogos abiertos,
// avisos (toast) y `run`, que ejecuta una Server Action y muestra su resultado.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action";
import type { PanelData } from "@/lib/data";
import { knownPlaces } from "@/lib/format";
import type { Client, FeaturedZone, Property, TeamUser, Visit } from "@/lib/types";
import { ClientDrawer } from "./dialogs/ClientDrawer";
import { ClientModal } from "./dialogs/ClientModal";
import { ConfirmDialog } from "./dialogs/ConfirmDialog";
import { ShareDialog } from "./dialogs/ShareDialog";
import { UserModal } from "./dialogs/UserModal";
import { VisitModal } from "./dialogs/VisitModal";
import { ZoneModal } from "./dialogs/ZoneModal";

export type Dialog =
  | { type: "share"; property: Property }
  | { type: "visit"; visit?: Visit; prefill?: Partial<Visit> }
  | { type: "client"; client?: Client }
  | { type: "user"; user?: TeamUser }
  | { type: "zone"; zone?: FeaturedZone }
  | { type: "confirm"; title: string; body: string; ok: string; onOk?: () => void };

interface PanelContextValue extends PanelData {
  today: string;
  isAdmin: boolean;
  open: (d: Dialog) => void;
  close: () => void;
  /** Ficha lateral del cliente (se puede abrir encima de un diálogo). */
  openClient: (id: string | null) => void;
  flash: (msg: string, kind?: "ok" | "error") => void;
  /**
   * Ejecuta una Server Action: muestra el error o `okMsg` y devuelve el resultado.
   * La acción ya refresca los datos de la pantalla al terminar bien.
   */
  run: <T>(action: () => Promise<ActionResult<T>>, okMsg?: string) => Promise<ActionResult<T>>;
  agentName: (id: string | null | undefined) => string;
  /** Cualquier propiedad del inventario (también de otros asesores). */
  propertyById: (id: string | null | undefined) => Property | undefined;
  propertyTitle: (id: string | null | undefined) => string;
  /** Ubicaciones conocidas (inventario + sugerencias) para autocompletar y filtrar. */
  places: { cantons: string[]; provinces: string[]; countries: string[] };
}

const PanelContext = createContext<PanelContextValue | null>(null);

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel debe usarse dentro de <PanelProvider>");
  return ctx;
}

export function PanelProvider({ data, today, children }: { data: PanelData; today: string; children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "error" } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = useCallback(() => setDialog(null), []);
  const flash = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    setToast({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), kind === "error" ? 5000 : 2600);
  }, []);
  const run = useCallback(
    async <T,>(action: () => Promise<ActionResult<T>>, okMsg?: string): Promise<ActionResult<T>> => {
      let res: ActionResult<T>;
      try {
        res = await action();
      } catch {
        res = { ok: false, error: "No hay conexión con el servidor. Intenta de nuevo." };
      }
      if (!res.ok) flash(res.error, "error");
      else if (okMsg) flash(okMsg);
      return res;
    },
    [flash],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dialog) setDialog(null);
      else setClientId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  const value = useMemo<PanelContextValue>(() => {
    const users = new Map(data.team.map((u) => [u.id, u]));
    const props = new Map(data.catalog.map((p) => [p.id, p]));
    return {
      ...data,
      today,
      isAdmin: data.me.role === "Admin",
      open: setDialog,
      close,
      openClient: setClientId,
      flash,
      run,
      agentName: (id) => (id && users.get(id)?.name) || "Sin asignar",
      propertyById: (id) => (id ? props.get(id) : undefined),
      propertyTitle: (id) => (id == null ? "Reunión con asesor" : props.get(id)?.title ?? "Propiedad eliminada"),
      places: knownPlaces(data.catalog),
    };
  }, [data, today, close, flash, run]);

  // La ficha se busca en los datos frescos: tras guardar, se actualiza sola.
  const client = clientId ? data.clients.find((c) => c.id === clientId) : null;

  return (
    <PanelContext.Provider value={value}>
      {children}
      {client && <ClientDrawer key={client.id} client={client} />}
      {dialog?.type === "share" && <ShareDialog property={dialog.property} />}
      {dialog?.type === "visit" && <VisitModal visit={dialog.visit} prefill={dialog.prefill} />}
      {dialog?.type === "client" && <ClientModal client={dialog.client} />}
      {dialog?.type === "user" && <UserModal user={dialog.user} />}
      {dialog?.type === "zone" && <ZoneModal zone={dialog.zone} />}
      {dialog?.type === "confirm" && <ConfirmDialog {...dialog} />}
      {toast && (
        <div className="toast" role={toast.kind === "error" ? "alert" : "status"} style={toast.kind === "error" ? { background: "#8a2f24", color: "#fff" } : undefined}>
          <i className={`ph ${toast.kind === "error" ? "ph-warning-circle" : "ph-check-circle"}`} style={{ fontSize: 17 }} />{toast.msg}
        </div>
      )}
    </PanelContext.Provider>
  );
}
