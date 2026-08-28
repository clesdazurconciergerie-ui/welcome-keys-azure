CREATE POLICY "Owners can view inspection photos of their properties"
ON public.inspection_photos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.property_inspections pi
  WHERE pi.id = inspection_photos.inspection_id
    AND pi.property_id IS NOT NULL
    AND public.is_owner_of_property(pi.property_id)
));