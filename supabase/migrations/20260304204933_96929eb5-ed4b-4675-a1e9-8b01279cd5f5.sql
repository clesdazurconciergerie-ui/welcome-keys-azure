
-- Allow property owners to read overrides for their properties
CREATE POLICY "co_owner_select" ON public.calendar_overrides AS RESTRICTIVE FOR SELECT TO authenticated
  USING (is_owner_of_property(auth.uid(), property_id));
