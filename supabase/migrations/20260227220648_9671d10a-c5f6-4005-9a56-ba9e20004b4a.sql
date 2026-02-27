
-- Property documents table (mandats, assurances, diagnostics, contrats)
CREATE TABLE public.property_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_documents_block_anon" ON public.property_documents AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "property_documents_owner_manage" ON public.property_documents AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Property photos table (separate from JSONB for better management)
CREATE TABLE public.property_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  category TEXT DEFAULT 'general',
  order_index INTEGER DEFAULT 0,
  is_main BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_photos_block_anon" ON public.property_photos AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "property_photos_owner_manage" ON public.property_photos AS RESTRICTIVE FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Storage bucket for property files
INSERT INTO storage.buckets (id, name, public) VALUES ('property-files', 'property-files', true);

CREATE POLICY "property_files_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "property_files_select" ON storage.objects FOR SELECT USING (bucket_id = 'property-files');
CREATE POLICY "property_files_delete" ON storage.objects FOR DELETE USING (bucket_id = 'property-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "property_files_update" ON storage.objects FOR UPDATE USING (bucket_id = 'property-files' AND auth.uid() IS NOT NULL);
