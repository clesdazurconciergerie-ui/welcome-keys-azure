-- Allow owners (via is_owner_of_property) to SELECT inspections, items, photos, audit for their properties
CREATE POLICY "owners_select_property_inspections"
ON public.property_inspections FOR SELECT
USING (public.is_owner_of_property(auth.uid(), property_id));

CREATE POLICY "owners_select_inspection_items"
ON public.inspection_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.property_inspections pi
    WHERE pi.id = inspection_items.inspection_id
      AND public.is_owner_of_property(auth.uid(), pi.property_id)
  )
);

CREATE POLICY "owners_select_inspection_photos"
ON public.inspection_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.property_inspections pi
    WHERE pi.id = inspection_photos.inspection_id
      AND public.is_owner_of_property(auth.uid(), pi.property_id)
  )
);

CREATE POLICY "owners_select_inspection_audit"
ON public.inspection_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.property_inspections pi
    WHERE pi.id = inspection_audit_log.inspection_id
      AND public.is_owner_of_property(auth.uid(), pi.property_id)
  )
);

-- Allow owners to read photos in storage bucket via signed URLs (read access)
CREATE POLICY "owners_read_inspection_photos_storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspection-photos'
  AND EXISTS (
    SELECT 1 FROM public.property_inspections pi
    WHERE pi.user_id::text = (storage.foldername(name))[1]
      AND public.is_owner_of_property(auth.uid(), pi.property_id)
  )
);