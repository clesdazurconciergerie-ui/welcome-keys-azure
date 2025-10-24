-- Create storage bucket for booklet images
INSERT INTO storage.buckets (id, name, public)
VALUES ('booklet-images', 'booklet-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for booklet images
CREATE POLICY "Authenticated users can upload booklet images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booklet-images');

CREATE POLICY "Authenticated users can update their booklet images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'booklet-images');

CREATE POLICY "Authenticated users can delete their booklet images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'booklet-images');

CREATE POLICY "Public can view booklet images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booklet-images');