"use server";

import { changed, check, revalidateSite, runAction, v } from "@/lib/action";

export interface ZoneInput {
  label: string;
  name: string;
  imageUrl: string;
}

const admin = { adminOnly: true };

export async function saveZone(id: string | null, i: ZoneInput) {
  return runAction(async ({ supabase }) => {
    const row = { label: v.text(i.label, "El nombre visible", 60, true), name: v.place(i.name, "La ubicación que filtra", 80, true), image_url: v.httpsUrl(i.imageUrl, "La imagen") };
    if (id) changed(await supabase.from("featured_zones").update(row).eq("id", v.uuid(id)).select("id"));
    else {
      const { data: last } = await supabase.from("featured_zones").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
      check(await supabase.from("featured_zones").insert({ ...row, position: (last?.position ?? -1) + 1 }));
    }
    revalidateSite(["zones"]);
    return null;
  }, admin);
}

export async function setZoneVisible(id: string, visible: boolean) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("featured_zones").update({ visible: v.bool(visible) }).eq("id", v.uuid(id)).select("id"));
    revalidateSite(["zones"]);
    return null;
  }, admin);
}

/** Guarda el orden completo (rpc reorder_featured_zones, una sola transacción). */
export async function reorderZones(ids: string[]) {
  return runAction(async ({ supabase }) => {
    check(await supabase.rpc("reorder_featured_zones", { p_ids: v.list(ids, 100, (x) => v.uuid(x)) }));
    revalidateSite(["zones"]);
    return null;
  }, admin);
}

export async function deleteZone(id: string) {
  return runAction(async ({ supabase }) => {
    changed(await supabase.from("featured_zones").delete().eq("id", v.uuid(id)).select("id"));
    revalidateSite(["zones"]);
    return null;
  }, admin);
}
