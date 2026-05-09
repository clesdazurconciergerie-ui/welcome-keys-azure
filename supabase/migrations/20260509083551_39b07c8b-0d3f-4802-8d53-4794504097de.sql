
-- ============ TABLE: property_inspections ============
CREATE TABLE IF NOT EXISTS public.property_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id uuid,
  
  -- DOUBLE DATATION
  official_date date NOT NULL,
  actual_created_at timestamptz NOT NULL DEFAULT now(),
  
  inspection_type text NOT NULL DEFAULT 'entry',
  status text NOT NULL DEFAULT 'draft',
  
  inspector_name text,
  inspector_role text,
  guest_name text,
  guest_signature_url text,
  concierge_signature_url text,
  
  notes text,
  global_condition text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  version integer NOT NULL DEFAULT 1,
  parent_inspection_id uuid REFERENCES public.property_inspections(id) ON DELETE SET NULL,
  
  created_by uuid,
  updated_by uuid,
  validated_by uuid,
  validated_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_user ON public.property_inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_pi_property ON public.property_inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_pi_official_date ON public.property_inspections(official_date DESC);

ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_pi" ON public.property_inspections
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_pi" ON public.property_inspections
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_pi" ON public.property_inspections
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_pi" ON public.property_inspections
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ TABLE: inspection_items ============
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  room_name text NOT NULL,
  item_name text NOT NULL,
  category text,
  condition text NOT NULL DEFAULT 'good',
  notes text,
  quantity integer DEFAULT 1,
  photos jsonb DEFAULT '[]'::jsonb,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ii_inspection ON public.inspection_items(inspection_id);
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_items" ON public.inspection_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_items" ON public.inspection_items
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_items" ON public.inspection_items
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_items" ON public.inspection_items
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ TABLE: inspection_photos ============
CREATE TABLE IF NOT EXISTS public.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  inspection_item_id uuid REFERENCES public.inspection_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  
  -- DOUBLE DATATION
  official_date date NOT NULL,
  actual_uploaded_at timestamptz NOT NULL DEFAULT now(),
  
  storage_path text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  width integer,
  height integer,
  caption text,
  room_name text,
  exif_metadata jsonb DEFAULT '{}'::jsonb,
  display_order integer DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_inspection ON public.inspection_photos(inspection_id);
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_photos" ON public.inspection_photos
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_photos" ON public.inspection_photos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_photos" ON public.inspection_photos
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_photos" ON public.inspection_photos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ TABLE: inspection_audit_log ============
CREATE TABLE IF NOT EXISTS public.inspection_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ial_inspection ON public.inspection_audit_log(inspection_id, created_at DESC);
ALTER TABLE public.inspection_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_audit" ON public.inspection_audit_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_audit" ON public.inspection_audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ TRIGGERS ============

-- Trigger 1: photos inherit official_date from parent inspection
CREATE OR REPLACE FUNCTION public.inspection_photo_inherit_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_date date;
BEGIN
  IF NEW.official_date IS NULL THEN
    SELECT official_date INTO parent_date
    FROM public.property_inspections
    WHERE id = NEW.inspection_id;
    NEW.official_date := COALESCE(parent_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inspection_photo_inherit_date ON public.inspection_photos;
CREATE TRIGGER trg_inspection_photo_inherit_date
  BEFORE INSERT ON public.inspection_photos
  FOR EACH ROW EXECUTE FUNCTION public.inspection_photo_inherit_date();

-- Trigger 2: log official_date changes
CREATE OR REPLACE FUNCTION public.log_inspection_date_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.official_date IS DISTINCT FROM NEW.official_date THEN
    INSERT INTO public.inspection_audit_log (
      inspection_id, user_id, action, field_changed,
      old_value, new_value, changed_by
    ) VALUES (
      NEW.id, NEW.user_id, 'date_changed', 'official_date',
      OLD.official_date::text, NEW.official_date::text, auth.uid()
    );
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.inspection_audit_log (
      inspection_id, user_id, action, field_changed,
      old_value, new_value, changed_by
    ) VALUES (
      NEW.id, NEW.user_id, 'status_changed', 'status',
      OLD.status, NEW.status, auth.uid()
    );
  END IF;
  -- Auto-fill validated_at when status -> validated
  IF NEW.status = 'validated' AND OLD.status IS DISTINCT FROM 'validated' THEN
    NEW.validated_at := now();
    NEW.validated_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inspection_change ON public.property_inspections;
CREATE TRIGGER trg_log_inspection_change
  BEFORE UPDATE ON public.property_inspections
  FOR EACH ROW EXECUTE FUNCTION public.log_inspection_date_change();

-- Trigger 3: log creation
CREATE OR REPLACE FUNCTION public.log_inspection_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inspection_audit_log (
    inspection_id, user_id, action, changed_by, new_value
  ) VALUES (
    NEW.id, NEW.user_id, 'created', auth.uid(),
    'official_date=' || NEW.official_date::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inspection_created ON public.property_inspections;
CREATE TRIGGER trg_log_inspection_created
  AFTER INSERT ON public.property_inspections
  FOR EACH ROW EXECUTE FUNCTION public.log_inspection_created();

-- updated_at on items
DROP TRIGGER IF EXISTS trg_inspection_items_uat ON public.inspection_items;
CREATE TRIGGER trg_inspection_items_uat
  BEFORE UPDATE ON public.inspection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users_select_own_inspection_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_insert_own_inspection_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_update_own_inspection_photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_delete_own_inspection_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
