ALTER TABLE public.property_inspections
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS concierge_signer_name text,
  ADD COLUMN IF NOT EXISTS guest_signer_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS general_notes text;

ALTER TABLE public.inspection_photos
  ADD COLUMN IF NOT EXISTS zone_key text,
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'photo';

CREATE TABLE IF NOT EXISTS public.inspection_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  zone_key text NOT NULL,
  zone_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, zone_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_zones TO authenticated;
GRANT ALL ON public.inspection_zones TO service_role;
ALTER TABLE public.inspection_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Concierge manages own inspection zones"
ON public.inspection_zones FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can view zones of their properties"
ON public.inspection_zones FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.property_inspections pi
  WHERE pi.id = inspection_zones.inspection_id
    AND public.is_owner_of_property(pi.property_id)
));

CREATE TRIGGER trg_inspection_zones_updated
BEFORE UPDATE ON public.inspection_zones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.inspection_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  zone_key text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  severity text NOT NULL DEFAULT 'minor',
  comment text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_issues TO authenticated;
GRANT ALL ON public.inspection_issues TO service_role;
ALTER TABLE public.inspection_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Concierge manages own inspection issues"
ON public.inspection_issues FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can view issues of their properties"
ON public.inspection_issues FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.property_inspections pi
  WHERE pi.id = inspection_issues.inspection_id
    AND public.is_owner_of_property(pi.property_id)
));

CREATE TRIGGER trg_inspection_issues_updated
BEFORE UPDATE ON public.inspection_issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_inspection_zones_inspection ON public.inspection_zones(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_issues_inspection ON public.inspection_issues(inspection_id);