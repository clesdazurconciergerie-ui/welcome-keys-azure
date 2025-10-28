-- Add gallery fields to booklets table
ALTER TABLE public.booklets 
ADD COLUMN gallery_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN gallery_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add index for better performance when querying galleries
CREATE INDEX idx_booklets_gallery ON public.booklets(id) WHERE gallery_enabled = true AND jsonb_array_length(gallery_items) > 0;

-- Add comments to explain the purpose
COMMENT ON COLUMN public.booklets.gallery_enabled IS 'Indicates if the photo gallery should be displayed in the public booklet view';
COMMENT ON COLUMN public.booklets.gallery_items IS 'Array of gallery items with structure: {id, url, alt, caption, order, width, height}';