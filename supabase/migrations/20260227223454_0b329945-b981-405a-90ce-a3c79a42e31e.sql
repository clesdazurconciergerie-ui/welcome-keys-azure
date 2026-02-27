
-- Allow owners to SELECT properties linked via owner_properties
CREATE POLICY "properties_owner_select"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.owner_properties op
    JOIN public.owners o ON o.id = op.owner_id
    WHERE op.property_id = properties.id
      AND o.auth_user_id = auth.uid()
      AND o.status = 'active'
  )
);

-- Allow owners to SELECT booklets for their linked properties
CREATE POLICY "booklets_owner_select"
ON public.booklets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.owner_properties op
    JOIN public.owners o ON o.id = op.owner_id
    WHERE op.property_id = booklets.property_id
      AND o.auth_user_id = auth.uid()
      AND o.status = 'active'
  )
);
