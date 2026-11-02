"use server";

import { captchaToken } from "@/lib/abuse";
import { changed, check, panelUrl, revalidateSite, runAction, UserError, v } from "@/lib/action";
import type { ServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const ROLES: readonly Role[] = ["Asesor", "Admin"];

export interface MemberInput {
  name: string;
  email: string;
  role: string;
  phone: string;
  specialty: string;
  zones: string;
  bio: string;
}

const profileFields = (i: MemberInput) => ({
  specialty: v.text(i.specialty, "La especialidad", 80) || null,
  zones: v.text(i.zones, "Las zonas", 160) || null,
  bio: v.text(i.bio, "La biografía", 1500) || null,
});

/**
 * Admin: invita a un miembro nuevo. La Edge Function `invite-team-member` crea la fila en agents
 * y envía el correo con la service role, que nunca sale de Supabase. El invitado crea su contraseña
 * en /auth/nueva-contrasena.
 */
export async function inviteMember(i: MemberInput) {
  return runAction(
    async ({ supabase }) => {
      const name = v.text(i.name, "El nombre", 120, true);
      const body = {
        name,
        first_name: name.split(/\s+/)[0],
        email: v.email(i.email, true),
        phone: v.phone(i.phone, true),
        role: v.oneOf(i.role, ROLES, "Rol"),
        redirect_to: `${panelUrl()}/auth/nueva-contrasena`,
      };
      const extra = profileFields(i);
      const { data, error } = await supabase.functions.invoke<{ agent_id: string }>("invite-team-member", { body });
      if (error) {
        // El cuerpo del error trae el mensaje de la función (ya en español).
        const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new UserError(detail?.error ?? "No se pudo enviar la invitación.");
      }
      if (data?.agent_id) await supabase.from("agents").update(extra).eq("id", data.agent_id);
      revalidateSite(["agents"]);
      return null;
    },
    { adminOnly: true },
  );
}

/** Admin: edita a un miembro. El correo no se cambia aquí: es su usuario de Auth. */
export async function updateMember(id: string, i: MemberInput) {
  return runAction(
    async ({ supabase, me }) => {
      const name = v.text(i.name, "El nombre", 120, true);
      if (id === me.id && i.role !== "Admin") throw new UserError("No puedes quitarte el rol de administrador.");
      if (i.role !== "Admin" && (await isOwner(supabase, id))) throw new UserError(OWNER_FIRST);
      changed(
        await supabase
          .from("agents")
          .update({ name, first_name: name.split(/\s+/)[0], role: v.oneOf(i.role, ROLES, "Rol"), phone: v.phone(i.phone, true), ...profileFields(i) })
          .eq("id", v.uuid(id))
          .select("id"),
      );
      revalidateSite(["agents"]);
      return null;
    },
    { adminOnly: true },
  );
}

/**
 * Admin: activa o desactiva una cuenta. Desactivar corta el acceso al panel de inmediato (RLS) y
 * saca al asesor del sitio; sus propiedades, clientes y visitas se conservan para reasignarlos.
 */
export async function setMemberActive(id: string, active: boolean) {
  return runAction(
    async ({ supabase, me }) => {
      if (id === me.id) throw new UserError("No puedes desactivar tu propia cuenta.");
      if (!active && (await isOwner(supabase, id))) throw new UserError(OWNER_FIRST);
      changed(await supabase.from("agents").update({ active: v.bool(active) }).eq("id", v.uuid(id)).select("id"));
      revalidateSite(["agents", "properties"]);
      return null;
    },
    { adminOnly: true },
  );
}

const OWNER_FIRST = "Es el dueño del negocio: primero marca a otro administrador como dueño.";
const isOwner = async (supabase: ServerClient, id: string) =>
  !!check(await supabase.from("agents").select("is_owner").eq("id", v.uuid(id)).maybeSingle())?.is_owner;

/**
 * Admin: marca a un administrador activo como dueño del negocio (rpc set_owner, desmarca al anterior).
 * El teléfono, horario y ubicación del dueño son el contacto general del sitio.
 */
export async function setOwner(id: string) {
  return runAction(
    async ({ supabase }) => {
      check(await supabase.rpc("set_owner", { p_agent_id: v.uuid(id) }));
      revalidateSite(["agents"]);
      return null;
    },
    { adminOnly: true },
  );
}

/** Perfil propio (lo que ven los clientes en el sitio). El dueño también edita el contacto del sitio. */
export async function updateMyProfile(i: Omit<MemberInput, "email" | "role"> & { contactHours?: string; contactLocation?: string }) {
  return runAction(async ({ supabase, me }) => {
    const name = v.text(i.name, "El nombre", 120, true);
    const contact = me.isOwner
      ? { contact_hours: v.text(i.contactHours, "El horario", 120) || null, contact_location: v.text(i.contactLocation, "La ubicación", 120) || null }
      : {};
    check(
      await supabase
        .from("agents")
        .update({ name, first_name: name.split(/\s+/)[0], phone: v.phone(i.phone, true), ...profileFields({ ...i, email: "", role: "" }), ...contact })
        .eq("id", me.id),
    );
    revalidateSite(["agents"]);
    return null;
  });
}

/** Cambia la contraseña pidiendo la actual (evita que una sesión abierta ajena la cambie). */
export async function changeMyPassword(current: string, next: string, captcha?: string) {
  return runAction(async ({ supabase, me }) => {
    if (typeof next !== "string" || next.length < 8 || next.length > 72) throw new UserError("La contraseña nueva debe tener entre 8 y 72 caracteres.");
    if (typeof current !== "string" || !current) throw new UserError("Escribe tu contraseña actual.");
    // Con el captcha activado en Supabase Auth, este inicio de sesión también lo exige.
    const token = captchaToken(captcha);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: me.email, password: current, ...(token ? { options: { captchaToken: token } } : {}) });
    if (authError) {
      throw new UserError(
        authError.status === 429 ? "Demasiados intentos. Espera unos minutos."
        : /captcha/i.test(authError.message) ? "No pudimos verificar que no eres un robot. Intenta de nuevo."
        : "La contraseña actual no es correcta.",
      );
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw new UserError(error.code === "same_password" ? "La contraseña nueva debe ser distinta de la actual." : error.code === "weak_password" ? "La contraseña es muy débil." : "No se pudo cambiar la contraseña.");
    return null;
  });
}
