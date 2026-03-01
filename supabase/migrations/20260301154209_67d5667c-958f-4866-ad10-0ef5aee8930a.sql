
-- Prospects table
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  property_address text,
  city text,
  property_type text,
  estimated_monthly_revenue numeric DEFAULT 0,
  pipeline_status text NOT NULL DEFAULT 'new_contact',
  source text DEFAULT 'other',
  warmth text DEFAULT 'cold',
  first_contact_date date DEFAULT CURRENT_DATE,
  last_contact_date date,
  score integer DEFAULT 0,
  internal_notes text,
  converted_owner_id uuid REFERENCES public.owners(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_select_own" ON public.prospects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "prospects_insert_own" ON public.prospects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "prospects_update_own" ON public.prospects FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "prospects_delete_own" ON public.prospects FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "prospects_block_anon" ON public.prospects AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Prospect interactions table
CREATE TABLE public.prospect_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  interaction_type text NOT NULL DEFAULT 'call',
  interaction_date timestamptz NOT NULL DEFAULT now(),
  summary text,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pi_select_own" ON public.prospect_interactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pi_insert_own" ON public.prospect_interactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pi_update_own" ON public.prospect_interactions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pi_delete_own" ON public.prospect_interactions FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "pi_block_anon" ON public.prospect_interactions AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Prospect followups (relances) table
CREATE TABLE public.prospect_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  completed_date date,
  status text NOT NULL DEFAULT 'todo',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_select_own" ON public.prospect_followups FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pf_insert_own" ON public.prospect_followups FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pf_update_own" ON public.prospect_followups FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pf_delete_own" ON public.prospect_followups FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "pf_block_anon" ON public.prospect_followups AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prospect_followups_updated_at BEFORE UPDATE ON public.prospect_followups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
