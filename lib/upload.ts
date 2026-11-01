// Subida de imágenes a Supabase Storage desde el navegador, con la sesión del asesor.
// Las políticas de cada bucket deciden quién puede escribir:
// property-images/<id de propiedad>/… solo el dueño o un admin; zone-images/… solo un admin.
import { createClient } from "./supabase/client";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

/** Mensaje de error para mostrar, o null si el archivo se puede subir. */
export const imageProblem = (f: File) =>
  !TYPES[f.type] ? `${f.name}: solo JPG, PNG o WebP.` : f.size > MAX_BYTES ? `${f.name}: máximo 5 MB.` : null;

/** Sube el archivo y devuelve su URL pública. */
export async function uploadImage(bucket: "property-images" | "zone-images", folder: string, file: File): Promise<string> {
  const problem = imageProblem(file);
  if (problem) throw new Error(problem);
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`No se pudo subir ${file.name}.`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
