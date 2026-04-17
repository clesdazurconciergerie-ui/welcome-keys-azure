-- Table guests : centralise les données voyageurs collectées lors des états des lieux
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID,
  booking_id UUID,
  inspection_id UUID,

  -- Identité
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,

  -- Contact
  email TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,
  language TEXT DEFAULT 'fr',

  -- RGPD
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent_at TIMESTAMPTZ,
  consent_ip TEXT,

  -- Meta
  notes TEXT,
  source TEXT DEFAULT 'inspection',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guests_user ON public.guests(user_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON public.guests(user_id, email);
CREATE INDEX IF NOT EXISTS idx_guests_property ON public.guests(property_id);
CREATE INDEX IF NOT EXISTS idx_guests_booking ON public.guests(booking_id);
CREATE INDEX IF NOT EXISTS idx_guests_inspection ON public.guests(inspection_id);
CREATE INDEX IF NOT EXISTS idx_guests_marketing ON public.guests(user_id, marketing_consent) WHERE marketing_consent = true;

-- RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Bloque accès anonyme
CREATE POLICY "guests_block_anon" ON public.guests
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Concierge owner : ALL
CREATE POLICY "guests_owner_all" ON public.guests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owner du bien : SELECT
CREATE POLICY "guests_property_owner_select" ON public.guests
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(auth.uid(), property_id));

-- Trigger updated_at
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();