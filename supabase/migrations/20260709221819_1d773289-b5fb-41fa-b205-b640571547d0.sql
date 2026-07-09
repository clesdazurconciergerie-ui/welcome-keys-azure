ALTER TABLE public.booklets
  ADD COLUMN IF NOT EXISTS property_name text,
  ADD COLUMN IF NOT EXISTS property_address text,
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS check_in_time text,
  ADD COLUMN IF NOT EXISTS check_out_time text,
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS house_rules text,
  ADD COLUMN IF NOT EXISTS unique_views_count integer DEFAULT 0;

ALTER TABLE public.property_photos
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

DROP FUNCTION IF EXISTS public.claim_mission(uuid);
CREATE OR REPLACE FUNCTION public.claim_mission(_mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object('success', true, 'mission_id', _mission_id);
END; $$;