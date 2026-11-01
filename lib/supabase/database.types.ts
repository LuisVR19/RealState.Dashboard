export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_reviews: {
        Row: {
          agent_id: string
          author_name: string
          created_at: string
          id: string
          meta: string | null
          rating: number
          text: string
        }
        Insert: {
          agent_id: string
          author_name: string
          created_at?: string
          id?: string
          meta?: string | null
          rating: number
          text: string
        }
        Update: {
          agent_id?: string
          author_name?: string
          created_at?: string
          id?: string
          meta?: string | null
          rating?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          active: boolean
          auth_user_id: string | null
          bio: string | null
          contact_hours: string | null
          contact_location: string | null
          created_at: string
          deals_closed: number
          email: string
          first_name: string
          id: string
          is_owner: boolean
          languages: string[]
          name: string
          phone: string
          photo_url: string | null
          rating: number
          response_time: string | null
          reviews_count: number
          role: Database["public"]["Enums"]["agent_role"]
          specialty: string | null
          updated_at: string
          years_experience: number | null
          zones: string | null
        }
        Insert: {
          active?: boolean
          auth_user_id?: string | null
          bio?: string | null
          contact_hours?: string | null
          contact_location?: string | null
          created_at?: string
          deals_closed?: number
          email: string
          first_name: string
          id?: string
          is_owner?: boolean
          languages?: string[]
          name: string
          phone: string
          photo_url?: string | null
          rating?: number
          response_time?: string | null
          reviews_count?: number
          role?: Database["public"]["Enums"]["agent_role"]
          specialty?: string | null
          updated_at?: string
          years_experience?: number | null
          zones?: string | null
        }
        Update: {
          active?: boolean
          auth_user_id?: string | null
          bio?: string | null
          contact_hours?: string | null
          contact_location?: string | null
          created_at?: string
          deals_closed?: number
          email?: string
          first_name?: string
          id?: string
          is_owner?: boolean
          languages?: string[]
          name?: string
          phone?: string
          photo_url?: string | null
          rating?: number
          response_time?: string | null
          reviews_count?: number
          role?: Database["public"]["Enums"]["agent_role"]
          specialty?: string | null
          updated_at?: string
          years_experience?: number | null
          zones?: string | null
        }
        Relationships: []
      }
      amenities: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_favorites: {
        Row: {
          client_id: string
          created_at: string
          property_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          property_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_property_matches"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      client_internal_notes: {
        Row: {
          agent_id: string
          body: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          agent_id: string
          body: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          agent_id?: string
          body?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_internal_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_internal_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_internal_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_property_matches"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_internal_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_preferences: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          cantons: Database["public"]["Enums"]["canton"][]
          client_id: string
          max_area_m2: number | null
          min_area_m2: number | null
          min_bathrooms: number | null
          min_bedrooms: number | null
          min_parking: number | null
          notes: string | null
          operation: Database["public"]["Enums"]["preference_operation"] | null
          property_types: Database["public"]["Enums"]["property_type"][]
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          cantons?: Database["public"]["Enums"]["canton"][]
          client_id: string
          max_area_m2?: number | null
          min_area_m2?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_parking?: number | null
          notes?: string | null
          operation?: Database["public"]["Enums"]["preference_operation"] | null
          property_types?: Database["public"]["Enums"]["property_type"][]
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          cantons?: Database["public"]["Enums"]["canton"][]
          client_id?: string
          max_area_m2?: number | null
          min_area_m2?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_parking?: number | null
          notes?: string | null
          operation?: Database["public"]["Enums"]["preference_operation"] | null
          property_types?: Database["public"]["Enums"]["property_type"][]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "client_property_matches"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_required_amenities: {
        Row: {
          amenity_id: string
          client_id: string
        }
        Insert: {
          amenity_id: string
          client_id: string
        }
        Update: {
          amenity_id?: string
          client_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_required_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_required_amenities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_property_matches"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_required_amenities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_agent_id: string | null
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          source: Database["public"]["Enums"]["client_source"]
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          source: Database["public"]["Enums"]["client_source"]
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          source?: Database["public"]["Enums"]["client_source"]
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_matches: {
        Row: {
          client_id: string
          created_at: string
          dismissed_by: string
          property_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          dismissed_by: string
          property_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          dismissed_by?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_property_matches"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "dismissed_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_matches_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_matches_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_matches_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_zones: {
        Row: {
          created_at: string
          id: string
          image_url: string
          label: string
          name: Database["public"]["Enums"]["canton"]
          position: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          label: string
          name: Database["public"]["Enums"]["canton"]
          position?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          label?: string
          name?: Database["public"]["Enums"]["canton"]
          position?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agent_id: string
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          canton: Database["public"]["Enums"]["canton"]
          code: string
          created_at: string
          delivery: string | null
          description: string
          featured: boolean
          floor: string | null
          guests: number | null
          id: string
          lat: number
          lng: number
          location: unknown
          maintenance_fee: number | null
          operation: Database["public"]["Enums"]["property_operation"]
          parking_spaces: number
          price: number
          published_at: string | null
          search_vector: unknown
          status: Database["public"]["Enums"]["property_status"]
          tag: string | null
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string
          year_built: number | null
          zone: string
        }
        Insert: {
          address?: string
          agent_id: string
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          canton: Database["public"]["Enums"]["canton"]
          code?: string
          created_at?: string
          delivery?: string | null
          description?: string
          featured?: boolean
          floor?: string | null
          guests?: number | null
          id?: string
          lat: number
          lng: number
          location?: unknown
          maintenance_fee?: number | null
          operation: Database["public"]["Enums"]["property_operation"]
          parking_spaces?: number
          price: number
          published_at?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["property_status"]
          tag?: string | null
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          year_built?: number | null
          zone: string
        }
        Update: {
          address?: string
          agent_id?: string
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          canton?: Database["public"]["Enums"]["canton"]
          code?: string
          created_at?: string
          delivery?: string | null
          description?: string
          featured?: boolean
          floor?: string | null
          guests?: number | null
          id?: string
          lat?: number
          lng?: number
          location?: unknown
          maintenance_fee?: number | null
          operation?: Database["public"]["Enums"]["property_operation"]
          parking_spaces?: number
          price?: number
          published_at?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["property_status"]
          tag?: string | null
          title?: string
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          year_built?: number | null
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          position: number
          property_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          property_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          agent_id: string
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          date: string
          id: string
          mode: Database["public"]["Enums"]["visit_mode"]
          notes: string | null
          property_id: string | null
          source: Database["public"]["Enums"]["visit_source"]
          status: Database["public"]["Enums"]["visit_status"]
          time: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          date: string
          id?: string
          mode?: Database["public"]["Enums"]["visit_mode"]
          notes?: string | null
          property_id?: string | null
          source: Database["public"]["Enums"]["visit_source"]
          status?: Database["public"]["Enums"]["visit_status"]
          time: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          date?: string
          id?: string
          mode?: Database["public"]["Enums"]["visit_mode"]
          notes?: string | null
          property_id?: string | null
          source?: Database["public"]["Enums"]["visit_source"]
          status?: Database["public"]["Enums"]["visit_status"]
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_property_matches"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agents_public: {
        Row: {
          bio: string | null
          contact_hours: string | null
          contact_location: string | null
          deals_closed: number | null
          first_name: string | null
          id: string | null
          is_owner: boolean | null
          languages: string[] | null
          name: string | null
          phone: string | null
          photo_url: string | null
          rating: number | null
          response_time: string | null
          reviews_count: number | null
          specialty: string | null
          years_experience: number | null
          zones: string | null
        }
        Insert: {
          bio?: string | null
          contact_hours?: string | null
          contact_location?: string | null
          deals_closed?: number | null
          first_name?: string | null
          id?: string | null
          is_owner?: boolean | null
          languages?: string[] | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          response_time?: string | null
          reviews_count?: number | null
          specialty?: string | null
          years_experience?: number | null
          zones?: string | null
        }
        Update: {
          bio?: string | null
          contact_hours?: string | null
          contact_location?: string | null
          deals_closed?: number | null
          first_name?: string | null
          id?: string | null
          is_owner?: boolean | null
          languages?: string[] | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          response_time?: string | null
          reviews_count?: number | null
          specialty?: string | null
          years_experience?: number | null
          zones?: string | null
        }
        Relationships: []
      }
      client_property_matches: {
        Row: {
          client_id: string | null
          property_id: string | null
          score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      agent_can_access_client: {
        Args: { p_client_id: string }
        Returns: boolean
      }
      assign_client_to_me: { Args: { p_client_id: string }; Returns: undefined }
      canton_text: {
        Args: { p_canton: Database["public"]["Enums"]["canton"] }
        Returns: string
      }
      current_agent_id: { Args: never; Returns: string }
      current_client_id: { Args: never; Returns: string }
      delete_client: { Args: { p_id: string }; Returns: undefined }
      duplicate_property: { Args: { p_property_id: string }; Returns: string }
      get_client_matches: {
        Args: { p_client_id: string }
        Returns: {
          property_id: string
          score: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_agent: { Args: never; Returns: boolean }
      is_api_request: { Args: never; Returns: boolean }
      is_match_dismissed: {
        Args: { p_client_id: string; p_property_id: string }
        Returns: boolean
      }
      is_my_client: { Args: { p_client_id: string }; Returns: boolean }
      is_property_public: { Args: { p_property_id: string }; Returns: boolean }
      owns_property: { Args: { p_property_id: string }; Returns: boolean }
      request_visit: {
        Args: {
          p_agent_id?: string
          p_date: string
          p_mode?: Database["public"]["Enums"]["visit_mode"]
          p_name?: string
          p_notes?: string
          p_phone?: string
          p_property_id: string
          p_time: string
        }
        Returns: string
      }
      reorder_featured_zones: { Args: { p_ids: string[] }; Returns: undefined }
      save_client: {
        Args: {
          p_amenity_ids: string[]
          p_assigned_agent_id: string | null
          p_budget_max: number | null
          p_budget_min: number | null
          p_cantons: Database["public"]["Enums"]["canton"][]
          p_email: string | null
          p_id: string | null
          p_min_bathrooms: number | null
          p_min_bedrooms: number | null
          p_name: string
          p_notes: string | null
          p_operation: Database["public"]["Enums"]["preference_operation"] | null
          p_phone: string | null
          p_property_types: Database["public"]["Enums"]["property_type"][]
          p_status: Database["public"]["Enums"]["client_status"] | null
        }
        Returns: string
      }
      save_my_preferences: {
        Args: {
          p_amenity_ids?: string[]
          p_budget_max?: number
          p_budget_min?: number
          p_cantons?: Database["public"]["Enums"]["canton"][]
          p_max_area_m2?: number
          p_min_area_m2?: number
          p_min_bathrooms?: number
          p_min_bedrooms?: number
          p_min_parking?: number
          p_notes?: string
          p_operation?: Database["public"]["Enums"]["preference_operation"]
          p_property_types?: Database["public"]["Enums"]["property_type"][]
        }
        Returns: undefined
      }
      save_property: {
        Args: {
          p_amenity_ids: string[]
          p_data: Json
          p_id: string | null
          p_image_urls?: string[] | null
        }
        Returns: Json
      }
      search_properties: {
        Args: {
          p_agent_id?: string
          p_amenities?: string[]
          p_cantons?: Database["public"]["Enums"]["canton"][]
          p_center_lat?: number
          p_center_lng?: number
          p_ids?: string[]
          p_limit?: number
          p_max_area_m2?: number
          p_max_lat?: number
          p_max_lng?: number
          p_min_area_m2?: number
          p_min_bathrooms?: number
          p_min_bedrooms?: number
          p_min_lat?: number
          p_min_lng?: number
          p_min_parking?: number
          p_offset?: number
          p_operation?: Database["public"]["Enums"]["property_operation"]
          p_price_max?: number
          p_price_min?: number
          p_query?: string
          p_radius_km?: number
          p_sort?: string
          p_types?: Database["public"]["Enums"]["property_type"][]
        }
        Returns: {
          agent_id: string
          area_m2: number
          bathrooms: number
          bedrooms: number
          canton: Database["public"]["Enums"]["canton"]
          code: string
          cover_url: string
          featured: boolean
          guests: number
          id: string
          image_urls: string[]
          lat: number
          lng: number
          operation: Database["public"]["Enums"]["property_operation"]
          parking_spaces: number
          price: number
          published_at: string
          tag: string
          title: string
          total_count: number
          type: Database["public"]["Enums"]["property_type"]
          zone: string
        }[]
      }
      set_owner: { Args: { p_agent_id: string }; Returns: undefined }
      storage_folder_uuid: { Args: { p_name: string }; Returns: string }
    }
    Enums: {
      agent_role: "Asesor" | "Admin"
      canton:
        | "Cartago"
        | "Paraíso"
        | "La Unión"
        | "Jiménez"
        | "Turrialba"
        | "Alvarado"
        | "Oreamuno"
        | "El Guarco"
      client_source: "sitio_web" | "equipo"
      client_status:
        | "Nuevo"
        | "En seguimiento"
        | "Negociando"
        | "Cerrado"
        | "Inactivo"
      preference_operation:
        | "Venta"
        | "Alquiler"
        | "Vacacional"
        | "Preventa"
        | "Todas"
      property_operation: "Venta" | "Alquiler" | "Vacacional" | "Preventa"
      property_status:
        | "Borrador"
        | "Publicada"
        | "Pausada"
        | "Vendida"
        | "Alquilada"
      property_type:
        | "Apartamento"
        | "Casa"
        | "Terreno"
        | "Local"
        | "Oficina"
        | "Bodega"
      visit_mode: "Presencial" | "Videollamada"
      visit_source: "sitio_web" | "panel"
      visit_status: "Pendiente" | "Confirmada" | "Realizada" | "Cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_role: ["Asesor", "Admin"],
      canton: [
        "Cartago",
        "Paraíso",
        "La Unión",
        "Jiménez",
        "Turrialba",
        "Alvarado",
        "Oreamuno",
        "El Guarco",
      ],
      client_source: ["sitio_web", "equipo"],
      client_status: [
        "Nuevo",
        "En seguimiento",
        "Negociando",
        "Cerrado",
        "Inactivo",
      ],
      preference_operation: [
        "Venta",
        "Alquiler",
        "Vacacional",
        "Preventa",
        "Todas",
      ],
      property_operation: ["Venta", "Alquiler", "Vacacional", "Preventa"],
      property_status: [
        "Borrador",
        "Publicada",
        "Pausada",
        "Vendida",
        "Alquilada",
      ],
      property_type: [
        "Apartamento",
        "Casa",
        "Terreno",
        "Local",
        "Oficina",
        "Bodega",
      ],
      visit_mode: ["Presencial", "Videollamada"],
      visit_source: ["sitio_web", "panel"],
      visit_status: ["Pendiente", "Confirmada", "Realizada", "Cancelada"],
    },
  },
} as const
