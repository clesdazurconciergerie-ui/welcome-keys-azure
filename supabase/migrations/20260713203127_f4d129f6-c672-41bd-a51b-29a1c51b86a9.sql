
-- Etoile polaire
CREATE TABLE IF NOT EXISTS public.etoile_polaire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nom_metrique text NOT NULL,
  valeur_cible numeric NOT NULL DEFAULT 0,
  valeur_actuelle numeric NOT NULL DEFAULT 0,
  echeance date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etoile_polaire TO authenticated;
GRANT ALL ON public.etoile_polaire TO service_role;
ALTER TABLE public.etoile_polaire ENABLE ROW LEVEL SECURITY;
CREATE POLICY "etoile own" ON public.etoile_polaire FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER etoile_polaire_uat BEFORE UPDATE ON public.etoile_polaire
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Revues hebdo
CREATE TABLE IF NOT EXISTS public.revues_hebdo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  semaine_debut date NOT NULL,
  bilan text,
  focus_semaine jsonb DEFAULT '[]'::jsonb,
  alerte text,
  contenu jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revues_hebdo TO authenticated;
GRANT ALL ON public.revues_hebdo TO service_role;
ALTER TABLE public.revues_hebdo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revues own" ON public.revues_hebdo FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Colonnes projets
ALTER TABLE public.projets
  ADD COLUMN IF NOT EXISTS temps_reel text,
  ADD COLUMN IF NOT EXISTS a_refaire boolean,
  ADD COLUMN IF NOT EXISTS score_roi_effort integer,
  ADD COLUMN IF NOT EXISTS justification_pareto text,
  ADD COLUMN IF NOT EXISTS impact_etoile_polaire text,
  ADD COLUMN IF NOT EXISTS is_backlog boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();
