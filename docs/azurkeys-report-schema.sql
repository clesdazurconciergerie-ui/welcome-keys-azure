-- Azurkeys Report module — tables, RLS, grants, seed
-- À exécuter dans le SQL editor de votre projet Supabase.
-- Namespacé (azurkeys_*) pour éviter tout conflit avec la table "properties" existante.

-- 1. Properties (logements gérés par la conciergerie Azurkeys)
CREATE TABLE IF NOT EXISTS public.azurkeys_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nom text NOT NULL,
  ville text NOT NULL DEFAULT 'Saint-Raphaël',
  proprietaire text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.azurkeys_properties TO authenticated;
GRANT ALL ON public.azurkeys_properties TO service_role;

ALTER TABLE public.azurkeys_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "azurkeys_properties_auth_all" ON public.azurkeys_properties;
CREATE POLICY "azurkeys_properties_auth_all"
  ON public.azurkeys_properties
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Reports (rapports mensuels)
CREATE TABLE IF NOT EXISTS public.azurkeys_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_slug text NOT NULL REFERENCES public.azurkeys_properties(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  period text NOT NULL, -- YYYY-MM
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  manuel jsonb NOT NULL DEFAULT '{}'::jsonb,
  score jsonb NOT NULL DEFAULT '{}'::jsonb,
  texte jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_slug, period)
);

CREATE INDEX IF NOT EXISTS idx_azurkeys_reports_property ON public.azurkeys_reports(property_slug);
CREATE INDEX IF NOT EXISTS idx_azurkeys_reports_period ON public.azurkeys_reports(period);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.azurkeys_reports TO authenticated;
GRANT ALL ON public.azurkeys_reports TO service_role;

ALTER TABLE public.azurkeys_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "azurkeys_reports_auth_all" ON public.azurkeys_reports;
CREATE POLICY "azurkeys_reports_auth_all"
  ON public.azurkeys_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Seed 11 logements
INSERT INTO public.azurkeys_properties (slug, nom, ville, proprietaire) VALUES
  ('villa-du-rastel',        'Villa du Rastel',         'Saint-Raphaël', NULL),
  ('villa-la-palmeraie',     'Villa La Palmeraie',      'Saint-Raphaël', NULL),
  ('balcon-front-de-mer',    'Balcon Front de Mer',     'Saint-Raphaël', 'Christine Olivier'),
  ('appartement-petanque',   'Appartement Pétanque',    'Saint-Raphaël', 'Vincent Dareg'),
  ('cap-esterel',            'Cap Estérel',             'Agay',          NULL),
  ('hameau-des-pains',       'Hameau des Pains',        'Saint-Raphaël', 'Karen'),
  ('le-cocon-urbain',        'Le Cocon Urbain',         'Saint-Raphaël', NULL),
  ('terrasses-de-geolia',    'Les Terrasses de Géolia', 'Saint-Raphaël', NULL),
  ('villa-provencal',        'Villa Provençal',         'Saint-Raphaël', NULL),
  ('villa-le-petit-defend',  'Villa le Petit Défend',   'Saint-Raphaël', NULL),
  ('vuillez',                'Vuillez',                 'Saint-Raphaël', NULL)
ON CONFLICT (slug) DO NOTHING;
