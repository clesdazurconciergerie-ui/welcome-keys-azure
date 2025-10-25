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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          age_restrictions: string | null
          booking_url: string | null
          booklet_id: string
          category: string | null
          created_at: string | null
          duration: string | null
          id: string
          is_owner_pick: boolean | null
          name: string
          order_index: number | null
          price: string | null
          tags: string[] | null
          updated_at: string | null
          when_available: string[] | null
        }
        Insert: {
          age_restrictions?: string | null
          booking_url?: string | null
          booklet_id: string
          category?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          is_owner_pick?: boolean | null
          name: string
          order_index?: number | null
          price?: string | null
          tags?: string[] | null
          updated_at?: string | null
          when_available?: string[] | null
        }
        Update: {
          age_restrictions?: string | null
          booking_url?: string | null
          booklet_id?: string
          category?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          is_owner_pick?: boolean | null
          name?: string
          order_index?: number | null
          price?: string | null
          tags?: string[] | null
          updated_at?: string | null
          when_available?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      booklet_contacts: {
        Row: {
          booklet_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          booklet_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          booklet_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booklet_contacts_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      booklets: {
        Row: {
          access_code: string | null
          airbnb_license: string | null
          amenities: Json | null
          chatbot_config: Json | null
          chatbot_enabled: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          checkin_procedure: string | null
          checkout_procedure: string | null
          city: string | null
          cleaning_rules: string | null
          cleaning_tips: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          disclaimer: string | null
          emergency_contacts: string | null
          gallery: Json | null
          gdpr_notice: string | null
          geo: Json | null
          google_maps_link: string | null
          house_rules: string | null
          id: string
          is_complete: boolean | null
          language: string | null
          manual_pdf_url: string | null
          nearby: Json | null
          parking_info: string | null
          postcode: string | null
          property_address: string
          property_name: string
          property_type: string | null
          safety_instructions: string | null
          safety_tips: string | null
          show_logo: boolean | null
          sorting_instructions: string | null
          status: string
          tagline: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          waste_location: string | null
          welcome_message: string | null
          wizard_step: number | null
        }
        Insert: {
          access_code?: string | null
          airbnb_license?: string | null
          amenities?: Json | null
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkin_procedure?: string | null
          checkout_procedure?: string | null
          city?: string | null
          cleaning_rules?: string | null
          cleaning_tips?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          disclaimer?: string | null
          emergency_contacts?: string | null
          gallery?: Json | null
          gdpr_notice?: string | null
          geo?: Json | null
          google_maps_link?: string | null
          house_rules?: string | null
          id?: string
          is_complete?: boolean | null
          language?: string | null
          manual_pdf_url?: string | null
          nearby?: Json | null
          parking_info?: string | null
          postcode?: string | null
          property_address: string
          property_name: string
          property_type?: string | null
          safety_instructions?: string | null
          safety_tips?: string | null
          show_logo?: boolean | null
          sorting_instructions?: string | null
          status?: string
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          waste_location?: string | null
          welcome_message?: string | null
          wizard_step?: number | null
        }
        Update: {
          access_code?: string | null
          airbnb_license?: string | null
          amenities?: Json | null
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkin_procedure?: string | null
          checkout_procedure?: string | null
          city?: string | null
          cleaning_rules?: string | null
          cleaning_tips?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          disclaimer?: string | null
          emergency_contacts?: string | null
          gallery?: Json | null
          gdpr_notice?: string | null
          geo?: Json | null
          google_maps_link?: string | null
          house_rules?: string | null
          id?: string
          is_complete?: boolean | null
          language?: string | null
          manual_pdf_url?: string | null
          nearby?: Json | null
          parking_info?: string | null
          postcode?: string | null
          property_address?: string
          property_name?: string
          property_type?: string | null
          safety_instructions?: string | null
          safety_tips?: string | null
          show_logo?: boolean | null
          sorting_instructions?: string | null
          status?: string
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          waste_location?: string | null
          welcome_message?: string | null
          wizard_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booklets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          booklet_id: string
          category: string
          created_at: string
          id: string
          instructions: string | null
          manual_url: string | null
          name: string
        }
        Insert: {
          booklet_id: string
          category: string
          created_at?: string
          id?: string
          instructions?: string | null
          manual_url?: string | null
          name: string
        }
        Update: {
          booklet_id?: string
          category?: string
          created_at?: string
          id?: string
          instructions?: string | null
          manual_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      essentials: {
        Row: {
          address: string | null
          booklet_id: string
          created_at: string | null
          distance: string | null
          hours: string | null
          id: string
          name: string
          notes: string | null
          order_index: number | null
          phone: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          booklet_id: string
          created_at?: string | null
          distance?: string | null
          hours?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number | null
          phone?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          booklet_id?: string
          created_at?: string | null
          distance?: string | null
          hours?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number | null
          phone?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essentials_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      faq: {
        Row: {
          answer: string
          booklet_id: string
          created_at: string
          id: string
          order_index: number | null
          question: string
        }
        Insert: {
          answer: string
          booklet_id: string
          created_at?: string
          id?: string
          order_index?: number | null
          question: string
        }
        Update: {
          answer?: string
          booklet_id?: string
          created_at?: string
          id?: string
          order_index?: number | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          booklet_id: string
          created_at: string | null
          description: string | null
          id: string
          order_index: number | null
          price_range: string | null
          rating: number | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          booklet_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          price_range?: string | null
          rating?: number | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          booklet_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          price_range?: string | null
          rating?: number | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "highlights_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      nearby_places: {
        Row: {
          booklet_id: string
          created_at: string
          description: string | null
          distance: string | null
          id: string
          maps_link: string | null
          name: string
          type: string
        }
        Insert: {
          booklet_id: string
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          maps_link?: string | null
          name: string
          type: string
        }
        Update: {
          booklet_id?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          maps_link?: string | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nearby_places_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      pins: {
        Row: {
          booklet_id: string
          created_at: string
          id: string
          pin_code: string
          status: string
        }
        Insert: {
          booklet_id: string
          created_at?: string
          id?: string
          pin_code: string
          status?: string
        }
        Update: {
          booklet_id?: string
          created_at?: string
          id?: string
          pin_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pins_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          booklet_id: string
          created_at: string | null
          cuisine: string | null
          id: string
          is_owner_pick: boolean | null
          name: string
          order_index: number | null
          phone: string | null
          price_range: string | null
          rating: number | null
          tags: string[] | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          address?: string | null
          booklet_id: string
          created_at?: string | null
          cuisine?: string | null
          id?: string
          is_owner_pick?: boolean | null
          name: string
          order_index?: number | null
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          address?: string | null
          booklet_id?: string
          created_at?: string | null
          cuisine?: string | null
          id?: string
          is_owner_pick?: boolean | null
          name?: string
          order_index?: number | null
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          tags?: string[] | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      transport: {
        Row: {
          address: string | null
          booklet_id: string
          created_at: string | null
          distance: string | null
          id: string
          instructions: string | null
          name: string
          order_index: number | null
          price: string | null
          type: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          address?: string | null
          booklet_id: string
          created_at?: string | null
          distance?: string | null
          id?: string
          instructions?: string | null
          name: string
          order_index?: number | null
          price?: string | null
          type: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          address?: string | null
          booklet_id?: string
          created_at?: string | null
          distance?: string | null
          id?: string
          instructions?: string | null
          name?: string
          order_index?: number | null
          price?: string | null
          type?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          booklet_quota: number
          created_at: string
          email: string
          id: string
          plan: string
          role: string
          updated_at: string
        }
        Insert: {
          booklet_quota?: number
          created_at?: string
          email: string
          id: string
          plan?: string
          role?: string
          updated_at?: string
        }
        Update: {
          booklet_quota?: number
          created_at?: string
          email?: string
          id?: string
          plan?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      wifi_credentials: {
        Row: {
          booklet_id: string
          created_at: string
          id: string
          password: string
          ssid: string
          updated_at: string
        }
        Insert: {
          booklet_id: string
          created_at?: string
          id?: string
          password: string
          ssid: string
          updated_at?: string
        }
        Update: {
          booklet_id?: string
          created_at?: string
          id?: string
          password?: string
          ssid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wifi_credentials_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_booklet_quota: { Args: { p_user_id: string }; Returns: boolean }
      generate_pin_code: { Args: never; Returns: string }
      generate_unique_pin: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
