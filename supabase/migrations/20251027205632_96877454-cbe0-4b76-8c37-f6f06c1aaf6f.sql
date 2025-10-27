-- Add image_url and website_url columns to nearby_places table
ALTER TABLE public.nearby_places 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS website_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.nearby_places.image_url IS 'URL of the place image stored in Supabase Storage';
COMMENT ON COLUMN public.nearby_places.website_url IS 'Optional website link for the place';