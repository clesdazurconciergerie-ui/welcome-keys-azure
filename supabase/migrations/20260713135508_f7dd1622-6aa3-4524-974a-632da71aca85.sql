
-- Poles
CREATE TABLE public.poles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero int NOT NULL UNIQUE CHECK (numero BETWEEN 1 AND 99),
  nom text NOT NULL,
  objectif text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.poles TO authenticated;
GRANT ALL ON public.poles TO service_role;

ALTER TABLE public.poles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poles_auth_all" ON public.poles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projets
CREATE TABLE public.projets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pole_id uuid NOT NULL REFERENCES public.poles(id) ON DELETE CASCADE,
  nom text NOT NULL,
  objectif text,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  automatisations jsonb NOT NULL DEFAULT '[]'::jsonb,
  kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  priorite text NOT NULL DEFAULT 'P3' CHECK (priorite IN ('P1','P2','P3','P4')),
  difficulte int NOT NULL DEFAULT 3 CHECK (difficulte BETWEEN 1 AND 5),
  impact int NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  statut text NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire','en_cours','fait','abandonne')),
  resultat text,
  date_validation timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projets_pole ON public.projets(pole_id);
CREATE INDEX idx_projets_statut ON public.projets(statut);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projets TO authenticated;
GRANT ALL ON public.projets TO service_role;

ALTER TABLE public.projets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projets_auth_all" ON public.projets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Suggestions IA
CREATE TABLE public.suggestions_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id uuid REFERENCES public.projets(id) ON DELETE SET NULL,
  contenu jsonb NOT NULL DEFAULT '{}'::jsonb,
  acceptee boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suggestions_projet ON public.suggestions_ia(projet_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions_ia TO authenticated;
GRANT ALL ON public.suggestions_ia TO service_role;

ALTER TABLE public.suggestions_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_ia_auth_all" ON public.suggestions_ia
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers updated_at
CREATE TRIGGER trg_poles_updated_at BEFORE UPDATE ON public.poles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_projets_updated_at BEFORE UPDATE ON public.projets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 12 pôles
INSERT INTO public.poles (numero, nom, objectif) VALUES
  (1, 'Acquisition Propriétaires', 'Signer de nouveaux mandats de gestion'),
  (2, 'Marketing', 'Développer la visibilité et la notoriété de la marque'),
  (3, 'Vente', 'Convertir les prospects propriétaires en clients'),
  (4, 'Onboarding Propriétaire', 'Intégrer les nouveaux propriétaires efficacement'),
  (5, 'MyWelcome (produit)', 'Développer et améliorer le produit MyWelcome'),
  (6, 'Automatisation', 'Automatiser les tâches répétitives'),
  (7, 'Optimisation Airbnb/Booking', 'Maximiser les performances sur les OTA'),
  (8, 'Expérience Voyageur', 'Offrir une expérience premium aux voyageurs'),
  (9, 'Upsells', 'Développer les ventes additionnelles'),
  (10, 'Opérations', 'Optimiser les opérations quotidiennes'),
  (11, 'Finance', 'Piloter la rentabilité et la trésorerie'),
  (12, 'Vision Long Terme', 'Structurer la vision stratégique à long terme');
