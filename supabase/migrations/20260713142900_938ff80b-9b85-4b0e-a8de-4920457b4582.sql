
-- Add 'archive' to statut enum
ALTER TABLE public.projets DROP CONSTRAINT IF EXISTS projets_statut_check;
ALTER TABLE public.projets ADD CONSTRAINT projets_statut_check
  CHECK (statut = ANY (ARRAY['a_faire'::text, 'en_cours'::text, 'fait'::text, 'abandonne'::text, 'archive'::text]));

-- Business context table
CREATE TABLE IF NOT EXISTS public.contexte_business (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reponses jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contexte_business TO authenticated;
GRANT ALL ON public.contexte_business TO service_role;

ALTER TABLE public.contexte_business ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contexte" ON public.contexte_business
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_contexte_business_updated_at
  BEFORE UPDATE ON public.contexte_business
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
