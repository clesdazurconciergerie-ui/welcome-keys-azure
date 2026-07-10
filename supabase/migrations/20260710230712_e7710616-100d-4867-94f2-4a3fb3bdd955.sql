
-- Storage RLS: allow authenticated users to CRUD in the app's buckets
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['property-files','booklet-images','mission-photos','inspection-photos','branding','owner-documents']
  LOOP
    EXECUTE format($f$DROP POLICY IF EXISTS "read %1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "write %1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "update %1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "delete %1$s" ON storage.objects$f$, b);
    EXECUTE format($f$CREATE POLICY "read %1$s" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %2$L)$f$, b, b);
    EXECUTE format($f$CREATE POLICY "write %1$s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %2$L)$f$, b, b);
    EXECUTE format($f$CREATE POLICY "update %1$s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %2$L)$f$, b, b);
    EXECUTE format($f$CREATE POLICY "delete %1$s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %2$L)$f$, b, b);
  END LOOP;
END $$;

-- Align service_providers with the code
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'cleaning',
  ADD COLUMN IF NOT EXISTS score_global NUMERIC DEFAULT 0;

UPDATE public.service_providers
SET first_name = COALESCE(NULLIF(first_name,''), split_part(full_name, ' ', 1)),
    last_name  = COALESCE(NULLIF(last_name,''), NULLIF(trim(substring(full_name from position(' ' in full_name) + 1)), ''))
WHERE full_name IS NOT NULL;
