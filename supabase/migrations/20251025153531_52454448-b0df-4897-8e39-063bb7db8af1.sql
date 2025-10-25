-- Add branding fields to booklets table
ALTER TABLE public.booklets
ADD COLUMN IF NOT EXISTS concierge_name TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#18c0df',
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#1a1a1a';

-- Add photos field to equipment table (JSONB array of photo objects)
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Add comment to clarify photos structure
COMMENT ON COLUMN public.equipment.photos IS 'Array of photo objects: [{"url": "https://...", "alt": "description"}]';