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
          amenities: Json | null
          chatbot_config: Json | null
          chatbot_enabled: boolean | null
          check_in_time: string | null
          check_out_time: string | null
          cover_image_url: string | null
          created_at: string
          emergency_contacts: string | null
          gallery: Json | null
          house_rules: string | null
          id: string
          nearby: Json | null
          property_address: string
          property_name: string
          property_type: string | null
          status: string
          updated_at: string
          user_id: string
          welcome_message: string | null
        }
        Insert: {
          amenities?: Json | null
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          cover_image_url?: string | null
          created_at?: string
          emergency_contacts?: string | null
          gallery?: Json | null
          house_rules?: string | null
          id?: string
          nearby?: Json | null
          property_address: string
          property_name: string
          property_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
          welcome_message?: string | null
        }
        Update: {
          amenities?: Json | null
          chatbot_config?: Json | null
          chatbot_enabled?: boolean | null
          check_in_time?: string | null
          check_out_time?: string | null
          cover_image_url?: string | null
          created_at?: string
          emergency_contacts?: string | null
          gallery?: Json | null
          house_rules?: string | null
          id?: string
          nearby?: Json | null
          property_address?: string
          property_name?: string
          property_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          welcome_message?: string | null
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
