-- Create branding bucket (public so logos can be displayed on invoices)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read from branding bucket
CREATE POLICY "branding_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

-- Allow users to INSERT their own logo (path starts with their uid)
CREATE POLICY "branding_user_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to UPDATE their own logo
CREATE POLICY "branding_user_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to DELETE their own logo
CREATE POLICY "branding_user_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'branding' AND auth.uid()::text = (storage.foldername(name))[1]);