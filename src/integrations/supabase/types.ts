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
    PostgrestVersion: "14.5"
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
      automation_settings: {
        Row: {
          auto_cleaning_missions: boolean | null
          auto_link_cleaning_photos: boolean | null
          created_at: string
          id: string
          notifications_enabled: boolean | null
          provider_reminders: boolean | null
          reminder_hours_before: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_cleaning_missions?: boolean | null
          auto_link_cleaning_photos?: boolean | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          provider_reminders?: boolean | null
          reminder_hours_before?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_cleaning_missions?: boolean | null
          auto_link_cleaning_photos?: boolean | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          provider_reminders?: boolean | null
          reminder_hours_before?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_conflicts: {
        Row: {
          conflict_type: string
          created_at: string
          detected_at: string
          event_a_id: string
          event_b_id: string
          id: string
          notes: string | null
          overlap_end: string
          overlap_start: string
          property_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          user_id: string
        }
        Insert: {
          conflict_type?: string
          created_at?: string
          detected_at?: string
          event_a_id: string
          event_b_id: string
          id?: string
          notes?: string | null
          overlap_end: string
          overlap_start: string
          property_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id: string
        }
        Update: {
          conflict_type?: string
          created_at?: string
          detected_at?: string
          event_a_id?: string
          event_b_id?: string
          id?: string
          notes?: string | null
          overlap_end?: string
          overlap_start?: string
          property_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_conflicts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          address: string | null
          airbnb_license: string | null
          appearance: Json | null
          background_color: string | null
          check_in_time: string | null
          check_out_time: string | null
          checkin_procedure: string | null
          checkout_procedure: string | null
          city: string | null
          cleaning_rules: string | null
          cleaning_tips: string | null
          concierge_name: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
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
          property_address: string | null
          property_id: string | null
          property_name: string | null
          safety_instructions: string | null
          safety_tips: string | null
          show_logo: boolean | null
          sorting_instructions: string | null
          status: string | null
          tagline: string | null
          text_color: string | null
          timezone: string | null
          title: string | null
          unique_views_count: number | null
          updated_at: string
          user_id: string
          waste_location: string | null
          welcome_message: string | null
          wifi_name: string | null
          wifi_password: string | null
          wizard_step: number | null
        }
        Insert: {
          accent_color?: string | null
          access_code?: string | null
          address?: string | null
          airbnb_license?: string | null
          appearance?: Json | null
          background_color?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkin_procedure?: string | null
          checkout_procedure?: string | null
          city?: string | null
          cleaning_rules?: string | null
          cleaning_tips?: string | null
          concierge_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
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
          property_address?: string | null
          property_id?: string | null
          property_name?: string | null
          safety_instructions?: string | null
          safety_tips?: string | null
          show_logo?: boolean | null
          sorting_instructions?: string | null
          status?: string | null
          tagline?: string | null
          text_color?: string | null
          timezone?: string | null
          title?: string | null
          unique_views_count?: number | null
          updated_at?: string
          user_id: string
          waste_location?: string | null
          welcome_message?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
          wizard_step?: number | null
        }
        Update: {
          accent_color?: string | null
          access_code?: string | null
          address?: string | null
          airbnb_license?: string | null
          appearance?: Json | null
          background_color?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          checkin_procedure?: string | null
          checkout_procedure?: string | null
          city?: string | null
          cleaning_rules?: string | null
          cleaning_tips?: string | null
          concierge_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
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
          property_address?: string | null
          property_id?: string | null
          property_name?: string | null
          safety_instructions?: string | null
          safety_tips?: string | null
          show_logo?: boolean | null
          sorting_instructions?: string | null
          status?: string | null
          tagline?: string | null
          text_color?: string | null
          timezone?: string | null
          title?: string | null
          unique_views_count?: number | null
          updated_at?: string
          user_id?: string
          waste_location?: string | null
          welcome_message?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
          wizard_step?: number | null
        }
        Relationships: []
      }
      branding: {
        Row: {
          accent_color: string | null
          company_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          calendar_id: string
          created_at: string
          end_date: string
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
      calendar_overrides: {
        Row: {
          created_at: string
          id: string
          override_type: string
          property_id: string
          reason: string | null
          source_event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          override_type?: string
          property_id: string
          reason?: string | null
          source_event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          override_type?: string
          property_id?: string
          reason?: string | null
          source_event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_overrides_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      call_prompter_scripts: {
        Row: {
          created_at: string
          id: string
          key_phrases: string | null
          pitch: string | null
          unique_selling_points: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_phrases?: string | null
          pitch?: string | null
          unique_selling_points?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_phrases?: string | null
          pitch?: string | null
          unique_selling_points?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_prompter_settings: {
        Row: {
          commission_rate: string | null
          company_name: string | null
          created_at: string
          geographic_area: string | null
          id: string
          selling_points: string | null
          services_offered: string | null
          target_client: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate?: string | null
          company_name?: string | null
          created_at?: string
          geographic_area?: string | null
          id?: string
          selling_points?: string | null
          services_offered?: string | null
          target_client?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate?: string | null
          company_name?: string | null
          created_at?: string
          geographic_area?: string | null
          id?: string
          selling_points?: string | null
          services_offered?: string | null
          target_client?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_prompter_skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          order_index: number
          priority: string
          prompt_content: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          order_index?: number
          priority?: string
          prompt_content: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          order_index?: number
          priority?: string
          prompt_content?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          analysis_json: Json | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          prospect_id: string | null
          status: string
          transcript_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_json?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          prospect_id?: string | null
          status?: string
          transcript_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_json?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          prospect_id?: string | null
          status?: string
          transcript_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_incomes: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          income_date: string
          notes: string | null
          property_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          income_date?: string
          notes?: string | null
          property_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          income_date?: string
          notes?: string | null
          property_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_incomes_property_id_fkey"
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
          completed_at: string | null
          concierge_notes: string | null
          concierge_user_id: string
          created_at: string
          id: string
          notes: string | null
          property_id: string
          scheduled_date: string
          service_provider_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          concierge_notes?: string | null
          concierge_user_id: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          scheduled_date: string
          service_provider_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          concierge_notes?: string | null
          concierge_user_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          scheduled_date?: string
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
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          owner_id: string | null
          photos: Json | null
          steps: Json | null
        }
        Insert: {
          booklet_id: string
          category: string
          created_at?: string
          id?: string
          instructions?: string | null
          manual_url?: string | null
          name: string
          owner_id?: string | null
          photos?: Json | null
          steps?: Json | null
        }
        Update: {
          booklet_id?: string
          category?: string
          created_at?: string
          id?: string
          instructions?: string | null
          manual_url?: string | null
          name?: string
          owner_id?: string | null
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
          property_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description: string
          expense_date?: string | null
          file_url?: string | null
          id?: string
          property_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          expense_date?: string | null
          file_url?: string | null
          id?: string
          property_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
          is_favorite: boolean | null
          order_index: number | null
          question: string
        }
        Insert: {
          answer: string
          booklet_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          order_index?: number | null
          question: string
        }
        Update: {
          answer?: string
          booklet_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
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
      guest_message_templates: {
        Row: {
          body_markdown: string
          channel: Database["public"]["Enums"]["guest_message_channel"]
          created_at: string
          id: string
          is_active: boolean
          language: string
          name: string
          property_ids: string[] | null
          send_at_time: string
          subject: string | null
          trigger_type: Database["public"]["Enums"]["guest_message_trigger"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body_markdown: string
          channel?: Database["public"]["Enums"]["guest_message_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name: string
          property_ids?: string[] | null
          send_at_time?: string
          subject?: string | null
          trigger_type: Database["public"]["Enums"]["guest_message_trigger"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body_markdown?: string
          channel?: Database["public"]["Enums"]["guest_message_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          property_ids?: string[] | null
          send_at_time?: string
          subject?: string | null
          trigger_type?: Database["public"]["Enums"]["guest_message_trigger"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_scheduled_messages: {
        Row: {
          attempts: number
          booking_id: string | null
          channel: Database["public"]["Enums"]["guest_message_channel"]
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          property_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          rendered_body: string | null
          rendered_subject: string | null
          scheduled_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["guest_message_status"]
          template_id: string | null
          trigger_type: Database["public"]["Enums"]["guest_message_trigger"]
          user_id: string
        }
        Insert: {
          attempts?: number
          booking_id?: string | null
          channel?: Database["public"]["Enums"]["guest_message_channel"]
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          property_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          rendered_body?: string | null
          rendered_subject?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["guest_message_status"]
          template_id?: string | null
          trigger_type: Database["public"]["Enums"]["guest_message_trigger"]
          user_id: string
        }
        Update: {
          attempts?: number
          booking_id?: string | null
          channel?: Database["public"]["Enums"]["guest_message_channel"]
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          property_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          rendered_body?: string | null
          rendered_subject?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["guest_message_status"]
          template_id?: string | null
          trigger_type?: Database["public"]["Enums"]["guest_message_trigger"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_scheduled_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_scheduled_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_scheduled_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "guest_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          booking_id: string | null
          city: string | null
          consent_ip: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          inspection_id: string | null
          language: string | null
          last_name: string | null
          marketing_consent: boolean
          marketing_consent_at: string | null
          notes: string | null
          phone: string | null
          property_id: string | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          city?: string | null
          consent_ip?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          inspection_id?: string | null
          language?: string | null
          last_name?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          city?: string | null
          consent_ip?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          inspection_id?: string | null
          language?: string | null
          last_name?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
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
          color: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          name: string
          platform: string | null
          property_id: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          name: string
          platform?: string | null
          property_id?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          name?: string
          platform?: string | null
          property_id?: string | null
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
      ical_sync_history: {
        Row: {
          completed_at: string | null
          created_at: string
          duplicates_avoided: number | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          events_created: number | null
          events_deleted: number | null
          events_fetched: number | null
          events_updated: number | null
          http_status: number | null
          ical_calendar_id: string
          id: string
          response_time_ms: number | null
          retry_count: number
          started_at: string
          status: string
          sync_metadata: Json | null
          triggered_by: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duplicates_avoided?: number | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_fetched?: number | null
          events_updated?: number | null
          http_status?: number | null
          ical_calendar_id: string
          id?: string
          response_time_ms?: number | null
          retry_count?: number
          started_at?: string
          status?: string
          sync_metadata?: Json | null
          triggered_by?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duplicates_avoided?: number | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_fetched?: number | null
          events_updated?: number | null
          http_status?: number | null
          ical_calendar_id?: string
          id?: string
          response_time_ms?: number | null
          retry_count?: number
          started_at?: string
          status?: string
          sync_metadata?: Json | null
          triggered_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_sync_history_ical_calendar_id_fkey"
            columns: ["ical_calendar_id"]
            isOneToOne: false
            referencedRelation: "ical_calendars"
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
      inspection_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          field_changed: string | null
          id: string
          inspection_id: string
          ip_address: string | null
          new_value: string | null
          old_value: string | null
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          inspection_id: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          inspection_id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_audit_log_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "property_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_checklist_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          property_type: string
          rooms: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          property_type?: string
          rooms?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          property_type?: string
          rooms?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspection_items: {
        Row: {
          category: string | null
          condition: string
          created_at: string
          display_order: number | null
          id: string
          inspection_id: string
          item_name: string
          notes: string | null
          photos: Json | null
          quantity: number | null
          room_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          condition?: string
          created_at?: string
          display_order?: number | null
          id?: string
          inspection_id: string
          item_name: string
          notes?: string | null
          photos?: Json | null
          quantity?: number | null
          room_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          condition?: string
          created_at?: string
          display_order?: number | null
          id?: string
          inspection_id?: string
          item_name?: string
          notes?: string | null
          photos?: Json | null
          quantity?: number | null
          room_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "property_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          actual_uploaded_at: string
          caption: string | null
          created_at: string
          display_order: number | null
          exif_metadata: Json | null
          file_size: number | null
          file_url: string
          height: number | null
          id: string
          inspection_id: string
          inspection_item_id: string | null
          mime_type: string | null
          official_date: string
          room_name: string | null
          storage_path: string
          user_id: string
          width: number | null
        }
        Insert: {
          actual_uploaded_at?: string
          caption?: string | null
          created_at?: string
          display_order?: number | null
          exif_metadata?: Json | null
          file_size?: number | null
          file_url: string
          height?: number | null
          id?: string
          inspection_id: string
          inspection_item_id?: string | null
          mime_type?: string | null
          official_date: string
          room_name?: string | null
          storage_path: string
          user_id: string
          width?: number | null
        }
        Update: {
          actual_uploaded_at?: string
          caption?: string | null
          created_at?: string
          display_order?: number | null
          exif_metadata?: Json | null
          file_size?: number | null
          file_url?: string
          height?: number | null
          id?: string
          inspection_id?: string
          inspection_item_id?: string | null
          mime_type?: string | null
          official_date?: string
          room_name?: string | null
          storage_path?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "property_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_photos_inspection_item_id_fkey"
            columns: ["inspection_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          booking_id: string | null
          cleaning_photos_json: Json | null
          concierge_signature_url: string | null
          created_at: string
          damage_notes: string | null
          exit_photos_json: Json | null
          general_comment: string | null
          guest_name: string | null
          guest_signature_url: string | null
          id: string
          inspection_date: string
          inspection_type: string
          linked_inspection_id: string | null
          meter_electricity: string | null
          meter_gas: string | null
          meter_water: string | null
          occupants_count: number | null
          pdf_url: string | null
          property_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          cleaning_photos_json?: Json | null
          concierge_signature_url?: string | null
          created_at?: string
          damage_notes?: string | null
          exit_photos_json?: Json | null
          general_comment?: string | null
          guest_name?: string | null
          guest_signature_url?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          linked_inspection_id?: string | null
          meter_electricity?: string | null
          meter_gas?: string | null
          meter_water?: string | null
          occupants_count?: number | null
          pdf_url?: string | null
          property_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          cleaning_photos_json?: Json | null
          concierge_signature_url?: string | null
          created_at?: string
          damage_notes?: string | null
          exit_photos_json?: Json | null
          general_comment?: string | null
          guest_name?: string | null
          guest_signature_url?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          linked_inspection_id?: string | null
          meter_electricity?: string | null
          meter_gas?: string | null
          meter_water?: string | null
          occupants_count?: number | null
          pdf_url?: string | null
          property_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
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
          id: string
          invoice_date: string | null
          invoice_number: string
          notes: string | null
          owner_id: string
          owner_snapshot: Json | null
          period_end: string
          period_start: string
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          user_id: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          company_snapshot?: Json | null
          created_at?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          notes?: string | null
          owner_id: string
          owner_snapshot?: Json | null
          period_end: string
          period_start: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          user_id: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          company_snapshot?: Json | null
          created_at?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          notes?: string | null
          owner_id?: string
          owner_snapshot?: Json | null
          period_end?: string
          period_start?: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
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
      mission_checklist_completions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          items_completed: Json | null
          mission_id: string
          template_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          items_completed?: Json | null
          mission_id: string
          template_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          items_completed?: Json | null
          mission_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_checklist_completions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mission_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_checklist_templates: {
        Row: {
          created_at: string
          id: string
          items: Json | null
          mission_type: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json | null
          mission_type?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json | null
          mission_type?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_photo_completions: {
        Row: {
          id: string
          mission_id: string
          photo_url: string
          requirement_id: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          mission_id: string
          photo_url: string
          requirement_id: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          mission_id?: string
          photo_url?: string
          requirement_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_photo_completions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_photo_completions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "photo_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_photos: {
        Row: {
          created_at: string
          file_path: string
          id: string
          kind: string
          mission_id: string
          provider_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          kind?: string
          mission_id: string
          provider_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          kind?: string
          mission_id?: string
          provider_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_photos_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_photos_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          end_at: string | null
          id: string
          instructions: string | null
          mission_type: string
          payout_amount: number | null
          property_id: string
          selected_provider_id: string | null
          start_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          instructions?: string | null
          mission_type?: string
          payout_amount?: number | null
          property_id: string
          selected_provider_id?: string | null
          start_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          instructions?: string | null
          mission_type?: string
          payout_amount?: number | null
          property_id?: string
          selected_provider_id?: string | null
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_selected_provider_id_fkey"
            columns: ["selected_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          adr: number
          available_nights: number
          concierge_user_id: string
          created_at: string
          email_sent_at: string | null
          error_message: string | null
          generated_at: string
          gross_revenue: number
          id: string
          occupancy_rate: number
          owner_id: string
          owner_net: number
          payload: Json
          pdf_path: string | null
          period_month: string
          status: string
          total_bookings: number
          total_interventions: number
          total_nights: number
          total_photos: number
          updated_at: string
        }
        Insert: {
          adr?: number
          available_nights?: number
          concierge_user_id: string
          created_at?: string
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string
          gross_revenue?: number
          id?: string
          occupancy_rate?: number
          owner_id: string
          owner_net?: number
          payload?: Json
          pdf_path?: string | null
          period_month: string
          status?: string
          total_bookings?: number
          total_interventions?: number
          total_nights?: number
          total_photos?: number
          updated_at?: string
        }
        Update: {
          adr?: number
          available_nights?: number
          concierge_user_id?: string
          created_at?: string
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string
          gross_revenue?: number
          id?: string
          occupancy_rate?: number
          owner_id?: string
          owner_net?: number
          payload?: Json
          pdf_path?: string | null
          period_month?: string
          status?: string
          total_bookings?: number
          total_interventions?: number
          total_nights?: number
          total_photos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
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
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
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
        ]
      }
      owner_properties: {
        Row: {
          booklet_id: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          booklet_id: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          booklet_id?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_properties_booklet_id_fkey"
            columns: ["booklet_id"]
            isOneToOne: false
            referencedRelation: "booklets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_request_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          request_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          request_id: string
          sender_role?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          request_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "owner_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_requests: {
        Row: {
          category: string
          created_at: string
          id: string
          owner_id: string
          property_id: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          owner_id: string
          property_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          owner_id?: string
          property_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_requests_property_id_fkey"
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
      photo_requirements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          order_index: number
          property_id: string
          required: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          order_index?: number
          property_id: string
          required?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          order_index?: number
          property_id?: string
          required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_requirements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          booklet_quota: number | null
          created_at: string
          currency: string | null
          features: Json | null
          id: string
          interval: string | null
          is_active: boolean | null
          name: string
          price_cents: number | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          booklet_quota?: number | null
          created_at?: string
          currency?: string | null
          features?: Json | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          name: string
          price_cents?: number | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          booklet_quota?: number | null
          created_at?: string
          currency?: string | null
          features?: Json | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          name?: string
          price_cents?: number | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          base_price: number | null
          created_at: string
          date_end: string | null
          date_start: string | null
          day_of_week: number[] | null
          id: string
          is_active: boolean
          min_nights: number | null
          name: string
          priority: number
          property_id: string | null
          rule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustment_type?: string
          adjustment_value?: number
          base_price?: number | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          day_of_week?: number[] | null
          id?: string
          is_active?: boolean
          min_nights?: number | null
          name: string
          priority?: number
          property_id?: string | null
          rule_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          base_price?: number | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          day_of_week?: number[] | null
          id?: string
          is_active?: boolean
          min_nights?: number | null
          name?: string
          priority?: number
          property_id?: string | null
          rule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_suggestions: {
        Row: {
          applied_at: string | null
          confidence: number | null
          created_at: string
          current_price: number | null
          for_date: string
          id: string
          property_id: string
          reasoning: string | null
          status: string
          suggested_price: number
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          confidence?: number | null
          created_at?: string
          current_price?: number | null
          for_date: string
          id?: string
          property_id: string
          reasoning?: string | null
          status?: string
          suggested_price: number
          user_id: string
        }
        Update: {
          applied_at?: string | null
          confidence?: number | null
          created_at?: string
          current_price?: number | null
          for_date?: string
          id?: string
          property_id?: string
          reasoning?: string | null
          status?: string
          suggested_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_suggestions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          max_guests: number | null
          name: string
          photos: Json | null
          postcode: string | null
          status: string | null
          surface_m2: number | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_guests?: number | null
          name: string
          photos?: Json | null
          postcode?: string | null
          status?: string | null
          surface_m2?: number | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_guests?: number | null
          name?: string
          photos?: Json | null
          postcode?: string | null
          status?: string | null
          surface_m2?: number | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_cleaning_buffer: {
        Row: {
          cleaning_intervention_id: string | null
          cleaning_mission_id: string | null
          created_at: string
          id: string
          inspection_id: string | null
          photo_url: string
          property_id: string
          used_in_inspection: boolean
          user_id: string
        }
        Insert: {
          cleaning_intervention_id?: string | null
          cleaning_mission_id?: string | null
          created_at?: string
          id?: string
          inspection_id?: string | null
          photo_url: string
          property_id: string
          used_in_inspection?: boolean
          user_id: string
        }
        Update: {
          cleaning_intervention_id?: string | null
          cleaning_mission_id?: string | null
          created_at?: string
          id?: string
          inspection_id?: string | null
          photo_url?: string
          property_id?: string
          used_in_inspection?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_cleaning_buffer_cleaning_intervention_id_fkey"
            columns: ["cleaning_intervention_id"]
            isOneToOne: false
            referencedRelation: "cleaning_interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_cleaning_buffer_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_cleaning_buffer_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      property_ical_exports: {
        Row: {
          access_count: number
          created_at: string
          feed_token: string
          id: string
          include_blocked: boolean
          include_manual: boolean
          is_active: boolean
          last_accessed_at: string | null
          property_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number
          created_at?: string
          feed_token?: string
          id?: string
          include_blocked?: boolean
          include_manual?: boolean
          is_active?: boolean
          last_accessed_at?: string | null
          property_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number
          created_at?: string
          feed_token?: string
          id?: string
          include_blocked?: boolean
          include_manual?: boolean
          is_active?: boolean
          last_accessed_at?: string | null
          property_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_ical_exports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inspections: {
        Row: {
          actual_created_at: string
          booking_id: string | null
          concierge_signature_url: string | null
          created_at: string
          created_by: string | null
          global_condition: string | null
          guest_name: string | null
          guest_signature_url: string | null
          id: string
          inspection_type: string
          inspector_name: string | null
          inspector_role: string | null
          metadata: Json | null
          notes: string | null
          official_date: string
          parent_inspection_id: string | null
          property_id: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          version: number
        }
        Insert: {
          actual_created_at?: string
          booking_id?: string | null
          concierge_signature_url?: string | null
          created_at?: string
          created_by?: string | null
          global_condition?: string | null
          guest_name?: string | null
          guest_signature_url?: string | null
          id?: string
          inspection_type?: string
          inspector_name?: string | null
          inspector_role?: string | null
          metadata?: Json | null
          notes?: string | null
          official_date: string
          parent_inspection_id?: string | null
          property_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          version?: number
        }
        Update: {
          actual_created_at?: string
          booking_id?: string | null
          concierge_signature_url?: string | null
          created_at?: string
          created_by?: string | null
          global_condition?: string | null
          guest_name?: string | null
          guest_signature_url?: string | null
          id?: string
          inspection_type?: string
          inspector_name?: string | null
          inspector_role?: string | null
          metadata?: Json | null
          notes?: string | null
          official_date?: string
          parent_inspection_id?: string | null
          property_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          caption: string | null
          category: string | null
          display_order: number | null
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
          display_order?: number | null
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
          display_order?: number | null
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
          address: string | null
          created_at: string
          description: string | null
          distance: string | null
          id: string
          image_url: string | null
          maps_link: string | null
          name: string
          phone: string | null
          tags: string[] | null
          type: string
          url: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          maps_link?: string | null
          name: string
          phone?: string | null
          tags?: string[] | null
          type: string
          url?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          distance?: string | null
          id?: string
          image_url?: string | null
          maps_link?: string | null
          name?: string
          phone?: string | null
          tags?: string[] | null
          type?: string
          url?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          concierge_user_id: string
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          notes: string | null
          phone: string | null
          provider_user_id: string | null
          specialties: string[] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          concierge_user_id: string
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          provider_user_id?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          concierge_user_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          provider_user_id?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      smart_lock_codes: {
        Row: {
          booking_id: string | null
          created_at: string
          external_code_id: string | null
          guest_name: string | null
          id: string
          lock_id: string
          notes: string | null
          pin_code: string
          revoked_at: string | null
          status: string
          user_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          external_code_id?: string | null
          guest_name?: string | null
          id?: string
          lock_id: string
          notes?: string | null
          pin_code: string
          revoked_at?: string | null
          status?: string
          user_id: string
          valid_from: string
          valid_until: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          external_code_id?: string | null
          guest_name?: string | null
          id?: string
          lock_id?: string
          notes?: string | null
          pin_code?: string
          revoked_at?: string | null
          status?: string
          user_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_lock_codes_lock_id_fkey"
            columns: ["lock_id"]
            isOneToOne: false
            referencedRelation: "smart_locks"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_lock_providers: {
        Row: {
          account_label: string | null
          created_at: string
          credentials_secret_id: string | null
          id: string
          is_connected: boolean
          last_sync_at: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          created_at?: string
          credentials_secret_id?: string | null
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          created_at?: string
          credentials_secret_id?: string | null
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_locks: {
        Row: {
          battery_level: number | null
          created_at: string
          device_name: string
          device_type: string | null
          external_id: string
          id: string
          is_active: boolean
          last_event_at: string | null
          property_id: string | null
          provider_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          device_name: string
          device_type?: string | null
          external_id: string
          id?: string
          is_active?: boolean
          last_event_at?: string | null
          property_id?: string | null
          provider_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          device_name?: string
          device_type?: string | null
          external_id?: string
          id?: string
          is_active?: boolean
          last_event_at?: string | null
          property_id?: string | null
          provider_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_locks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_locks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "smart_lock_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
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
      tourist_tax_records: {
        Row: {
          booking_id: string | null
          check_in: string
          check_out: string
          created_at: string
          declaration_period: string | null
          declaration_status: string
          declared_at: string | null
          guests_count: number
          guests_taxable: number
          id: string
          nights: number
          notes: string | null
          property_id: string
          rate_applied: number
          rate_type: string
          total_tax: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          check_in: string
          check_out: string
          created_at?: string
          declaration_period?: string | null
          declaration_status?: string
          declared_at?: string | null
          guests_count?: number
          guests_taxable?: number
          id?: string
          nights: number
          notes?: string | null
          property_id: string
          rate_applied: number
          rate_type: string
          total_tax: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          check_in?: string
          check_out?: string
          created_at?: string
          declaration_period?: string | null
          declaration_status?: string
          declared_at?: string | null
          guests_count?: number
          guests_taxable?: number
          id?: string
          nights?: number
          notes?: string | null
          property_id?: string
          rate_applied?: number
          rate_type?: string
          total_tax?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tourist_tax_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tourist_tax_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tourist_tax_settings: {
        Row: {
          classification: string | null
          commune_code: string | null
          commune_name: string | null
          created_at: string
          exempt_under_age: number | null
          id: string
          is_enabled: boolean
          max_amount_per_night: number | null
          property_id: string
          rate_amount: number
          rate_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          classification?: string | null
          commune_code?: string | null
          commune_name?: string | null
          created_at?: string
          exempt_under_age?: number | null
          id?: string
          is_enabled?: boolean
          max_amount_per_night?: number | null
          property_id: string
          rate_amount?: number
          rate_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          classification?: string | null
          commune_code?: string | null
          commune_name?: string | null
          created_at?: string
          exempt_under_age?: number | null
          id?: string
          is_enabled?: boolean
          max_amount_per_night?: number | null
          property_id?: string
          rate_amount?: number
          rate_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tourist_tax_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
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
          avatar_url: string | null
          booklet_quota: number | null
          created_at: string
          demo_token_expires_at: string | null
          demo_token_issued_at: string | null
          email: string
          full_name: string | null
          has_used_demo: boolean | null
          id: string
          latest_checkout_session_id: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_steps: Json | null
          phone: string | null
          plan: string | null
          role: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          trial_expires_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          booklet_quota?: number | null
          created_at?: string
          demo_token_expires_at?: string | null
          demo_token_issued_at?: string | null
          email: string
          full_name?: string | null
          has_used_demo?: boolean | null
          id: string
          latest_checkout_session_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_steps?: Json | null
          phone?: string | null
          plan?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          booklet_quota?: number | null
          created_at?: string
          demo_token_expires_at?: string | null
          demo_token_issued_at?: string | null
          email?: string
          full_name?: string | null
          has_used_demo?: boolean | null
          id?: string
          latest_checkout_session_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_steps?: Json | null
          phone?: string | null
          plan?: string | null
          role?: string | null
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
          has_wifi: boolean | null
          id: string
          password: string
          ssid: string
          updated_at: string
        }
        Insert: {
          booklet_id: string
          created_at?: string
          has_wifi?: boolean | null
          id?: string
          password: string
          ssid: string
          updated_at?: string
        }
        Update: {
          booklet_id?: string
          created_at?: string
          has_wifi?: boolean | null
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
      claim_mission: { Args: { _mission_id: string }; Returns: Json }
      generate_unique_pin: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
      guest_message_channel: "email" | "sms" | "whatsapp"
      guest_message_status: "pending" | "sent" | "failed" | "cancelled"
      guest_message_trigger:
        | "booking_confirmed"
        | "three_days_before"
        | "day_before_arrival"
        | "check_in_day"
        | "mid_stay"
        | "day_before_checkout"
        | "one_day_after"
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
      guest_message_channel: ["email", "sms", "whatsapp"],
      guest_message_status: ["pending", "sent", "failed", "cancelled"],
      guest_message_trigger: [
        "booking_confirmed",
        "three_days_before",
        "day_before_arrival",
        "check_in_day",
        "mid_stay",
        "day_before_checkout",
        "one_day_after",
      ],
    },
  },
} as const
