// Tipos de dominio del panel (camelCase). Los catálogos salen de los enums de la base
// (lib/supabase/database.types.ts), así que un valor que la base no acepta no compila.
import type { Database } from "./supabase/database.types";

type Enums = Database["public"]["Enums"];

export type Operation = Enums["property_operation"];
export type PropertyType = Enums["property_type"];
/** Inmueble, Vehículo o Servicio. La base la deduce del tipo (public.type_category). */
export type Category = Enums["listing_category"];
export type Transmission = Enums["vehicle_transmission"];
/** Servicio: forma de cobro. */
export type ServiceRate = Enums["service_rate"];
export type Fuel = Enums["vehicle_fuel"];
export type Drivetrain = Enums["vehicle_drivetrain"];
export type PropertyStatus = Enums["property_status"];
/** Ciudad / cantón / municipio (texto libre: cualquier país). */
export type Canton = string;
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
  /** Amenidad de inmueble o equipamiento de vehículo. */
  category: Category;
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
  /** Se deriva del tipo (categoryOf); se guarda para filtrar sin recalcular. */
  category: Category;
  status: PropertyStatus;
  featured: boolean;
  tag?: string;
  /** País (por defecto Costa Rica). */
  country: string;
  /** Provincia, estado o región (opcional). */
  province: string;
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
  /** Año de construcción (inmueble) o año modelo (vehículo). */
  yearBuilt?: number;
  delivery?: string;
  // Vehículo
  brand?: string;
  model?: string;
  mileageKm?: number;
  transmission?: Transmission;
  fuel?: Fuel;
  drivetrain?: Drivetrain;
  engineCc?: number;
  color?: string;
  doors?: number;
  // Servicio
  serviceRate?: ServiceRate;
  agentId: string;
  amenities: Amenity[];
  images: string[];
  updatedAt: string; // ISO
}

export interface ClientPreferences {
  /** null = cualquiera. */
  category: Category | null;
  /** Las preferencias son de inmuebles y vehículos: los servicios no tienen operación propia. */
  operation: Exclude<Operation, "Servicio"> | "Todas";
  propertyTypes: PropertyType[];
  cantons: Canton[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms: number;
  minBathrooms: number;
  /** Vehículo: año mínimo y kilometraje máximo. */
  minYear?: number;
  maxMileageKm?: number;
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
