import { notFound } from "next/navigation";
import { PropertyEditor } from "@/components/PropertyEditor";
import { getSession } from "@/lib/auth";
import { getProperty } from "@/lib/data";

export const metadata = { title: "Editar anuncio · Panel" };

export default async function EditPropertyPage({ params }: { params: Promise<{ code: string }> }) {
  const { supabase, me } = await getSession();
  // Un asesor solo abre las suyas (y la RLS no le deja guardar las ajenas).
  const property = me ? await getProperty(supabase, me, (await params).code) : null;
  if (!property) notFound();
  return <PropertyEditor key={property.id + property.updatedAt} property={property} />;
}
