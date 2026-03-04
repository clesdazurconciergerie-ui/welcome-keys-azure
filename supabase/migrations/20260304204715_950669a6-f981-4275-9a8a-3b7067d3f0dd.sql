
-- Feature A: Calendar overrides table
CREATE TABLE public.calendar_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  source_event_id text NOT NULL,
  override_type text NOT NULL DEFAULT 'hide',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_block_anon" ON public.calendar_overrides AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "co_owner" ON public.calendar_overrides AS RESTRICTIVE FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX calendar_overrides_unique ON public.calendar_overrides (user_id, property_id, source_event_id);

-- Feature B: Cash incomes table
CREATE TABLE public.cash_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  category text DEFAULT 'other',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_block_anon" ON public.cash_incomes AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ci_owner" ON public.cash_incomes AS RESTRICTIVE FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
