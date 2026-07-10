
ALTER TABLE public.owner_properties
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS owner_properties_property_id_idx ON public.owner_properties(property_id);

ALTER TABLE public.owner_documents
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS owner_documents_property_id_idx ON public.owner_documents(property_id);
