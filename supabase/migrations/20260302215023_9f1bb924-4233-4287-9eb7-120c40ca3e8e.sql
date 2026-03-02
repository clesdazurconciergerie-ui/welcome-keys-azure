
-- Drop all existing RESTRICTIVE policies on mission_applications
DROP POLICY IF EXISTS "applications_concierge_select" ON public.mission_applications;
DROP POLICY IF EXISTS "applications_concierge_update" ON public.mission_applications;
DROP POLICY IF EXISTS "applications_provider_insert" ON public.mission_applications;
DROP POLICY IF EXISTS "applications_provider_select" ON public.mission_applications;

-- Recreate as PERMISSIVE policies
CREATE POLICY "applications_concierge_select" ON public.mission_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_applications.mission_id AND missions.user_id = auth.uid())
  );

CREATE POLICY "applications_concierge_update" ON public.mission_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_applications.mission_id AND missions.user_id = auth.uid())
  );

CREATE POLICY "applications_concierge_delete" ON public.mission_applications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_applications.mission_id AND missions.user_id = auth.uid())
  );

CREATE POLICY "applications_provider_insert" ON public.mission_applications
  FOR INSERT WITH CHECK (provider_id = get_service_provider_id(auth.uid()));

CREATE POLICY "applications_provider_select" ON public.mission_applications
  FOR SELECT USING (provider_id = get_service_provider_id(auth.uid()));
