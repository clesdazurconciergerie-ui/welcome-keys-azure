
-- Call sessions table
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  transcript_json jsonb DEFAULT '[]'::jsonb,
  analysis_json jsonb,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_sessions_owner" ON public.call_sessions
  FOR ALL USING (user_id = auth.uid());

-- Call prompter settings table
CREATE TABLE public.call_prompter_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  services_offered text DEFAULT '',
  commission_rate text DEFAULT '',
  geographic_area text DEFAULT '',
  selling_points text DEFAULT '',
  target_client text DEFAULT '',
  tone text DEFAULT 'premium',
  company_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_prompter_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_prompter_settings_owner" ON public.call_prompter_settings
  FOR ALL USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_call_sessions_updated_at
  BEFORE UPDATE ON public.call_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_prompter_settings_updated_at
  BEFORE UPDATE ON public.call_prompter_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
