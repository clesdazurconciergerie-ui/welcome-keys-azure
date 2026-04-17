-- Cleanup ancienne feature Welkom Visuals
ALTER TABLE public.properties
  DROP COLUMN IF EXISTS nodalview_gallery_url,
  DROP COLUMN IF EXISTS nodalview_tour_url;

-- Étendre property_photos pour Welkom Studio
ALTER TABLE public.property_photos
  ADD COLUMN IF NOT EXISTS full_url TEXT,
  ADD COLUMN IF NOT EXISTS thumb_url TEXT,
  ADD COLUMN IF NOT EXISTS original_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_hdr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS filters_applied JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Migrer data existante : copier `url` -> `full_url` et `order_index` -> `display_order` si vides
UPDATE public.property_photos
SET full_url = url
WHERE full_url IS NULL AND url IS NOT NULL;

UPDATE public.property_photos
SET display_order = COALESCE(order_index, 0)
WHERE display_order = 0 AND order_index IS NOT NULL AND order_index <> 0;

-- Rendre full_url obligatoire maintenant
ALTER TABLE public.property_photos
  ALTER COLUMN full_url SET NOT NULL;

-- RLS (idempotent)
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pp_block_anon" ON public.property_photos;
CREATE POLICY "pp_block_anon" ON public.property_photos
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pp_owner_all" ON public.property_photos;
CREATE POLICY "pp_owner_all" ON public.property_photos
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pp_property_owner_select" ON public.property_photos;
CREATE POLICY "pp_property_owner_select" ON public.property_photos
  FOR SELECT TO authenticated
  USING (public.is_owner_of_property(auth.uid(), property_id));

CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON public.property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_user_id ON public.property_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_order ON public.property_photos(property_id, display_order);

DROP TRIGGER IF EXISTS set_property_photos_updated_at ON public.property_photos;
CREATE TRIGGER set_property_photos_updated_at
  BEFORE UPDATE ON public.property_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();