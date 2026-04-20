-- ============================================================
-- MODULES 5-8 — Migration combinée
-- ============================================================

-- ============================================================
-- MODULE 5 — Owner Requests v2 : SLA + tracking statut
-- ============================================================
-- Ajout de colonnes manquantes sur la table existante (si elle existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='owner_requests') THEN
    -- Ajouter colonnes pour SLA & tracking si manquantes
    BEGIN
      ALTER TABLE public.owner_requests ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
      ALTER TABLE public.owner_requests ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
      ALTER TABLE public.owner_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
      ALTER TABLE public.owner_requests ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT false;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- MODULE 6 — Revenue AI suggestions (table déjà créée dans la migration précédente)
-- ============================================================
-- Pas de migration supplémentaire (on réutilise pricing_suggestions).

-- ============================================================
-- MODULE 7 — Channel Manager Lite : export iCal feed par bien
-- ============================================================
CREATE TABLE IF NOT EXISTS public.property_ical_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  feed_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  include_blocked BOOLEAN NOT NULL DEFAULT true,
  include_manual BOOLEAN NOT NULL DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  access_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

ALTER TABLE public.property_ical_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ical exports"
  ON public.property_ical_exports FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_property_ical_exports_updated_at
  BEFORE UPDATE ON public.property_ical_exports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ical_exports_token ON public.property_ical_exports(feed_token) WHERE is_active = true;

-- ============================================================
-- MODULE 8 — Compliance Hub : taxe de séjour
-- ============================================================
-- Configuration taxe par bien (commune, barème)
CREATE TABLE IF NOT EXISTS public.tourist_tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  commune_name TEXT,
  commune_code TEXT,
  -- Tarif : soit forfait (€/nuit/personne), soit % du loyer
  rate_type TEXT NOT NULL DEFAULT 'fixed_per_night_per_person' CHECK (rate_type IN ('fixed_per_night_per_person', 'percentage')),
  rate_amount NUMERIC(10,4) NOT NULL DEFAULT 0,
  max_amount_per_night NUMERIC(10,2),
  -- Exonérations
  exempt_under_age INT DEFAULT 18,
  -- Catégorie hébergement (1*-5* / non classé / palace)
  classification TEXT DEFAULT 'meuble_tourisme_non_classe',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

ALTER TABLE public.tourist_tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tax settings"
  ON public.tourist_tax_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_tax_settings_updated_at
  BEFORE UPDATE ON public.tourist_tax_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calcul taxe par séjour (snapshot pour déclaration)
CREATE TABLE IF NOT EXISTS public.tourist_tax_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL,
  guests_count INT NOT NULL DEFAULT 1,
  guests_taxable INT NOT NULL DEFAULT 1,
  rate_applied NUMERIC(10,4) NOT NULL,
  rate_type TEXT NOT NULL,
  total_tax NUMERIC(10,2) NOT NULL,
  declaration_status TEXT NOT NULL DEFAULT 'pending' CHECK (declaration_status IN ('pending', 'declared', 'paid')),
  declared_at TIMESTAMPTZ,
  declaration_period TEXT, -- ex: "2025-Q1"
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tourist_tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tax records"
  ON public.tourist_tax_records FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_tax_records_updated_at
  BEFORE UPDATE ON public.tourist_tax_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tax_records_property ON public.tourist_tax_records(property_id, check_in);
CREATE INDEX IF NOT EXISTS idx_tax_records_status ON public.tourist_tax_records(declaration_status);
