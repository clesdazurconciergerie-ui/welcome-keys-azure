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
      ai_feature_flags: {
        Row: {
          ai_analysis_enabled: boolean
          ai_enabled: boolean
          ai_forecast_enabled: boolean
          ai_listing_enabled: boolean
          ai_tasks_enabled: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis_enabled?: boolean
          ai_enabled?: boolean
          ai_forecast_enabled?: boolean
          ai_listing_enabled?: boolean
          ai_tasks_enabled?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis_enabled?: boolean
          ai_enabled?: boolean
          ai_forecast_enabled?: boolean
          ai_listing_enabled?: boolean
          ai_tasks_enabled?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          bullets_json: Json | null
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          run_id: string | null
          summary_text: string | null
          user_id: string
        }
        Insert: {
          bullets_json?: Json | null
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          run_id?: string | null
          summary_text?: string | null
          user_id: string
        }
        Update: {
          bullets_json?: Json | null
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          run_id?: string | null
          summary_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_listing_suggestions: {
        Row: {
          created_at: string
          id: string
          property_id: string | null
          run_id: string | null
          suggestions: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id?: string | null
          run_id?: string | null
          suggestions?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string | null
          run_id?: string | null
          suggestions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_listing_suggestions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_listing_suggestions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          period_end: string | null
          period_start: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_tasks: {
        Row: {
          confidence: number | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_id: string | null
          related_type: string | null
          run_id: string | null
          scope: string
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_id?: string | null
          related_type?: string | null
          run_id?: string | null
          scope?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_id?: string | null
          related_type?: string | null
          run_id?: string | null
          scope?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          calendar_event_id: string | null
          check_in: string
          check_out: string
          checkin_amount: number | null
          cleaning_amount: number | null
          commission_amount: number | null
          concierge_revenue: number | null
          created_at: string | null
          financial_status: string | null
          gross_amount: number | null
          guest_name: string | null
          id: string
          maintenance_amount: number | null
          notes: string | null
          other_deductions: number | null
          owner_net: number | null
          price_status: string | null
          property_id: string
          source: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          check_in: string
          check_out: string
          checkin_amount?: number | null
          cleaning_amount?: number | null
          commission_amount?: number | null
          concierge_revenue?: number | null
          created_at?: string | null
          financial_status?: string | null
          gross_amount?: number | null
          guest_name?: string | null
          id?: string
          maintenance_amount?: number | null
          notes?: string | null
          other_deductions?: number | null
          owner_net?: number | null
          price_status?: string | null
          property_id: string
          source?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_event_id?: string | null
          check_in?: string
          check_out?: string
          checkin_amount?: number | null
          cleaning_amount?: number | null
          commission_amount?: number | null
          concierge_revenue?: number | null
          created_at?: string | null
          financial_status?: string | null
          gross_amount?: number | null
          guest_name?: string | null
          id?: string
          maintenance_amount?: number | null
          notes?: string | null
          other_deductions?: number | null
          owner_net?: number | null
          price_status?: string | null
          property_id?: string
          source?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          demo_expires_at: string | null
          disclaimer: string | null
          emergency_contacts: string | null
          gallery: Json | null
          gallery_enabled: boolean
          gallery_items: Json
          gdpr_notice: string | null
          geo: Json | null
          google_maps_link: string | null
          house_rules: string | null
          id: string
          is_complete: boolean | null
          is_demo: boolean | null
          language: string | null
          logo_url: string | null
          manual_pdf_url: string | null
          nearby: Json | null
          parking_info: string | null
          postcode: string | null
          property_address: string
          property_id: string | null
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
          demo_expires_at?: string | null
          disclaimer?: string | null
          emergency_contacts?: string | null
          gallery?: Json | null
          gallery_enabled?: boolean
          gallery_items?: Json
          gdpr_notice?: string | null
          geo?: Json | null
          google_maps_link?: string | null
          house_rules?: string | null
          id?: string
          is_complete?: boolean | null
          is_demo?: boolean | null
          language?: string | null
          logo_url?: string | null
          manual_pdf_url?: string | null
          nearby?: Json | null
          parking_info?: string | null
          postcode?: string | null
          property_address: string
          property_id?: string | null
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
          demo_expires_at?: string | null
          disclaimer?: string | null
          emergency_contacts?: string | null
          gallery?: Json | null
          gallery_enabled?: boolean
          gallery_items?: Json
          gdpr_notice?: string | null
          geo?: Json | null
          google_maps_link?: string | null
          house_rules?: string | null
          id?: string
          is_complete?: boolean | null
          is_demo?: boolean | null
          language?: string | null
          logo_url?: string | null
          manual_pdf_url?: string | null
          nearby?: Json | null
          parking_info?: string | null
          postcode?: string | null
          property_address?: string
          property_id?: string | null
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
            foreignKeyName: "booklets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booklets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          calendar_id: string
          created_at: string
          end_date: string
          event_type: string | null
          guest_name: string | null
          ical_uid: string | null
          id: string
          platform: string
          property_id: string
          start_date: string
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          end_date: string
          event_type?: string | null
          guest_name?: string | null
          ical_uid?: string | null
          id?: string
          platform?: string
          property_id: string
          start_date: string
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          end_date?: string
          event_type?: string | null
          guest_name?: string | null
          ical_uid?: string | null
          id?: string
          platform?: string
          property_id?: string
          start_date?: string
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "ical_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          created_at: string
          id: string
          is_mandatory: boolean
          order_index: number | null
          property_id: string
          task_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          order_index?: number | null
          property_id: string
          task_text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mandatory?: boolean
          order_index?: number | null
          property_id?: string
          task_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_interventions: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          admin_comment: string | null
          checklist_validated: boolean
          completed_at: string | null
          concierge_notes: string | null
          concierge_user_id: string
          created_at: string
          id: string
          internal_score: number | null
          mission_amount: number | null
          mission_type: string
          notes: string | null
          payment_done: boolean
          property_id: string
          provider_comment: string | null
          punctuality_score: number | null
          scheduled_date: string
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          service_provider_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          admin_comment?: string | null
          checklist_validated?: boolean
          completed_at?: string | null
          concierge_notes?: string | null
          concierge_user_id: string
          created_at?: string
          id?: string
          internal_score?: number | null
          mission_amount?: number | null
          mission_type?: string
          notes?: string | null
          payment_done?: boolean
          property_id: string
          provider_comment?: string | null
          punctuality_score?: number | null
          scheduled_date: string
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          service_provider_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          admin_comment?: string | null
          checklist_validated?: boolean
          completed_at?: string | null
          concierge_notes?: string | null
          concierge_user_id?: string
          created_at?: string
          id?: string
          internal_score?: number | null
          mission_amount?: number | null
          mission_type?: string
          notes?: string | null
          payment_done?: boolean
          property_id?: string
          provider_comment?: string | null
          punctuality_score?: number | null
          scheduled_date?: string
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          service_provider_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_interventions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_interventions_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_photos: {
        Row: {
          caption: string | null
          id: string
          intervention_id: string
          type: string
          uploaded_at: string
          url: string
        }
        Insert: {
          caption?: string | null
          id?: string
          intervention_id: string
          type?: string
          uploaded_at?: string
          url: string
        }
        Update: {
          caption?: string | null
          id?: string
          intervention_id?: string
          type?: string
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_photos_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "cleaning_interventions"
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
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string
          expense_date: string | null
          file_url: string | null
          id: string
          owner_id: string | null
          property_id: string | null
          status: string
          updated_at: string | null
          user_id: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description: string
          expense_date?: string | null
          file_url?: string | null
          id?: string
          owner_id?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          expense_date?: string | null
          file_url?: string | null
          id?: string
          owner_id?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          is_favorite: boolean
          order_index: number | null
          question: string
        }
        Insert: {
          answer: string
          booklet_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          order_index?: number | null
          question: string
        }
        Update: {
          answer?: string
          booklet_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
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
      financial_settings: {
        Row: {
          address: string | null
          bic: string | null
          company_name: string | null
          created_at: string | null
          default_due_days: number | null
          default_vat_rate: number | null
          iban: string | null
          id: string
          invoice_prefix: string | null
          legal_footer: string | null
          logo_url: string | null
          next_invoice_number: number | null
          org_city: string | null
          org_phone: string | null
          org_postal_code: string | null
          updated_at: string | null
          user_id: string
          vat_enabled: boolean
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bic?: string | null
          company_name?: string | null
          created_at?: string | null
          default_due_days?: number | null
          default_vat_rate?: number | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          legal_footer?: string | null
          logo_url?: string | null
          next_invoice_number?: number | null
          org_city?: string | null
          org_phone?: string | null
          org_postal_code?: string | null
          updated_at?: string | null
          user_id: string
          vat_enabled?: boolean
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bic?: string | null
          company_name?: string | null
          created_at?: string | null
          default_due_days?: number | null
          default_vat_rate?: number | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          legal_footer?: string | null
          logo_url?: string | null
          next_invoice_number?: number | null
          org_city?: string | null
          org_phone?: string | null
          org_postal_code?: string | null
          updated_at?: string | null
          user_id?: string
          vat_enabled?: boolean
          vat_number?: string | null
        }
        Relationships: []
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
      ical_calendars: {
        Row: {
          created_at: string
          id: string
          last_synced_at: string | null
          name: string
          platform: string
          property_id: string
          sync_status: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          name?: string
          platform?: string
          property_id: string
          sync_status?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          name?: string
          platform?: string
          property_id?: string
          sync_status?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_calendars_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          intervention_id: string
          is_resolved: boolean
          is_urgent: boolean
          photo_url: string | null
          problem_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          intervention_id: string
          is_resolved?: boolean
          is_urgent?: boolean
          photo_url?: string | null
          problem_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          intervention_id?: string
          is_resolved?: boolean
          is_urgent?: boolean
          photo_url?: string | null
          problem_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "cleaning_interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          booking_id: string | null
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          item_type: string | null
          line_type: string
          metadata: Json | null
          property_id: string | null
          quantity: number | null
          total: number | null
          unit_price: number | null
          vat_rate: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          item_type?: string | null
          line_type?: string
          metadata?: Json | null
          property_id?: string | null
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
          vat_rate?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string | null
          line_type?: string
          metadata?: Json | null
          property_id?: string | null
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_snapshot: Json | null
          created_at: string | null
          due_date: string | null
          generated_at: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          issue_date: string | null
          notes: string | null
          owner_id: string
          owner_snapshot: Json | null
          pdf_path: string | null
          period_end: string
          period_start: string
          status: string | null
          subtotal: number | null
          total: number | null
          type: string
          updated_at: string | null
          user_id: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          company_snapshot?: Json | null
          created_at?: string | null
          due_date?: string | null
          generated_at?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          issue_date?: string | null
          notes?: string | null
          owner_id: string
          owner_snapshot?: Json | null
          pdf_path?: string | null
          period_end: string
          period_start: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type?: string
          updated_at?: string | null
          user_id: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          company_snapshot?: Json | null
          created_at?: string | null
          due_date?: string | null
          generated_at?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          owner_id?: string
          owner_snapshot?: Json | null
          pdf_path?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          concierge_user_id: string
          created_at: string
          id: string
          product: string
          quantity: number
          request_date: string
          service_provider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          concierge_user_id: string
          created_at?: string
          id?: string
          product: string
          quantity?: number
          request_date?: string
          service_provider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          concierge_user_id?: string
          created_at?: string
          id?: string
          product?: string
          quantity?: number
          request_date?: string
          service_provider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
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
          image_url: string | null
          maps_link: string | null
          name: string
          type: string
          website_url: string | null
        }
        Insert: {
          booklet_id: string
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          maps_link?: string | null
          name: string
          type: string
          website_url?: string | null
        }
        Update: {
          booklet_id?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          maps_link?: string | null
          name?: string
          type?: string
          website_url?: string | null
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
      owner_documents: {
        Row: {
          concierge_user_id: string
          file_url: string
          id: string
          name: string
          owner_id: string
          type: string
          uploaded_at: string
        }
        Insert: {
          concierge_user_id: string
          file_url: string
          id?: string
          name: string
          owner_id: string
          type?: string
          uploaded_at?: string
        }
        Update: {
          concierge_user_id?: string
          file_url?: string
          id?: string
          name?: string
          owner_id?: string
          type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_interventions: {
        Row: {
          booklet_id: string | null
          completed_at: string | null
          concierge_user_id: string
          created_at: string
          description: string | null
          id: string
          owner_id: string
          property_id: string | null
          scheduled_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          booklet_id?: string | null
          completed_at?: string | null
          concierge_user_id: string
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          property_id?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          booklet_id?: string | null
          completed_at?: string | null
          concierge_user_id?: string
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          property_id?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_interventions_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_interventions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_interventions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_properties: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          auth_user_id: string | null
          billing_city: string | null
          billing_postal_code: string | null
          billing_street: string | null
          concierge_user_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          billing_city?: string | null
          billing_postal_code?: string | null
          billing_street?: string | null
          concierge_user_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          billing_city?: string | null
          billing_postal_code?: string | null
          billing_street?: string | null
          concierge_user_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      price_calendar: {
        Row: {
          created_at: string | null
          date: string
          id: string
          price: number
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          price: number
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          price?: number
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_calendar_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          amenities: Json | null
          avg_nightly_rate: number | null
          bathrooms: number | null
          bedrooms: number | null
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          photos: Json | null
          postcode: string | null
          pricing_strategy: string | null
          property_type: string | null
          status: string
          surface_m2: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          amenities?: Json | null
          avg_nightly_rate?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          photos?: Json | null
          postcode?: string | null
          pricing_strategy?: string | null
          property_type?: string | null
          status?: string
          surface_m2?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          amenities?: Json | null
          avg_nightly_rate?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          photos?: Json | null
          postcode?: string | null
          pricing_strategy?: string | null
          property_type?: string | null
          status?: string
          surface_m2?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          category: string
          file_size: number | null
          file_url: string
          id: string
          name: string
          property_id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          category?: string
          file_size?: number | null
          file_url: string
          id?: string
          name: string
          property_id: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          category?: string
          file_size?: number | null
          file_url?: string
          id?: string
          name?: string
          property_id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_financial_settings: {
        Row: {
          checkin_fee: number | null
          cleaning_fee: number | null
          commission_rate: number | null
          compensation_model: string | null
          created_at: string | null
          id: string
          maintenance_rate: number | null
          ota_payout_recipient: string | null
          pricing_source: string | null
          property_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checkin_fee?: number | null
          cleaning_fee?: number | null
          commission_rate?: number | null
          compensation_model?: string | null
          created_at?: string | null
          id?: string
          maintenance_rate?: number | null
          ota_payout_recipient?: string | null
          pricing_source?: string | null
          property_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checkin_fee?: number | null
          cleaning_fee?: number | null
          commission_rate?: number | null
          compensation_model?: string | null
          created_at?: string | null
          id?: string
          maintenance_rate?: number | null
          ota_payout_recipient?: string | null
          pricing_source?: string | null
          property_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_financial_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          caption: string | null
          category: string | null
          id: string
          is_main: boolean | null
          order_index: number | null
          property_id: string
          uploaded_at: string
          url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          id?: string
          is_main?: boolean | null
          order_index?: number | null
          property_id: string
          uploaded_at?: string
          url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          id?: string
          is_main?: boolean | null
          order_index?: number | null
          property_id?: string
          uploaded_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_followups: {
        Row: {
          comment: string | null
          completed_date: string | null
          created_at: string
          id: string
          prospect_id: string
          scheduled_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          completed_date?: string | null
          created_at?: string
          id?: string
          prospect_id: string
          scheduled_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          completed_date?: string | null
          created_at?: string
          id?: string
          prospect_id?: string
          scheduled_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_followups_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_date: string
          interaction_type: string
          prospect_id: string
          result: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          prospect_id: string
          result?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          prospect_id?: string
          result?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          city: string | null
          converted_owner_id: string | null
          created_at: string
          email: string | null
          estimated_monthly_revenue: number | null
          first_contact_date: string | null
          first_name: string
          id: string
          internal_notes: string | null
          last_contact_date: string | null
          last_name: string
          phone: string | null
          pipeline_status: string
          property_address: string | null
          property_type: string | null
          score: number | null
          source: string | null
          updated_at: string
          user_id: string
          warmth: string | null
        }
        Insert: {
          city?: string | null
          converted_owner_id?: string | null
          created_at?: string
          email?: string | null
          estimated_monthly_revenue?: number | null
          first_contact_date?: string | null
          first_name: string
          id?: string
          internal_notes?: string | null
          last_contact_date?: string | null
          last_name: string
          phone?: string | null
          pipeline_status?: string
          property_address?: string | null
          property_type?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string
          user_id: string
          warmth?: string | null
        }
        Update: {
          city?: string | null
          converted_owner_id?: string | null
          created_at?: string
          email?: string | null
          estimated_monthly_revenue?: number | null
          first_contact_date?: string | null
          first_name?: string
          id?: string
          internal_notes?: string | null
          last_contact_date?: string | null
          last_name?: string
          phone?: string | null
          pipeline_status?: string
          property_address?: string | null
          property_type?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string
          user_id?: string
          warmth?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_converted_owner_id_fkey"
            columns: ["converted_owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
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
      saved_places: {
        Row: {
          created_at: string
          description: string | null
          distance: string | null
          id: string
          image_url: string | null
          maps_link: string | null
          name: string
          type: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          maps_link?: string | null
          name: string
          type: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          maps_link?: string | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          auth_user_id: string | null
          concierge_user_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          score_global: number
          specialty: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          concierge_user_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          score_global?: number
          specialty?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          concierge_user_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          score_global?: number
          specialty?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      services_catalog: {
        Row: {
          active: boolean
          created_at: string
          default_unit_price: number
          default_vat_rate: number
          id: string
          name: string
          unit_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_unit_price?: number
          default_vat_rate?: number
          id?: string
          name: string
          unit_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_unit_price?: number
          default_vat_rate?: number
          id?: string
          name?: string
          unit_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          grace_period_ends_at: string | null
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
          grace_period_ends_at?: string | null
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
          grace_period_ends_at?: string | null
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
      vendor_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string
          id: string
          owner_id: string | null
          property_id: string | null
          provider_id: string | null
          status: string
          updated_at: string
          user_id: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          description: string
          id?: string
          owner_id?: string | null
          property_id?: string | null
          provider_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string
          id?: string
          owner_id?: string | null
          property_id?: string | null
          provider_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      wifi_credentials: {
        Row: {
          booklet_id: string
          created_at: string
          has_wifi: boolean
          id: string
          password: string
          ssid: string
          updated_at: string
        }
        Insert: {
          booklet_id: string
          created_at?: string
          has_wifi?: boolean
          id?: string
          password: string
          ssid: string
          updated_at?: string
        }
        Update: {
          booklet_id?: string
          created_at?: string
          has_wifi?: boolean
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
      can_access_intervention: {
        Args: { _intervention_id: string; _user_id: string }
        Returns: boolean
      }
      can_create_booklet: { Args: { uid: string }; Returns: boolean }
      can_upload_intervention_photo: {
        Args: { _intervention_id: string; _user_id: string }
        Returns: boolean
      }
      check_booklet_quota: { Args: { p_user_id: string }; Returns: boolean }
      cleanup_demo_users: { Args: never; Returns: undefined }
      expire_demo_trials: { Args: never; Returns: undefined }
      generate_pin_code: { Args: never; Returns: string }
      generate_unique_pin: { Args: never; Returns: string }
      get_service_provider_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_of_property: {
        Args: { _property_id: string; _user_id: string }
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
        | "service_provider"
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
        "service_provider",
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
