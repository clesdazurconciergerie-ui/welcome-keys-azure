
-- Create mission_photos table
CREATE TABLE public.mission_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'after',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mission_photos ENABLE ROW LEVEL SECURITY;

-- Provider can INSERT their own photos for missions they're assigned to
CREATE POLICY "mp_provider_insert" ON public.mission_photos
FOR INSERT TO authenticated
WITH CHECK (
  provider_id = get_service_provider_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.missions
    WHERE missions.id = mission_photos.mission_id
      AND missions.selected_provider_id = mission_photos.provider_id
  )
);

-- Provider can SELECT photos for missions they're assigned to
CREATE POLICY "mp_provider_select" ON public.mission_photos
FOR SELECT TO authenticated
USING (
  provider_id = get_service_provider_id(auth.uid())
);

-- Concierge can SELECT all photos for their missions
CREATE POLICY "mp_concierge_select" ON public.mission_photos
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
);

-- Concierge can DELETE photos for their missions
CREATE POLICY "mp_concierge_delete" ON public.mission_photos
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
);

-- Provider can DELETE their own photos
CREATE POLICY "mp_provider_delete" ON public.mission_photos
FOR DELETE TO authenticated
USING (
  provider_id = get_service_provider_id(auth.uid())
);

-- Create storage bucket for mission photos
INSERT INTO storage.buckets (id, name, public) VALUES ('mission-photos', 'mission-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage: provider can upload under their scoped path
CREATE POLICY "mission_photos_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mission-photos'
);

-- Storage: anyone can read mission photos (public bucket)
CREATE POLICY "mission_photos_read" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'mission-photos'
);

-- Storage: provider can delete their own uploads
CREATE POLICY "mission_photos_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'mission-photos'
);

-- Add index for fast lookups
CREATE INDEX idx_mission_photos_mission_id ON public.mission_photos(mission_id);
CREATE INDEX idx_mission_photos_provider_id ON public.mission_photos(provider_id);
