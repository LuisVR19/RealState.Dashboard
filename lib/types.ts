// Tipos de dominio del panel (camelCase). Los catálogos salen de los enums de la base
// (lib/supabase/database.types.ts), así que un valor que la base no acepta no compila.
import type { Database } from "./supabase/database.types";

type Enums = Database["public"]["Enums"];

export type Operation = Enums["property_operation"];
export type PropertyType = Enums["property_type"];
export type PropertyStatus = Enums["property_status"];
export type Canton = Enums["canton"];
export type Role = Enums["agent_role"];
export type ClientStatus = Enums["client_status"];
export type ClientSource = Enums["client_source"];
export type VisitStatus = Enums["visit_status"];
export type VisitMode = Enums["visit_mode"];
export type VisitSource = Enums["visit_source"];
/** Nombre de una amenidad del catálogo (tabla amenities). */
export type Amenity = string;

export interface AmenityOption {
  id: string;
  name: string;
}

/** Miembro del equipo (asesor o administrador). */
export interface TeamUser {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  role: Role;
  phone: string;
  specialty: string;
  zones: string;
  bio: string;
  photoUrl: string | null;
  active: boolean;
  /** Dueño del negocio (un solo admin): su teléfono, horario y ubicación son el contacto del sitio. */
  isOwner: boolean;
  contactHours: string;
  contactLocation: string;
}

export interface Property {
  id: string;
  code: string;
  title: string;
  description: string;
  operation: Operation;
  type: PropertyType;
  status: PropertyStatus;
  featured: boolean;
  tag?: string;
  canton: Canton;
  zone: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  maintenanceFee?: number;
  bedrooms: number;
  bathrooms: number;
  /** 0 = sin dato. */
  areaM2: number;
  parkingSpaces: number;
  guests?: number;
  floor?: string;
  yearBuilt?: number;
  delivery?: string;
  agentId: string;
  amenities: Amenity[];
  images: string[];
  updatedAt: string; // ISO
}

export interface ClientPreferences {
  operation: Operation | "Todas";
  propertyTypes: PropertyType[];
  cantons: Canton[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms: number;
  minBathrooms: number;
  requiredAmenities: Amenity[];
  notes?: string;
}

export interface InternalNote {
  id: string;
  agentId: string;
  body: string;
  createdAt: string; // ISO
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedAgentId: string | null;
  status: ClientStatus;
  source: ClientSource;
  /** Tiene cuenta en el sitio (su correo es su usuario de Auth y no se edita desde el panel). */
  hasAccount: boolean;
  createdAt: string; // ISO
  preferences: ClientPreferences;
  notes: InternalNote[];
}

export interface Visit {
  id: string;
  propertyId: string | null;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  agentId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  mode: VisitMode;
  status: VisitStatus;
  source: VisitSource;
  notes: string;
}

export interface FeaturedZone {
  id: string;
  name: Canton;
  label: string;
  imageUrl: string;
  visible: boolean;
  position: number;
}

export interface Match {
  client: Client;
  property: Property;
  score: number;
}
