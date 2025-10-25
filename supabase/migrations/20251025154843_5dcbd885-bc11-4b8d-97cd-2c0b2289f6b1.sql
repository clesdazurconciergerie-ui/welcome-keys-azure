-- Create storage bucket for booklet assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('booklet-assets', 'booklet-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own booklet assets
CREATE POLICY "Users can upload booklet assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booklet-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own booklet assets
CREATE POLICY "Users can update their booklet assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'booklet-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own booklet assets
CREATE POLICY "Users can delete their booklet assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'booklet-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to booklet assets
CREATE POLICY "Public can view booklet assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booklet-assets');