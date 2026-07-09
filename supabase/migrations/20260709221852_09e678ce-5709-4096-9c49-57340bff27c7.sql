ALTER TABLE public.saved_places
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE public.booklets DROP COLUMN IF EXISTS emergency_contacts;
ALTER TABLE public.booklets ADD COLUMN emergency_contacts text;