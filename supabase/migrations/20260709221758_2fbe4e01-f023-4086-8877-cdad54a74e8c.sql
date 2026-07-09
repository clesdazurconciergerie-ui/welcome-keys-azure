-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_message_trigger') THEN
    CREATE TYPE public.guest_message_trigger AS ENUM ('booking_confirmed','three_days_before','day_before_arrival','check_in_day','mid_stay','day_before_checkout','one_day_after');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_message_channel') THEN
    CREATE TYPE public.guest_message_channel AS ENUM ('email','sms','whatsapp');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_message_status') THEN
    CREATE TYPE public.guest_message_status AS ENUM ('pending','sent','failed','cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, type TEXT NOT NULL DEFAULT 'analysis',
  period_start DATE, period_end DATE, status TEXT NOT NULL DEFAULT 'pending',
  error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concierge_user_id UUID NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL,
  phone TEXT, status TEXT NOT NULL DEFAULT 'pending', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owners TO authenticated;
GRANT ALL ON public.owners TO service_role;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.owner_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  booklet_id UUID NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, booklet_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_properties TO authenticated;
GRANT ALL ON public.owner_properties TO service_role;
ALTER TABLE public.owner_properties ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.owner_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  concierge_user_id UUID NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_documents TO authenticated;
GRANT ALL ON public.owner_documents TO service_role;
ALTER TABLE public.owner_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.owner_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  booklet_id UUID REFERENCES public.booklets(id) ON DELETE SET NULL,
  concierge_user_id UUID NOT NULL, type TEXT NOT NULL DEFAULT 'maintenance',
  title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_interventions TO authenticated;
GRANT ALL ON public.owner_interventions TO service_role;
ALTER TABLE public.owner_interventions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL, file_size INTEGER, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_documents TO authenticated;
GRANT ALL ON public.property_documents TO service_role;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, url TEXT NOT NULL, caption TEXT,
  category TEXT DEFAULT 'general', order_index INTEGER DEFAULT 0, is_main BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_photos TO authenticated;
GRANT ALL ON public.property_photos TO service_role;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cleaning_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  service_provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  concierge_user_id uuid NOT NULL, scheduled_date date NOT NULL, completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled', type text NOT NULL DEFAULT 'cleaning',
  notes text, concierge_notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_interventions TO authenticated;
GRANT ALL ON public.cleaning_interventions TO service_role;
ALTER TABLE public.cleaning_interventions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cleaning_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES public.cleaning_interventions(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL, type text NOT NULL DEFAULT 'after_cleaning', caption text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_photos TO authenticated;
GRANT ALL ON public.cleaning_photos TO service_role;
ALTER TABLE public.cleaning_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_text text NOT NULL, is_mandatory boolean NOT NULL DEFAULT false,
  order_index integer DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT ALL ON public.checklist_items TO service_role;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES public.cleaning_interventions(id) ON DELETE CASCADE,
  problem_type text NOT NULL DEFAULT 'other', description text, photo_url text,
  is_urgent boolean NOT NULL DEFAULT false, is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO authenticated;
GRANT ALL ON public.incident_reports TO service_role;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  concierge_user_id uuid NOT NULL, product text NOT NULL, quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending', request_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_requests TO authenticated;
GRANT ALL ON public.material_requests TO service_role;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, first_name text NOT NULL, last_name text NOT NULL,
  phone text, email text, property_address text, city text, property_type text,
  estimated_monthly_revenue numeric DEFAULT 0, pipeline_status text NOT NULL DEFAULT 'new_contact',
  source text DEFAULT 'other', warmth text DEFAULT 'cold',
  first_contact_date date DEFAULT CURRENT_DATE, last_contact_date date,
  score integer DEFAULT 0, internal_notes text,
  converted_owner_id uuid REFERENCES public.owners(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.prospect_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, interaction_type text NOT NULL DEFAULT 'call',
  interaction_date timestamptz NOT NULL DEFAULT now(),
  summary text, result text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_interactions TO authenticated;
GRANT ALL ON public.prospect_interactions TO service_role;
ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.prospect_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, scheduled_date date NOT NULL, completed_date date,
  status text NOT NULL DEFAULT 'todo', comment text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_followups TO authenticated;
GRANT ALL ON public.prospect_followups TO service_role;
ALTER TABLE public.prospect_followups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.ical_calendars(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, summary TEXT, start_date DATE NOT NULL, end_date DATE NOT NULL,
  guest_name TEXT, platform TEXT NOT NULL DEFAULT 'other', status TEXT NOT NULL DEFAULT 'confirmed',
  ical_uid TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, compensation_model text DEFAULT 'percentage',
  commission_rate numeric DEFAULT 20, cleaning_fee numeric DEFAULT 0,
  checkin_fee numeric DEFAULT 0, maintenance_rate numeric DEFAULT 0,
  ota_payout_recipient text DEFAULT 'owner', pricing_source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_financial_settings TO authenticated;
GRANT ALL ON public.property_financial_settings TO service_role;
ALTER TABLE public.property_financial_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, check_in date NOT NULL, check_out date NOT NULL,
  source text DEFAULT 'manual', guest_name text, gross_amount numeric,
  commission_amount numeric DEFAULT 0, cleaning_amount numeric DEFAULT 0,
  checkin_amount numeric DEFAULT 0, maintenance_amount numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0, owner_net numeric DEFAULT 0,
  concierge_revenue numeric DEFAULT 0, price_status text DEFAULT 'complete',
  financial_status text DEFAULT 'pending', notes text, calendar_event_id uuid,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, owner_id uuid NOT NULL REFERENCES public.owners(id),
  invoice_number text NOT NULL, invoice_date date DEFAULT CURRENT_DATE,
  period_start date NOT NULL, period_end date NOT NULL,
  subtotal numeric DEFAULT 0, vat_rate numeric DEFAULT 20, vat_amount numeric DEFAULT 0,
  total numeric DEFAULT 0, status text DEFAULT 'pending', notes text,
  company_snapshot jsonb, owner_snapshot jsonb,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, property_id uuid REFERENCES public.properties(id),
  category text DEFAULT 'other', description text NOT NULL, amount numeric NOT NULL,
  expense_date date DEFAULT CURRENT_DATE, file_url text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, provider_id uuid REFERENCES public.service_providers(id),
  date date NOT NULL DEFAULT CURRENT_DATE, description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0, vat_rate numeric DEFAULT 0, vat_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'to_pay',
  owner_id uuid REFERENCES public.owners(id), property_id uuid REFERENCES public.properties(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_payments TO authenticated;
GRANT ALL ON public.vendor_payments TO service_role;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE, ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_tasks_enabled BOOLEAN NOT NULL DEFAULT true, ai_analysis_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_listing_enabled BOOLEAN NOT NULL DEFAULT true, ai_forecast_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feature_flags TO authenticated;
GRANT ALL ON public.ai_feature_flags TO service_role;
ALTER TABLE public.ai_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, run_id UUID REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  period_start DATE, period_end DATE, summary_text TEXT,
  bullets_json JSONB DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, scope TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL, description TEXT, priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo', due_date DATE,
  source TEXT NOT NULL DEFAULT 'manual', related_type TEXT, related_id UUID,
  confidence NUMERIC, run_id UUID REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tasks TO authenticated;
GRANT ALL ON public.ai_tasks TO service_role;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  mission_type text NOT NULL DEFAULT 'cleaning', title text NOT NULL, instructions text,
  start_at timestamptz NOT NULL, end_at timestamptz, duration_minutes integer,
  payout_amount numeric DEFAULT 0, status text NOT NULL DEFAULT 'draft',
  selected_provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.owner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id),
  category text NOT NULL DEFAULT 'other', title text, status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_requests TO authenticated;
GRANT ALL ON public.owner_requests TO service_role;
ALTER TABLE public.owner_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.owner_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.owner_requests(id) ON DELETE CASCADE,
  sender_role text NOT NULL DEFAULT 'owner', message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_request_messages TO authenticated;
GRANT ALL ON public.owner_request_messages TO service_role;
ALTER TABLE public.owner_request_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mission_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  file_path text NOT NULL, url text NOT NULL, kind text NOT NULL DEFAULT 'after',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_photos TO authenticated;
GRANT ALL ON public.mission_photos TO service_role;
ALTER TABLE public.mission_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.calendar_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  source_event_id text NOT NULL, override_type text NOT NULL DEFAULT 'hide',
  reason text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_overrides TO authenticated;
GRANT ALL ON public.calendar_overrides TO service_role;
ALTER TABLE public.calendar_overrides ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cash_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0, description text NOT NULL DEFAULT '',
  income_date date NOT NULL DEFAULT CURRENT_DATE, category text DEFAULT 'other', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_incomes TO authenticated;
GRANT ALL ON public.cash_incomes TO service_role;
ALTER TABLE public.cash_incomes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  linked_inspection_id UUID,
  inspection_type TEXT NOT NULL DEFAULT 'entry',
  guest_name TEXT, inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  occupants_count INTEGER, meter_electricity TEXT, meter_water TEXT, meter_gas TEXT,
  general_comment TEXT, damage_notes TEXT,
  cleaning_photos_json JSONB DEFAULT '[]'::jsonb, exit_photos_json JSONB DEFAULT '[]'::jsonb,
  concierge_signature_url TEXT, guest_signature_url TEXT, pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_cleaning_buffer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  cleaning_intervention_id uuid REFERENCES public.cleaning_interventions(id) ON DELETE SET NULL,
  cleaning_mission_id uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_in_inspection boolean NOT NULL DEFAULT false,
  inspection_id uuid REFERENCES public.inspections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_cleaning_buffer TO authenticated;
GRANT ALL ON public.property_cleaning_buffer TO service_role;
ALTER TABLE public.property_cleaning_buffer ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  transcript_json jsonb DEFAULT '[]'::jsonb, analysis_json jsonb, duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.call_prompter_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  services_offered text DEFAULT '', commission_rate text DEFAULT '',
  geographic_area text DEFAULT '', selling_points text DEFAULT '',
  target_client text DEFAULT '', tone text DEFAULT 'premium', company_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_prompter_settings TO authenticated;
GRANT ALL ON public.call_prompter_settings TO service_role;
ALTER TABLE public.call_prompter_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.call_prompter_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, prompt_content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true, is_default BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_prompter_skills TO authenticated;
GRANT ALL ON public.call_prompter_skills TO service_role;
ALTER TABLE public.call_prompter_skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.call_prompter_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pitch TEXT, key_phrases TEXT, unique_selling_points TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_prompter_scripts TO authenticated;
GRANT ALL ON public.call_prompter_scripts TO service_role;
ALTER TABLE public.call_prompter_scripts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.photo_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label text NOT NULL, description text, required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_requirements TO authenticated;
GRANT ALL ON public.photo_requirements TO service_role;
ALTER TABLE public.photo_requirements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mission_photo_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.photo_requirements(id) ON DELETE CASCADE,
  photo_url text NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mission_id, requirement_id, photo_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_photo_completions TO authenticated;
GRANT ALL ON public.mission_photo_completions TO service_role;
ALTER TABLE public.mission_photo_completions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, property_id UUID, booking_id UUID, inspection_id UUID,
  first_name TEXT, last_name TEXT, full_name TEXT,
  email TEXT, phone TEXT, city TEXT, country TEXT, language TEXT DEFAULT 'fr',
  marketing_consent BOOLEAN NOT NULL DEFAULT false, marketing_consent_at TIMESTAMPTZ, consent_ip TEXT,
  notes TEXT, source TEXT DEFAULT 'inspection',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.guest_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, name TEXT NOT NULL,
  trigger_type public.guest_message_trigger NOT NULL,
  channel public.guest_message_channel NOT NULL DEFAULT 'email',
  subject TEXT, body_markdown TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true,
  property_ids UUID[] DEFAULT NULL, language TEXT NOT NULL DEFAULT 'fr',
  send_at_time TIME NOT NULL DEFAULT '10:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_message_templates TO authenticated;
GRANT ALL ON public.guest_message_templates TO service_role;
ALTER TABLE public.guest_message_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.guest_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.guest_message_templates(id) ON DELETE SET NULL,
  trigger_type public.guest_message_trigger NOT NULL,
  channel public.guest_message_channel NOT NULL DEFAULT 'email',
  recipient_email TEXT, recipient_phone TEXT, rendered_subject TEXT, rendered_body TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status public.guest_message_status NOT NULL DEFAULT 'pending',
  external_id TEXT, error_message TEXT, attempts INT NOT NULL DEFAULT 0, sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_scheduled_messages TO authenticated;
GRANT ALL ON public.guest_scheduled_messages TO service_role;
ALTER TABLE public.guest_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.booking_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_a_id UUID NOT NULL, event_b_id UUID NOT NULL,
  conflict_type TEXT NOT NULL DEFAULT 'overlap',
  overlap_start DATE NOT NULL, overlap_end DATE NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high', status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ, resolved_by UUID, notes TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_a_id, event_b_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_conflicts TO authenticated;
GRANT ALL ON public.booking_conflicts TO service_role;
ALTER TABLE public.booking_conflicts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL, rule_type TEXT NOT NULL DEFAULT 'seasonal',
  date_start DATE, date_end DATE, day_of_week INT[], min_nights INT,
  base_price NUMERIC(10,2), adjustment_type TEXT NOT NULL DEFAULT 'percent',
  adjustment_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pricing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  for_date DATE NOT NULL, current_price NUMERIC(10,2), suggested_price NUMERIC(10,2) NOT NULL,
  reasoning TEXT, confidence NUMERIC(3,2) DEFAULT 0.7,
  status TEXT NOT NULL DEFAULT 'pending', applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, for_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_suggestions TO authenticated;
GRANT ALL ON public.pricing_suggestions TO service_role;
ALTER TABLE public.pricing_suggestions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.smart_lock_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, provider TEXT NOT NULL, account_label TEXT,
  credentials_secret_id TEXT, is_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_lock_providers TO authenticated;
GRANT ALL ON public.smart_lock_providers TO service_role;
ALTER TABLE public.smart_lock_providers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.smart_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.smart_lock_providers(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, device_name TEXT NOT NULL, device_type TEXT,
  battery_level INT, is_active BOOLEAN NOT NULL DEFAULT true, last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, external_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_locks TO authenticated;
GRANT ALL ON public.smart_locks TO service_role;
ALTER TABLE public.smart_locks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.smart_lock_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lock_id UUID NOT NULL REFERENCES public.smart_locks(id) ON DELETE CASCADE,
  booking_id UUID, guest_name TEXT, pin_code TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL, valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', external_code_id TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), revoked_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_lock_codes TO authenticated;
GRANT ALL ON public.smart_lock_codes TO service_role;
ALTER TABLE public.smart_lock_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_ical_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  feed_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true, include_blocked BOOLEAN NOT NULL DEFAULT true,
  include_manual BOOLEAN NOT NULL DEFAULT true, last_accessed_at TIMESTAMPTZ,
  access_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_ical_exports TO authenticated;
GRANT ALL ON public.property_ical_exports TO service_role;
ALTER TABLE public.property_ical_exports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tourist_tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  commune_name TEXT, commune_code TEXT,
  rate_type TEXT NOT NULL DEFAULT 'fixed_per_night_per_person',
  rate_amount NUMERIC(10,4) NOT NULL DEFAULT 0, max_amount_per_night NUMERIC(10,2),
  exempt_under_age INT DEFAULT 18, classification TEXT DEFAULT 'meuble_tourisme_non_classe',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tourist_tax_settings TO authenticated;
GRANT ALL ON public.tourist_tax_settings TO service_role;
ALTER TABLE public.tourist_tax_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tourist_tax_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  check_in DATE NOT NULL, check_out DATE NOT NULL, nights INT NOT NULL,
  guests_count INT NOT NULL DEFAULT 1, guests_taxable INT NOT NULL DEFAULT 1,
  rate_applied NUMERIC(10,4) NOT NULL, rate_type TEXT NOT NULL, total_tax NUMERIC(10,2) NOT NULL,
  declaration_status TEXT NOT NULL DEFAULT 'pending',
  declared_at TIMESTAMPTZ, declaration_period TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tourist_tax_records TO authenticated;
GRANT ALL ON public.tourist_tax_records TO service_role;
ALTER TABLE public.tourist_tax_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  concierge_user_id UUID NOT NULL, period_month DATE NOT NULL,
  total_bookings INTEGER NOT NULL DEFAULT 0, total_nights INTEGER NOT NULL DEFAULT 0,
  available_nights INTEGER NOT NULL DEFAULT 0, occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  adr NUMERIC(10,2) NOT NULL DEFAULT 0, gross_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  owner_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_interventions INTEGER NOT NULL DEFAULT 0, total_photos INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_path TEXT, status TEXT NOT NULL DEFAULT 'generated',
  error_message TEXT, email_sent_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reports TO authenticated;
GRANT ALL ON public.monthly_reports TO service_role;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ical_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ical_calendar_id uuid NOT NULL REFERENCES public.ical_calendars(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  duration_ms integer, status text NOT NULL DEFAULT 'running',
  events_fetched integer DEFAULT 0, events_created integer DEFAULT 0,
  events_updated integer DEFAULT 0, events_deleted integer DEFAULT 0,
  duplicates_avoided integer DEFAULT 0,
  error_message text, error_code text, http_status integer,
  response_time_ms integer, retry_count integer NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'manual', sync_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ical_sync_history TO authenticated;
GRANT ALL ON public.ical_sync_history TO service_role;
ALTER TABLE public.ical_sync_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id uuid, official_date date NOT NULL, actual_created_at timestamptz NOT NULL DEFAULT now(),
  inspection_type text NOT NULL DEFAULT 'entry', status text NOT NULL DEFAULT 'draft',
  inspector_name text, inspector_role text, guest_name text,
  guest_signature_url text, concierge_signature_url text,
  notes text, global_condition text, metadata jsonb DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1, parent_inspection_id uuid,
  created_by uuid, updated_by uuid, validated_by uuid, validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_inspections TO authenticated;
GRANT ALL ON public.property_inspections TO service_role;
ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, room_name text NOT NULL, item_name text NOT NULL,
  category text, condition text NOT NULL DEFAULT 'good', notes text, quantity integer DEFAULT 1,
  photos jsonb DEFAULT '[]'::jsonb, display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_items TO authenticated;
GRANT ALL ON public.inspection_items TO service_role;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  inspection_item_id uuid REFERENCES public.inspection_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL, official_date date NOT NULL,
  actual_uploaded_at timestamptz NOT NULL DEFAULT now(),
  storage_path text NOT NULL, file_url text NOT NULL,
  file_size integer, mime_type text, width integer, height integer,
  caption text, room_name text, exif_metadata jsonb DEFAULT '{}'::jsonb,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_photos TO authenticated;
GRANT ALL ON public.inspection_photos TO service_role;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inspection_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, action text NOT NULL,
  field_changed text, old_value text, new_value text,
  changed_by uuid, changed_by_name text, reason text,
  ip_address text, user_agent text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_audit_log TO authenticated;
GRANT ALL ON public.inspection_audit_log TO service_role;
ALTER TABLE public.inspection_audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inspection_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, name text NOT NULL,
  property_type text NOT NULL DEFAULT 'apartment', description text,
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_checklist_templates TO authenticated;
GRANT ALL ON public.inspection_checklist_templates TO service_role;
ALTER TABLE public.inspection_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  auto_cleaning_missions boolean DEFAULT true, auto_link_cleaning_photos boolean DEFAULT true,
  notifications_enabled boolean DEFAULT true, provider_reminders boolean DEFAULT true,
  reminder_hours_before integer DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_settings TO authenticated;
GRANT ALL ON public.automation_settings TO service_role;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  logo_url text, company_name text,
  primary_color text DEFAULT '#061452', accent_color text DEFAULT '#C4A45B',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding TO authenticated;
GRANT ALL ON public.branding TO service_role;
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, name text NOT NULL, subject text NOT NULL, body text NOT NULL,
  type text DEFAULT 'general', is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mission_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb, mission_type text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_checklist_templates TO authenticated;
GRANT ALL ON public.mission_checklist_templates TO service_role;
ALTER TABLE public.mission_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mission_checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  template_id uuid REFERENCES public.mission_checklist_templates(id) ON DELETE SET NULL,
  items_completed jsonb DEFAULT '[]'::jsonb, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_checklist_completions TO authenticated;
GRANT ALL ON public.mission_checklist_completions TO service_role;
ALTER TABLE public.mission_checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, title text NOT NULL, message text NOT NULL,
  type text DEFAULT 'info', is_read boolean DEFAULT false,
  related_id uuid, related_type text, action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nearby_places
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS website_url text;

CREATE OR REPLACE FUNCTION public.claim_mission(mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object('success', true, 'mission_id', mission_id);
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai_runs','ai_feature_flags','ai_insights','ai_tasks','automation_settings','branding','email_templates','mission_checklist_templates','notifications','prospects','prospect_interactions','prospect_followups','property_documents','property_photos','property_financial_settings','bookings','invoices','expenses','vendor_payments','missions','mission_photos','owner_requests','calendar_overrides','cash_incomes','inspections','call_sessions','call_prompter_settings','call_prompter_skills','call_prompter_scripts','guests','guest_message_templates','guest_scheduled_messages','booking_conflicts','pricing_rules','pricing_suggestions','smart_lock_providers','smart_locks','smart_lock_codes','property_ical_exports','tourist_tax_settings','tourist_tax_records','ical_sync_history','property_inspections','inspection_items','inspection_photos','inspection_audit_log','inspection_checklist_templates','calendar_events']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', t||'_own', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['owners','owner_documents','owner_interventions','cleaning_interventions','material_requests','monthly_reports']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (concierge_user_id = auth.uid()) WITH CHECK (concierge_user_id = auth.uid());', t||'_own', t);
  END LOOP;
END $$;

-- Simple policies for child tables (via parent)
DROP POLICY IF EXISTS "owner_properties_all" ON public.owner_properties;
CREATE POLICY "owner_properties_all" ON public.owner_properties FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.owners o WHERE o.id = owner_properties.owner_id AND o.concierge_user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.owners o WHERE o.id = owner_properties.owner_id AND o.concierge_user_id = auth.uid()));

DROP POLICY IF EXISTS "cleaning_photos_all" ON public.cleaning_photos;
CREATE POLICY "cleaning_photos_all" ON public.cleaning_photos FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.cleaning_interventions c WHERE c.id = cleaning_photos.intervention_id AND c.concierge_user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.cleaning_interventions c WHERE c.id = cleaning_photos.intervention_id AND c.concierge_user_id = auth.uid()));

DROP POLICY IF EXISTS "checklist_items_all" ON public.checklist_items;
CREATE POLICY "checklist_items_all" ON public.checklist_items FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.properties p WHERE p.id = checklist_items.property_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.properties p WHERE p.id = checklist_items.property_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "incident_reports_all" ON public.incident_reports;
CREATE POLICY "incident_reports_all" ON public.incident_reports FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.cleaning_interventions c WHERE c.id = incident_reports.intervention_id AND c.concierge_user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.cleaning_interventions c WHERE c.id = incident_reports.intervention_id AND c.concierge_user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_request_messages_all" ON public.owner_request_messages;
CREATE POLICY "owner_request_messages_all" ON public.owner_request_messages FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.owner_requests r WHERE r.id = owner_request_messages.request_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.owner_requests r WHERE r.id = owner_request_messages.request_id AND r.user_id = auth.uid()));

DROP POLICY IF EXISTS "photo_requirements_all" ON public.photo_requirements;
CREATE POLICY "photo_requirements_all" ON public.photo_requirements FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.properties p WHERE p.id = photo_requirements.property_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.properties p WHERE p.id = photo_requirements.property_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "mission_photo_completions_all" ON public.mission_photo_completions;
CREATE POLICY "mission_photo_completions_all" ON public.mission_photo_completions FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.missions m WHERE m.id = mission_photo_completions.mission_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.missions m WHERE m.id = mission_photo_completions.mission_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "property_cleaning_buffer_all" ON public.property_cleaning_buffer;
CREATE POLICY "property_cleaning_buffer_all" ON public.property_cleaning_buffer FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mission_checklist_completions_all" ON public.mission_checklist_completions;
CREATE POLICY "mission_checklist_completions_all" ON public.mission_checklist_completions FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.missions m WHERE m.id = mission_checklist_completions.mission_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.missions m WHERE m.id = mission_checklist_completions.mission_id AND m.user_id = auth.uid()));