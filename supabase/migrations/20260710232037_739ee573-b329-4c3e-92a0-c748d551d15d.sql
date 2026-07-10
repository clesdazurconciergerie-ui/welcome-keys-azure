
CREATE POLICY "airbnb_screenshots_read_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'airbnb-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "airbnb_screenshots_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'airbnb-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "airbnb_screenshots_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'airbnb-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "airbnb_screenshots_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'airbnb-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
