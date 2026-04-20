-- ═══════════════════════════════════════════════════════════════════
-- MODULE 1 — Cron pour send-guest-messages (toutes les 5 min)
-- ═══════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-guest-messages') THEN
    PERFORM cron.unschedule('dispatch-guest-messages');
  END IF;
END $$;

SELECT cron.schedule(
  'dispatch-guest-messages',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/send-guest-messages',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eG56amt5emtwb3ltZXlwbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjgzODEsImV4cCI6MjA3NjkwNDM4MX0.TuYdc9Qqia-25i0XrFJWR4zyOmAMqcqtAjJ0jwO0nAQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- ═══════════════════════════════════════════════════════════════════
-- MODULE 2 — Double-booking Detector
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.booking_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_a_id UUID NOT NULL,
  event_b_id UUID NOT NULL,
  conflict_type TEXT NOT NULL DEFAULT 'overlap',
  overlap_start DATE NOT NULL,
  overlap_end DATE NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_a_id, event_b_id)
);

ALTER TABLE public.booking_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conflicts" ON public.booking_conflicts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own conflicts" ON public.booking_conflicts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages conflicts" ON public.booking_conflicts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Block anonymous conflicts" ON public.booking_conflicts
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE INDEX IF NOT EXISTS idx_conflicts_user_status ON public.booking_conflicts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_conflicts_property ON public.booking_conflicts(property_id);

-- Function to detect overlaps for a property
CREATE OR REPLACE FUNCTION public.detect_booking_conflicts(_property_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
  inserted INT := 0;
  prop_user_id UUID;
BEGIN
  SELECT user_id INTO prop_user_id FROM properties WHERE id = _property_id;
  IF prop_user_id IS NULL THEN RETURN 0; END IF;

  FOR rec IN
    SELECT a.id AS a_id, b.id AS b_id,
           GREATEST(a.start_date, b.start_date) AS ov_start,
           LEAST(a.end_date, b.end_date) AS ov_end
    FROM calendar_events a
    JOIN calendar_events b
      ON a.property_id = b.property_id
     AND a.id < b.id
     AND a.start_date < b.end_date
     AND b.start_date < a.end_date
     AND COALESCE(a.event_type, 'reservation') != 'blocked'
     AND COALESCE(b.event_type, 'reservation') != 'blocked'
    WHERE a.property_id = _property_id
      AND a.status != 'cancelled'
      AND b.status != 'cancelled'
  LOOP
    INSERT INTO booking_conflicts (
      user_id, property_id, event_a_id, event_b_id,
      overlap_start, overlap_end, severity, status
    ) VALUES (
      prop_user_id, _property_id, rec.a_id, rec.b_id,
      rec.ov_start, rec.ov_end, 'high', 'open'
    )
    ON CONFLICT (event_a_id, event_b_id) DO UPDATE
      SET overlap_start = EXCLUDED.overlap_start,
          overlap_end = EXCLUDED.overlap_end,
          status = CASE WHEN booking_conflicts.status = 'resolved' THEN 'resolved' ELSE 'open' END;
    inserted := inserted + 1;
  END LOOP;

  -- Auto-close conflicts whose events no longer overlap
  UPDATE booking_conflicts bc
  SET status = 'resolved', resolved_at = now()
  WHERE bc.property_id = _property_id
    AND bc.status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM calendar_events a, calendar_events b
      WHERE a.id = bc.event_a_id AND b.id = bc.event_b_id
        AND a.start_date < b.end_date AND b.start_date < a.end_date
        AND a.status != 'cancelled' AND b.status != 'cancelled'
    );

  RETURN inserted;
END $$;

-- Trigger: re-detect on any calendar_events change
CREATE OR REPLACE FUNCTION public.trigger_detect_conflicts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM detect_booking_conflicts(COALESCE(NEW.property_id, OLD.property_id));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS detect_conflicts_on_events ON public.calendar_events;
CREATE TRIGGER detect_conflicts_on_events
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.trigger_detect_conflicts();

-- ═══════════════════════════════════════════════════════════════════
-- MODULE 3 — Dynamic Pricing Engine
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'seasonal',
  date_start DATE,
  date_end DATE,
  day_of_week INT[],
  min_nights INT,
  base_price NUMERIC(10,2),
  adjustment_type TEXT NOT NULL DEFAULT 'percent',
  adjustment_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  for_date DATE NOT NULL,
  current_price NUMERIC(10,2),
  suggested_price NUMERIC(10,2) NOT NULL,
  reasoning TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.7,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, for_date)
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pricing rules" ON public.pricing_rules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Block anon pricing rules" ON public.pricing_rules
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Users manage own suggestions" ON public.pricing_suggestions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role suggestions" ON public.pricing_suggestions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Block anon suggestions" ON public.pricing_suggestions
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_user ON public.pricing_rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_suggestions_property_date ON public.pricing_suggestions(property_id, for_date);

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- MODULE 4 — Smart Keys (Igloohome / Nuki)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.smart_lock_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  account_label TEXT,
  credentials_secret_id TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.smart_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.smart_lock_providers(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT,
  battery_level INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, external_id)
);

CREATE TABLE IF NOT EXISTS public.smart_lock_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lock_id UUID NOT NULL REFERENCES public.smart_locks(id) ON DELETE CASCADE,
  booking_id UUID,
  guest_name TEXT,
  pin_code TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  external_code_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.smart_lock_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_lock_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own lock providers" ON public.smart_lock_providers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Block anon lock providers" ON public.smart_lock_providers
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Users manage own locks" ON public.smart_locks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Block anon locks" ON public.smart_locks
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Users manage own codes" ON public.smart_lock_codes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role codes" ON public.smart_lock_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Block anon codes" ON public.smart_lock_codes
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE INDEX IF NOT EXISTS idx_smart_locks_property ON public.smart_locks(property_id);
CREATE INDEX IF NOT EXISTS idx_smart_codes_booking ON public.smart_lock_codes(booking_id);
CREATE INDEX IF NOT EXISTS idx_smart_codes_status ON public.smart_lock_codes(user_id, status);

CREATE TRIGGER update_smart_lock_providers_updated_at
  BEFORE UPDATE ON public.smart_lock_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_smart_locks_updated_at
  BEFORE UPDATE ON public.smart_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
