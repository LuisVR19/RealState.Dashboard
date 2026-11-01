"use server";

import { changed, check, runAction, v } from "@/lib/action";
import { VISIT_STATUSES } from "@/lib/format";
import type { VisitMode } from "@/lib/types";

const MODES: readonly VisitMode[] = ["Presencial", "Videollamada"];

export interface VisitInput {
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  propertyId: string | null;
  date: string;
  time: string;
  mode: string;
  status: string;
  agentId: string;
  notes: string;
}

/**
 * Crea o edita una visita del panel. El nombre y teléfono se guardan siempre (copia del contacto).
 * El asesor agenda a su nombre (y al editar no la reasigna); el admin elige asesor. La RLS valida que la visita le corresponda.
 */
export async function saveVisit(id: string | null, i: VisitInput) {
  return runAction(async ({ supabase, me, isAdmin }) => {
    const row = {
      client_id: v.optUuid(i.clientId, "Cliente"),
      client_name: v.text(i.clientName, "El nombre del cliente", 120, true),
      client_phone: v.phone(i.clientPhone, true),
      property_id: v.optUuid(i.propertyId, "Propiedad"),
      date: v.date(i.date),
      time: v.time(i.time),
      mode: v.oneOf(i.mode, MODES, "Modalidad"),
      status: v.oneOf(i.status, VISIT_STATUSES, "Estado"),
      agent_id: isAdmin ? v.uuid(i.agentId, "Asesor") : me.id,
      notes: v.text(i.notes, "Las notas", 1000) || null,
    };
    if (id) {
      // Al editar, el asesor no cambia a quién está asignada la visita.
      changed(await supabase.from("visits").update(isAdmin ? row : { ...row, agent_id: undefined }).eq("id", v.uuid(id)).select("id"));
      return null;
    }
    check(await supabase.from("visits").insert({ ...row, source: "panel" }).select("id").single());
    return null;
  });
}

export async function setVisitStatus(id: string, status: string) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("visits").update({ status: v.oneOf(status, VISIT_STATUSES, "Estado") }).eq("id", v.uuid(id)).select("id"));
    return null;
  });
}

export async function deleteVisit(id: string) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("visits").delete().eq("id", v.uuid(id)).select("id"));
    return null;
  });
}
