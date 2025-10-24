-- Security fix: Move owner contact information to separate secure table
-- Only authenticated owners can manage their contact details
-- Public access to booklets will never expose owner personal contact info

-- Create dedicated booklet_contacts table
CREATE TABLE IF NOT EXISTS public.booklet_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id UUID NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS booklet_contacts_booklet_idx ON public.booklet_contacts(booklet_id);

-- Ensure one contact record per booklet
CREATE UNIQUE INDEX IF NOT EXISTS booklet_contacts_booklet_unique_idx ON public.booklet_contacts(booklet_id);

-- Enable RLS
ALTER TABLE public.booklet_contacts ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT policy
CREATE POLICY "Users can view contact info for their booklets"
ON public.booklet_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = booklet_contacts.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Owner-only INSERT policy
CREATE POLICY "Users can insert contact info for their booklets"
ON public.booklet_contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = booklet_contacts.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Owner-only UPDATE policy
CREATE POLICY "Users can update contact info for their booklets"
ON public.booklet_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = booklet_contacts.booklet_id
      AND booklets.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = booklet_contacts.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Owner-only DELETE policy
CREATE POLICY "Users can delete contact info for their booklets"
ON public.booklet_contacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = booklet_contacts.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Migrate existing contact data from booklets table
INSERT INTO public.booklet_contacts (booklet_id, contact_email, contact_phone)
SELECT id, contact_email, contact_phone
FROM public.booklets
WHERE contact_email IS NOT NULL OR contact_phone IS NOT NULL
ON CONFLICT (booklet_id) DO NOTHING;

-- Drop the old columns from booklets (data is now in booklet_contacts)
ALTER TABLE public.booklets DROP COLUMN IF EXISTS contact_email;
ALTER TABLE public.booklets DROP COLUMN IF EXISTS contact_phone;

-- Remove the public read policy on booklets (it exposed too much data)
DROP POLICY IF EXISTS "Public can view published booklets" ON public.booklets;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_booklet_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_booklet_contacts_updated_at
BEFORE UPDATE ON public.booklet_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_booklet_contacts_updated_at();