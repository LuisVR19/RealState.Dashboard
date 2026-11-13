// Subida de imágenes a Supabase Storage desde el navegador, con la sesión del asesor.
// Las políticas de cada bucket deciden quién puede escribir:
// property-images/<id de propiedad>/… solo el dueño o un admin; zone-images/… y ad-images/… solo un admin.
//
// Antes de subir, la foto se redimensiona y se pasa a WebP en el navegador (compressImage): una foto
// de celular de 4–8 MB queda en ~150–400 KB. Menos almacenamiento y, sobre todo, menos egress de
// Storage cada vez que alguien (o un crawler) la descarga.
import { createClient } from "./supabase/client";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
/** Tamaño máximo del archivo elegido (se comprime antes de subir). */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
/** Límite del bucket (file_size_limit en las migraciones de Storage). */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Lado mayor máximo tras redimensionar. */
const MAX_SIDE = 1920;
const LOGO_MAX_SIDE = 512;
const WEBP_QUALITY = 0.82;

/** Mensaje de error para mostrar, o null si el archivo se puede subir. */
export const imageProblem = (f: File) =>
  !TYPES[f.type] ? `${f.name}: solo JPG, PNG o WebP.` : f.size > MAX_INPUT_BYTES ? `${f.name}: máximo 20 MB.` : null;

/** Medidas que caben en `maxSide` conservando la proporción (nunca agranda). */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Redimensiona a `maxSide` y convierte a WebP. Devuelve el original si el navegador no puede
 * procesarlo o si el resultado no es más liviano y la foto ya tenía un tamaño razonable.
 */
export async function compressImage(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  let bitmap: ImageBitmap;
  try {
    // "from-image" respeta la orientación EXIF de las fotos de celular.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
    // Safari viejo puede ignorar WebP y devolver PNG (más pesado): en ese caso, el original si es más liviano.
    if (!blob || !TYPES[blob.type]) return file;
    const resized = width !== bitmap.width || height !== bitmap.height;
    return blob.size < file.size || resized ? blob : file;
  } finally {
    bitmap.close();
  }
}

/** Sube el archivo (comprimido) y devuelve su URL pública. */
export async function uploadImage(bucket: "property-images" | "zone-images" | "ad-images", folder: string, file: File): Promise<string> {
  const problem = imageProblem(file);
  if (problem) throw new Error(problem);
  const body = await compressImage(file, folder === "logos" ? LOGO_MAX_SIDE : MAX_SIDE);
  if (body.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: la foto sigue pesando más de 5 MB después de comprimirla.`);
  const type = body.type || file.type;
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.${TYPES[type]}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`No se pudo subir ${file.name}.`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
