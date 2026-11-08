import { PropertyEditor } from "@/components/PropertyEditor";

export const metadata = { title: "Nuevo anuncio · Panel" };

/** /propiedades/nueva?categoria=vehiculo abre el editor con un vehículo; sin parámetro, un inmueble. */
export default async function NewPropertyPage({ searchParams }: { searchParams: Promise<{ categoria?: string | string[] }> }) {
  const { categoria } = await searchParams;
  return <PropertyEditor initialCategory={categoria === "vehiculo" ? "Vehículo" : "Inmueble"} />;
}
