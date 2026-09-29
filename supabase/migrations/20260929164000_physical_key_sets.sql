-- Physical key pouch registry. The former smart-lock UI is intentionally replaced,
-- while legacy smart_lock_* tables are kept to avoid destructive data loss.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.key_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booklet_id uuid REFERENCES public.booklets(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  pouch_role text NOT NULL DEFAULT 'traveler'
    CHECK (pouch_role IN ('traveler', 'cleaning', 'owner', 'emergency', 'other')),
  expected_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  label_address text,
  arrival_instructions text,
  public_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'stored'
    CHECK (status IN ('stored', 'assigned', 'lockbox', 'owner', 'cleaning', 'missing', 'incomplete')),
  current_holder_type text NOT NULL DEFAULT 'storage'
    CHECK (current_holder_type IN ('guest', 'owner', 'provider', 'team', 'lockbox', 'storage', 'other')),
  current_holder_label text,
  current_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  due_back_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, code),
  UNIQUE(public_token)
);

CREATE TABLE IF NOT EXISTS public.key_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_set_id uuid NOT NULL REFERENCES public.key_sets(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('created', 'assigned', 'transferred', 'returned', 'checked', 'reported_missing', 'contents_updated')),
  from_status text,
  to_status text,
  holder_type text,
  holder_label text,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  inspection_id uuid REFERENCES public.property_inspections(id) ON DELETE SET NULL,
  note text,
  created_by uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_sets_user_status ON public.key_sets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_key_sets_property ON public.key_sets(property_id);
CREATE INDEX IF NOT EXISTS idx_key_sets_public_token ON public.key_sets(public_token);
CREATE INDEX IF NOT EXISTS idx_key_movements_key_set ON public.key_movements(key_set_id, occurred_at DESC);

ALTER TABLE public.key_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Concierges manage their key sets"
ON public.key_sets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Active providers read their concierge key sets"
ON public.key_sets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers sp
    WHERE sp.provider_user_id = auth.uid()
      AND sp.concierge_user_id = key_sets.user_id
      AND sp.status = 'active'
  )
);

CREATE POLICY "Concierges manage their key movements"
ON public.key_movements FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Active providers read key movements"
ON public.key_movements FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers sp
    WHERE sp.provider_user_id = auth.uid()
      AND sp.concierge_user_id = key_movements.user_id
      AND sp.status = 'active'
  )
);

CREATE POLICY "Active providers record key movements"
ON public.key_movements FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.service_providers sp
    WHERE sp.provider_user_id = auth.uid()
      AND sp.concierge_user_id = key_movements.user_id
      AND sp.status = 'active'
  )
);

CREATE OR REPLACE FUNCTION public.touch_key_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_key_set_updated_at ON public.key_sets;
CREATE TRIGGER trg_touch_key_set_updated_at
BEFORE UPDATE ON public.key_sets
FOR EACH ROW EXECUTE FUNCTION public.touch_key_set_updated_at();

CREATE OR REPLACE FUNCTION public.log_key_set_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.key_movements (
    user_id, key_set_id, action, to_status, holder_type, holder_label, created_by
  ) VALUES (
    NEW.user_id, NEW.id, 'created', NEW.status, NEW.current_holder_type,
    NEW.current_holder_label, auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_key_set_created ON public.key_sets;
CREATE TRIGGER trg_log_key_set_created
AFTER INSERT ON public.key_sets
FOR EACH ROW EXECUTE FUNCTION public.log_key_set_created();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_movements TO authenticated;
GRANT ALL ON public.key_sets TO service_role;
GRANT ALL ON public.key_movements TO service_role;

COMMENT ON TABLE public.key_sets IS 'Physical key pouches linked to properties, welcome booklets and NFC tags.';
COMMENT ON COLUMN public.key_sets.public_token IS 'Opaque token stored in the NFC URL; never stores address or credentials on the tag itself.';
