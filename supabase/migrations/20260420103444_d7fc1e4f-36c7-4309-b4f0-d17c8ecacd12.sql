-- 1. Properties: URLs des annonces publiques
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_url_airbnb TEXT,
  ADD COLUMN IF NOT EXISTS listing_url_booking TEXT;

-- 2. Bookings: taxe de séjour
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tourist_tax_amount NUMERIC(10,2) DEFAULT 0;

-- 3. Financial settings: cycle de versement propriétaire
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS payout_day_of_month INTEGER DEFAULT 5 CHECK (payout_day_of_month BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS payout_delay_days INTEGER DEFAULT 0 CHECK (payout_delay_days >= 0);

-- 4. Table listing_analyses
CREATE TABLE IF NOT EXISTS public.listing_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('airbnb', 'booking', 'manual')),
  source_url TEXT,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  scraped_data JSONB,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  rewrite_suggestions JSONB,
  pricing_recommendation JSONB,
  raw_ai_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_analyses_property ON public.listing_analyses(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_analyses_user ON public.listing_analyses(user_id, created_at DESC);

ALTER TABLE public.listing_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own listing analyses"
  ON public.listing_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own listing analyses"
  ON public.listing_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listing analyses"
  ON public.listing_analyses FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view analyses of their properties"
  ON public.listing_analyses FOR SELECT
  USING (public.is_owner_of_property(auth.uid(), property_id));

-- 5. Backfill: créer bookings vides depuis calendar_events existants
CREATE OR REPLACE FUNCTION public.backfill_bookings_from_calendar_events(_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  ev RECORD;
BEGIN
  FOR ev IN
    SELECT ce.*, p.user_id AS property_user_id
    FROM calendar_events ce
    JOIN properties p ON p.id = ce.property_id
    WHERE ce.status != 'cancelled'
      AND COALESCE(ce.event_type, 'reservation') != 'blocked'
      AND (_user_id IS NULL OR p.user_id = _user_id)
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.calendar_event_id = ce.id
      )
  LOOP
    INSERT INTO bookings (
      property_id, user_id, check_in, check_out,
      source, source_platform, is_manual,
      guest_name, calendar_event_id,
      gross_amount, financial_status, price_status
    ) VALUES (
      ev.property_id, ev.property_user_id,
      ev.start_date, ev.end_date,
      'ical', COALESCE(ev.platform, ev.source_platform), false,
      ev.guest_name, ev.id,
      NULL, 'pending', 'pending'
    )
    ON CONFLICT DO NOTHING;
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$;

-- 6. Trigger auto-création booking vide à chaque nouvel iCal event
CREATE OR REPLACE FUNCTION public.auto_create_empty_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop_user_id UUID;
BEGIN
  IF NEW.status = 'cancelled' OR COALESCE(NEW.event_type, 'reservation') = 'blocked' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM bookings WHERE calendar_event_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO prop_user_id FROM properties WHERE id = NEW.property_id;
  IF prop_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO bookings (
    property_id, user_id, check_in, check_out,
    source, source_platform, is_manual,
    guest_name, calendar_event_id,
    gross_amount, financial_status, price_status
  ) VALUES (
    NEW.property_id, prop_user_id,
    NEW.start_date, NEW.end_date,
    'ical', COALESCE(NEW.platform, NEW.source_platform), false,
    NEW.guest_name, NEW.id,
    NULL, 'pending', 'pending'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_empty_booking ON public.calendar_events;
CREATE TRIGGER trg_auto_create_empty_booking
  AFTER INSERT ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_empty_booking();