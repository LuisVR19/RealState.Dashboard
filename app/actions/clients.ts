"use server";

import { changed, check, runAction, UserError, v } from "@/lib/action";
import { CLIENT_STATUSES, MATCH_CATEGORIES, TYPES } from "@/lib/format";
import type { Operation } from "@/lib/types";

// Las preferencias son de inmuebles y vehículos (los servicios no tienen operación propia).
const PREF_OPS: readonly (Exclude<Operation, "Servicio"> | "Todas")[] = ["Venta", "Alquiler", "Vacacional", "Preventa", "Todas"];

export interface ClientInput {
  name: string;
  email: string;
  phone: string;
  status: string;
  assignedAgentId: string | null;
  /** Inmueble, Vehículo o null (cualquiera). */
  category?: string | null;
  operation: string;
  propertyTypes: string[];
  cantons: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  minBedrooms: number;
  minBathrooms: number;
  minYear?: number | null;
  maxMileageKm?: number | null;
  amenityIds: string[];
  notes: string;
}

/** Crea o edita un cliente con sus preferencias, en una transacción (rpc save_client). */
export async function saveClient(id: string | null, i: ClientInput) {
  return runAction(async ({ supabase }) => {
    const budgetMin = v.num(i.budgetMin, "El presupuesto mínimo", 0, 1e13) || null;
    const budgetMax = v.num(i.budgetMax, "El presupuesto máximo", 0, 1e13) || null;
    if (budgetMin && budgetMax && budgetMin > budgetMax) throw new UserError("El presupuesto mínimo no puede ser mayor que el máximo.");
    const newId = check(
      await supabase.rpc("save_client", {
        p_id: id ? v.uuid(id) : null,
        p_name: v.text(i.name, "El nombre", 120, true),
        p_email: v.email(i.email) || null,
        p_phone: v.phone(i.phone) || null,
        p_status: v.oneOf(i.status, CLIENT_STATUSES, "Estado"),
        p_assigned_agent_id: v.optUuid(i.assignedAgentId, "Asesor"),
        p_operation: v.oneOf(i.operation, PREF_OPS, "Operación"),
        p_property_types: v.list(i.propertyTypes, 10, (t) => v.oneOf(t, TYPES, "Tipo")),
        p_cantons: [...new Set(v.list(i.cantons, 20, (c) => v.place(c, "La ubicación", 80, true)))],
        p_budget_min: budgetMin,
        p_budget_max: budgetMax,
        p_min_bedrooms: v.num(i.minBedrooms, "Habitaciones", 0, 20) ?? 0,
        p_min_bathrooms: v.num(i.minBathrooms, "Baños", 0, 20, false) ?? 0,
        p_amenity_ids: v.list(i.amenityIds, 50, (a) => v.uuid(a, "Amenidad")),
        p_notes: v.text(i.notes, "Los comentarios", 2000) || null,
        p_category: i.category ? v.oneOf(i.category, MATCH_CATEGORIES, "Categoría") : null,
        p_min_year: v.num(i.minYear, "El año mínimo", 0, 2100) || null,
        p_max_mileage_km: v.num(i.maxMileageKm, "El kilometraje máximo", 0, 5_000_000) || null,
      }),
    );
    return { id: newId };
  });
}

export async function setClientStatus(id: string, status: string) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("clients").update({ status: v.oneOf(status, CLIENT_STATUSES, "Estado") }).eq("id", v.uuid(id)).select("id"));
    return null;
  });
}

/** Admin: asigna o libera el asesor de un cliente. */
export async function assignClient(id: string, agentId: string | null) {
  return runAction(
    async ({ supabase }) => {
      changed(await supabase.from("clients").update({ assigned_agent_id: v.optUuid(agentId, "Asesor") }).eq("id", v.uuid(id)).select("id"));
      return null;
    },
    { adminOnly: true },
  );
}

/** Asesor: toma un cliente que no tiene asesor. */
export async function assignClientToMe(id: string) {
  return runAction(async ({ supabase }) => {
    check(await supabase.rpc("assign_client_to_me", { p_client_id: v.uuid(id) }));
    return null;
  });
}

export async function addClientNote(clientId: string, body: string) {
  return runAction(async ({ supabase, me }) => {
    check(await supabase.from("client_internal_notes").insert({ client_id: v.uuid(clientId), agent_id: me.id, body: v.text(body, "La nota", 2000, true) }));
    return null;
  });
}

export async function deleteClientNote(noteId: string) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("client_internal_notes").delete().eq("id", v.uuid(noteId)).select("id"));
    return null;
  });
}

/** Saca el par cliente↔propiedad de los matches (también de "Para ti" del cliente). */
export async function dismissMatch(clientId: string, propertyId: string) {
  return runAction(async ({ supabase, me }) => {
    check(await supabase.from("dismissed_matches").upsert({ client_id: v.uuid(clientId), property_id: v.uuid(propertyId), dismissed_by: me.id }, { ignoreDuplicates: true }));
    return null;
  });
}

/** Admin: elimina un cliente sin cuenta del sitio; sus visitas se conservan (rpc delete_client). */
export async function deleteClient(id: string) {
  return runAction(
    async ({ supabase }) => {
      check(await supabase.rpc("delete_client", { p_id: v.uuid(id) }));
      return null;
    },
    { adminOnly: true },
  );
}
