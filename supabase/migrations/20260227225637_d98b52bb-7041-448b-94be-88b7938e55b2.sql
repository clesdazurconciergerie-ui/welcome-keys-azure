-- Add service_provider to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_provider';

-- ========================================
-- Service Providers table
-- ========================================
CREATE TABLE public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concierge_user_id uuid NOT NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  specialty text NOT NULL DEFAULT 'cleaning',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select" ON public.service_providers
  FOR SELECT TO authenticated
  USING (concierge_user_id = auth.uid() OR auth_user_id = auth.uid());

CREATE POLICY "sp_insert" ON public.service_providers
  FOR INSERT TO authenticated
  WITH CHECK (concierge_user_id = auth.uid());

CREATE POLICY "sp_update" ON public.service_providers
  FOR UPDATE TO authenticated
  USING (concierge_user_id = auth.uid() OR auth_user_id = auth.uid())
  WITH CHECK (concierge_user_id = auth.uid());

CREATE POLICY "sp_delete" ON public.service_providers
  FOR DELETE TO authenticated
  USING (concierge_user_id = auth.uid());

-- ========================================
-- Security definer: get SP id from auth user
-- ========================================
CREATE OR REPLACE FUNCTION public.get_service_provider_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM service_providers
  WHERE auth_user_id = _user_id AND status = 'active'
  LIMIT 1;
$$;

-- ========================================
-- Cleaning Interventions table
-- ========================================
CREATE TABLE public.cleaning_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  service_provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  concierge_user_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  type text NOT NULL DEFAULT 'cleaning',
  notes text,
  concierge_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cleaning_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_concierge_all" ON public.cleaning_interventions
  FOR ALL TO authenticated
  USING (concierge_user_id = auth.uid())
  WITH CHECK (concierge_user_id = auth.uid());

CREATE POLICY "ci_sp_select" ON public.cleaning_interventions
  FOR SELECT TO authenticated
  USING (service_provider_id = public.get_service_provider_id(auth.uid()));

CREATE POLICY "ci_sp_update" ON public.cleaning_interventions
  FOR UPDATE TO authenticated
  USING (service_provider_id = public.get_service_provider_id(auth.uid()));

CREATE POLICY "ci_owner_select" ON public.cleaning_interventions
  FOR SELECT TO authenticated
  USING (public.is_owner_of_property(auth.uid(), property_id));

-- ========================================
-- Security definer: check intervention access
-- ========================================
CREATE OR REPLACE FUNCTION public.can_access_intervention(_user_id uuid, _intervention_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cleaning_interventions ci
    LEFT JOIN service_providers sp ON sp.id = ci.service_provider_id
    WHERE ci.id = _intervention_id
    AND (
      ci.concierge_user_id = _user_id
      OR sp.auth_user_id = _user_id
      OR public.is_owner_of_property(_user_id, ci.property_id)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_upload_intervention_photo(_user_id uuid, _intervention_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cleaning_interventions ci
    LEFT JOIN service_providers sp ON sp.id = ci.service_provider_id
    WHERE ci.id = _intervention_id
    AND (ci.concierge_user_id = _user_id OR sp.auth_user_id = _user_id)
  );
$$;

-- ========================================
-- Cleaning Photos table
-- ========================================
CREATE TABLE public.cleaning_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES public.cleaning_interventions(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'after_cleaning',
  caption text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cleaning_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_select" ON public.cleaning_photos
  FOR SELECT TO authenticated
  USING (public.can_access_intervention(auth.uid(), intervention_id));

CREATE POLICY "cp_insert" ON public.cleaning_photos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_upload_intervention_photo(auth.uid(), intervention_id));

CREATE POLICY "cp_delete" ON public.cleaning_photos
  FOR DELETE TO authenticated
  USING (public.can_upload_intervention_photo(auth.uid(), intervention_id));

-- ========================================
-- Storage bucket for cleaning photos
-- ========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaning-photos', 'cleaning-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "cleaning_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cleaning-photos');

CREATE POLICY "cleaning_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cleaning-photos');

CREATE POLICY "cleaning_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cleaning-photos');

-- ========================================
-- Triggers for updated_at
-- ========================================
CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cleaning_interventions_updated_at
  BEFORE UPDATE ON public.cleaning_interventions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();