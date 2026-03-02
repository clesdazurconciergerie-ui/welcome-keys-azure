
-- Add property_id to owner_documents for cross-reference
ALTER TABLE public.owner_documents
ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

-- Allow concierge to read owner_documents for their properties
-- (existing policies already cover concierge_user_id = auth.uid() for SELECT)
-- Add index for efficient property-based lookups
CREATE INDEX IF NOT EXISTS idx_owner_documents_property_id ON public.owner_documents(property_id);
