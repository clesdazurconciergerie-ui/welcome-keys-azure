-- Colonnes manquantes
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_steps jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS owner_id uuid;

ALTER TABLE public.wifi_credentials
  ADD COLUMN IF NOT EXISTS has_wifi boolean DEFAULT true;

ALTER TABLE public.booklets
  ADD COLUMN IF NOT EXISTS property_id uuid;

-- Table properties
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  postcode text,
  country text,
  type text,
  bedrooms integer,
  bathrooms integer,
  max_guests integer,
  surface_m2 numeric,
  description text,
  photos jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "properties_owner_all" ON public.properties;
CREATE POLICY "properties_owner_all" ON public.properties FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Table saved_places
CREATE TABLE IF NOT EXISTS public.saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  address text,
  distance text,
  maps_link text,
  description text,
  phone text,
  url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;
GRANT ALL ON public.saved_places TO service_role;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_places_owner_all" ON public.saved_places;
CREATE POLICY "saved_places_owner_all" ON public.saved_places FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Table ical_calendars
CREATE TABLE IF NOT EXISTS public.ical_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  platform text,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ical_calendars TO authenticated;
GRANT ALL ON public.ical_calendars TO service_role;
ALTER TABLE public.ical_calendars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ical_calendars_owner_all" ON public.ical_calendars;
CREATE POLICY "ical_calendars_owner_all" ON public.ical_calendars FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Table service_providers
CREATE TABLE IF NOT EXISTS public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concierge_user_id uuid NOT NULL,
  provider_user_id uuid,
  full_name text NOT NULL,
  email text,
  phone text,
  specialties text[] DEFAULT '{}',
  hourly_rate numeric,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO service_role;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_providers_concierge_all" ON public.service_providers;
CREATE POLICY "service_providers_concierge_all" ON public.service_providers FOR ALL TO authenticated
  USING (concierge_user_id = auth.uid() OR provider_user_id = auth.uid())
  WITH CHECK (concierge_user_id = auth.uid());