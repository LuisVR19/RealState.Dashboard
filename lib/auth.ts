// Sesión del panel: usuario de Supabase Auth + su fila activa en `agents`.
import "server-only";
import { cache } from "react";
import { initialsOf } from "./format";
import type { Database } from "./supabase/database.types";
import { createClient } from "./supabase/server";
import type { TeamUser } from "./types";

export const AGENT_COLUMNS = "id, name, first_name, email, phone, role, active, photo_url, bio, specialty, zones, is_owner, contact_hours, contact_location";
type AgentRow = Pick<
  Database["public"]["Tables"]["agents"]["Row"],
  "id" | "name" | "first_name" | "email" | "phone" | "role" | "active" | "photo_url" | "bio" | "specialty" | "zones" | "is_owner" | "contact_hours" | "contact_location"
>;

export const toTeamUser = (a: AgentRow): TeamUser => ({
  id: a.id,
  name: a.name,
  firstName: a.first_name,
  initials: initialsOf(a.name),
  email: a.email,
  role: a.role,
  phone: a.phone,
  specialty: a.specialty ?? "",
  zones: a.zones ?? "",
  bio: a.bio ?? "",
  photoUrl: a.photo_url,
  active: a.active,
  isOwner: a.is_owner,
  contactHours: a.contact_hours ?? "",
  contactLocation: a.contact_location ?? "",
});

/**
 * Cliente con la sesión y el miembro del equipo que la tiene (null si no hay sesión, si la cuenta
 * es de un cliente del sitio o si el asesor está desactivado). Una vez por petición (React cache).
 * getClaims verifica la firma del JWT; nunca se confía en getSession() en el servidor.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = !error && typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return { supabase, userId, me: null };
  const { data: row } = await supabase.from("agents").select(AGENT_COLUMNS).eq("auth_user_id", userId).eq("active", true).maybeSingle();
  return { supabase, userId, me: row ? toTeamUser(row) : null };
});
