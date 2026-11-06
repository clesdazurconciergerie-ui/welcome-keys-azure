-- Keep the mission RLS helpers aligned with the deployed service_providers schema.
-- The current identity column is provider_user_id (auth_user_id is legacy).

CREATE OR REPLACE FUNCTION public.get_service_provider_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.service_providers
  WHERE provider_user_id = _user_id
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_concierge_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT concierge_user_id
  FROM public.service_providers
  WHERE provider_user_id = _user_id
    AND status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_service_provider_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_concierge_id(uuid) TO authenticated;

-- Providers can read open missions belonging to their concierge and missions
-- directly assigned to them. They can only update their assigned missions.
DROP POLICY IF EXISTS "missions_provider_select" ON public.missions;
CREATE POLICY "missions_provider_select"
ON public.missions
FOR SELECT
TO authenticated
USING (
  (status = 'open' AND user_id = public.get_provider_concierge_id(auth.uid()))
  OR selected_provider_id = public.get_service_provider_id(auth.uid())
);

DROP POLICY IF EXISTS "missions_provider_update" ON public.missions;
CREATE POLICY "missions_provider_update"
ON public.missions
FOR UPDATE
TO authenticated
USING (selected_provider_id = public.get_service_provider_id(auth.uid()))
WITH CHECK (selected_provider_id = public.get_service_provider_id(auth.uid()));
