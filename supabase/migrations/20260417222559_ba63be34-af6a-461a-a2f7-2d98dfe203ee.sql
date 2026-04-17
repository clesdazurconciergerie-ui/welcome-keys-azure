ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS nodalview_gallery_url TEXT,
  ADD COLUMN IF NOT EXISTS nodalview_tour_url TEXT;

COMMENT ON COLUMN properties.nodalview_gallery_url IS 'Smart Link Nodalview — galerie photos HDR';
COMMENT ON COLUMN properties.nodalview_tour_url IS 'Smart Link Nodalview — visite virtuelle 360°';