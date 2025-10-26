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
      _signup_errors: {
        Row: {
          details: string | null
          id: number
          occurred_at: string | null
        }
        Insert: {
          details?: string | null
          id?: number
          occurred_at?: string | null
        }
        Update: {
          details?: string | null
          id?: number
          occurred_at?: string | null
        }
        Relationships: []
      }
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
          accent_color: string | null
          access_code: string | null
          airbnb_license: string | null
          amenities: Json | null
          appearance: Json | null
          background_color: string | null
          chatbot_config: Json | null
          chatbot_enabled: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          checkin_procedure: string | null
          checkout_procedure: string | null
          city: string | null
          cleaning_rules: string | null
          cleaning_tips: string | null
          concierge_name: string | null
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
          logo_url: string | null
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
          text_color: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          waste_location: string | null
          welcome_message: string | null
          wizard_step: number | null
        }
        Insert: {
          accent_color?: string | null
          access_code?: string | null
          airbnb_license?: string | null
          amenities?: Json | null
          appearance?: Json | null
          background_color?: string | null
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkin_procedure?: string | null
          checkout_procedure?: string | null
          city?: string | null
          cleaning_rules?: string | null
          cleaning_tips?: string | null
          concierge_name?: string | null
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
          logo_url?: string | null
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
          text_color?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          waste_location?: string | null
          welcome_message?: string | null
          wizard_step?: number | null
        }
        Update: {
          accent_color?: string | null
          access_code?: string | null
          airbnb_license?: string | null
          amenities?: Json | null
          appearance?: Json | null
          background_color?: string | null
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkin_procedure?: string | null
          checkout_procedure?: string | null
          city?: string | null
          cleaning_rules?: string | null
          cleaning_tips?: string | null
          concierge_name?: string | null
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
          logo_url?: string | null
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
          text_color?: string | null
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
          manual_url: string | null
          name: string
          owner_id: string
          photos: Json | null
          steps: Json | null
        }
        Insert: {
          booklet_id: string
          category: string
          created_at?: string
          id?: string
          manual_url?: string | null
          name: string
          owner_id: string
          photos?: Json | null
          steps?: Json | null
        }
        Update: {
          booklet_id?: string
          category?: string
          created_at?: string
          id?: string
          manual_url?: string | null
          name?: string
          owner_id?: string
          photos?: Json | null
          steps?: Json | null
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
      plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          interval: Database["public"]["Enums"]["billing_interval"]
          is_active: boolean
          name: string
          price_cents: number
          slug: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          interval?: Database["public"]["Enums"]["billing_interval"]
          is_active?: boolean
          name: string
          price_cents: number
          slug: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          interval?: Database["public"]["Enums"]["billing_interval"]
          is_active?: boolean
          name?: string
          price_cents?: number
          slug?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          booklet_quota: number
          created_at: string
          demo_token_expires_at: string | null
          demo_token_issued_at: string | null
          email: string
          has_used_demo: boolean | null
          id: string
          latest_checkout_session_id: string | null
          plan: string
          role: string
          stripe_customer_id: string | null
          subscription_status: string | null
          trial_expires_at: string | null
          updated_at: string
        }
        Insert: {
          booklet_quota?: number
          created_at?: string
          demo_token_expires_at?: string | null
          demo_token_issued_at?: string | null
          email: string
          has_used_demo?: boolean | null
          id: string
          latest_checkout_session_id?: string | null
          plan?: string
          role?: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          booklet_quota?: number
          created_at?: string
          demo_token_expires_at?: string | null
          demo_token_issued_at?: string | null
          email?: string
          has_used_demo?: boolean | null
          id?: string
          latest_checkout_session_id?: string | null
          plan?: string
          role?: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_expires_at?: string | null
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
      can_create_booklet: { Args: { uid: string }; Returns: boolean }
      check_booklet_quota: { Args: { p_user_id: string }; Returns: boolean }
      cleanup_demo_users: { Args: never; Returns: undefined }
      generate_pin_code: { Args: never; Returns: string }
      generate_unique_pin: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      try_cast_jsonb: { Args: { txt: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "free_trial"
        | "demo_user"
        | "free"
        | "pack_starter"
        | "pack_pro"
        | "pack_business"
        | "pack_premium"
        | "super_admin"
      billing_interval: "month" | "year"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
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
    Enums: {
      app_role: [
        "free_trial",
        "demo_user",
        "free",
        "pack_starter",
        "pack_pro",
        "pack_business",
        "pack_premium",
        "super_admin",
      ],
      billing_interval: ["month", "year"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
      ],
    },
  },
} as const
