
-- =============================================
-- Restructure: Properties-first data model
-- =============================================

-- 1. Create the properties table (independent from booklets and owners)
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'France',
  surface_m2 NUMERIC,
  capacity INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  property_type TEXT DEFAULT 'apartment',
  avg_nightly_rate NUMERIC,
  pricing_strategy TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_block_anon" ON public.properties AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "properties_owner_manage" ON public.properties AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Update owner_properties: drop booklet_id FK, add property_id FK
-- Since this table was just created and likely empty, drop and recreate
DROP TABLE IF EXISTS public.owner_properties;

CREATE TABLE public.owner_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, property_id)
);

ALTER TABLE public.owner_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_properties_block_anon" ON public.owner_properties AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner_properties_manage" ON public.owner_properties AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.owners WHERE owners.id = owner_properties.owner_id AND (owners.concierge_user_id = auth.uid() OR owners.auth_user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.properties WHERE properties.id = owner_properties.property_id AND properties.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties WHERE properties.id = owner_properties.property_id AND properties.user_id = auth.uid())
  );

-- 3. Add property_id to booklets (link booklet to property, not owner)
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- 4. Update owner_interventions: add property_id alongside booklet_id
ALTER TABLE public.owner_interventions ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
