DROP POLICY IF EXISTS owners_concierge_and_owner_access ON public.owners;
CREATE POLICY owners_concierge_all
ON public.owners
FOR ALL
TO authenticated
USING (concierge_user_id = auth.uid())
WITH CHECK (concierge_user_id = auth.uid());

CREATE POLICY owners_self_read
ON public.owners
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid() AND status = 'active');

CREATE POLICY owners_self_update_profile
ON public.owners
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid() AND status = 'active')
WITH CHECK (auth_user_id = auth.uid() AND status = 'active');

DROP POLICY IF EXISTS service_providers_concierge_and_provider_access ON public.service_providers;
CREATE POLICY service_providers_concierge_all
ON public.service_providers
FOR ALL
TO authenticated
USING (concierge_user_id = auth.uid())
WITH CHECK (concierge_user_id = auth.uid());

CREATE POLICY service_providers_self_read
ON public.service_providers
FOR SELECT
TO authenticated
USING (provider_user_id = auth.uid() AND status = 'active');

DROP POLICY IF EXISTS owner_properties_concierge_and_owner_access ON public.owner_properties;
CREATE POLICY owner_properties_concierge_all
ON public.owner_properties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.owners o
    WHERE o.id = owner_properties.owner_id
      AND o.concierge_user_id = auth.uid()
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

CREATE POLICY owner_properties_owner_read
ON public.owner_properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.owners o
    WHERE o.id = owner_properties.owner_id
      AND o.auth_user_id = auth.uid()
      AND o.status = 'active'
  )
);