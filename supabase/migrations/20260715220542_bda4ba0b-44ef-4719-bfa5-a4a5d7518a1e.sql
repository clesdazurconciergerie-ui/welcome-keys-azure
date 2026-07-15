ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_provider';

DROP POLICY IF EXISTS owners_own ON public.owners;
CREATE POLICY owners_concierge_and_owner_access
ON public.owners
FOR ALL
TO authenticated
USING ((concierge_user_id = auth.uid()) OR (auth_user_id = auth.uid()))
WITH CHECK (concierge_user_id = auth.uid());

DROP POLICY IF EXISTS service_providers_concierge_all ON public.service_providers;
CREATE POLICY service_providers_concierge_and_provider_access
ON public.service_providers
FOR ALL
TO authenticated
USING ((concierge_user_id = auth.uid()) OR (provider_user_id = auth.uid()))
WITH CHECK (concierge_user_id = auth.uid());

DROP POLICY IF EXISTS owner_properties_all ON public.owner_properties;
CREATE POLICY owner_properties_concierge_and_owner_access
ON public.owner_properties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.owners o
    WHERE o.id = owner_properties.owner_id
      AND (o.concierge_user_id = auth.uid() OR o.auth_user_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.owners o
    WHERE o.id = owner_properties.owner_id
      AND o.concierge_user_id = auth.uid()
  )
);