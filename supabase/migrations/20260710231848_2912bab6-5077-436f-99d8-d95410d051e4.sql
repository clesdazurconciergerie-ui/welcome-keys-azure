
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

CREATE POLICY "azurkeys_properties_auth_all"
  ON public.azurkeys_properties
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_azurkeys_properties_updated
  BEFORE UPDATE ON public.azurkeys_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.azurkeys_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_slug text NOT NULL REFERENCES public.azurkeys_properties(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  period text NOT NULL,
  period_label text,
  kpi_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysis_text jsonb NOT NULL DEFAULT '{}'::jsonb,
  screenshot_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_slug, period)
);

CREATE INDEX IF NOT EXISTS idx_azurkeys_reports_property ON public.azurkeys_reports(property_slug);
CREATE INDEX IF NOT EXISTS idx_azurkeys_reports_period ON public.azurkeys_reports(period);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.azurkeys_reports TO authenticated;
GRANT ALL ON public.azurkeys_reports TO service_role;

ALTER TABLE public.azurkeys_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "azurkeys_reports_auth_all"
  ON public.azurkeys_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_azurkeys_reports_updated
  BEFORE UPDATE ON public.azurkeys_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
