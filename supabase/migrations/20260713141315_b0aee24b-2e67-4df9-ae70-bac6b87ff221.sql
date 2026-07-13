ALTER TABLE public.projets ADD COLUMN IF NOT EXISTS recommande boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_projets_recommande ON public.projets(recommande) WHERE recommande = true;