
-- Allow service providers to view property photos for properties they have missions on
CREATE POLICY "property_photos_provider_select" ON public.property_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM missions m
      WHERE m.property_id = property_photos.property_id
        AND m.selected_provider_id = public.get_service_provider_id(auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM missions m
      JOIN mission_applications ma ON ma.mission_id = m.id
      WHERE m.property_id = property_photos.property_id
        AND ma.provider_id = public.get_service_provider_id(auth.uid())
    )
  );
