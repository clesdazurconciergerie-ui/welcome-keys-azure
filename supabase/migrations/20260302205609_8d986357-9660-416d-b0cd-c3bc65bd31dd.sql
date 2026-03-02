
-- Add cleaning automation settings to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS cleaning_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cleaning_payout_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleaning_default_start_time text DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS cleaning_duration_minutes integer DEFAULT 120,
  ADD COLUMN IF NOT EXISTS cleaning_lead_time_hours integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleaning_open_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cleaning_instructions_template text DEFAULT null;

-- Add source tracking to missions for idempotency
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT null,
  ADD COLUMN IF NOT EXISTS source_id text DEFAULT null;

-- Unique constraint to prevent duplicate missions from same source
CREATE UNIQUE INDEX IF NOT EXISTS missions_source_unique
  ON public.missions (user_id, source_type, source_id, mission_type)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- Function to auto-create cleaning missions from bookings
CREATE OR REPLACE FUNCTION public.auto_create_cleaning_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop RECORD;
  mission_start timestamptz;
  mission_end timestamptz;
  mission_title text;
  mission_instructions text;
  existing_id uuid;
BEGIN
  -- Only process bookings (not blocked slots)
  -- calendar_event_id links to calendar_events which have event_type
  -- But bookings themselves represent real bookings, so we process all non-canceled

  -- Skip if financial_status indicates cancellation (we use price_status as proxy)
  IF NEW.price_status = 'canceled' THEN
    -- Cancel related mission if exists
    UPDATE public.missions
    SET status = 'canceled', updated_at = now()
    WHERE source_type = 'booking'
      AND source_id = NEW.id::text
      AND mission_type = 'cleaning_checkout'
      AND status NOT IN ('done', 'approved');
    RETURN NEW;
  END IF;

  -- Get property with cleaning settings
  SELECT * INTO prop
  FROM public.properties
  WHERE id = NEW.property_id;

  IF NOT FOUND OR prop.cleaning_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Build start time: checkout date + default start time + lead time
  mission_start := (NEW.check_out::date + prop.cleaning_default_start_time::time)::timestamptz
    + (COALESCE(prop.cleaning_lead_time_hours, 0) || ' hours')::interval;
  mission_end := mission_start + (COALESCE(prop.cleaning_duration_minutes, 120) || ' minutes')::interval;

  mission_title := 'Ménage (check-out) — ' || prop.name;
  mission_instructions := COALESCE(prop.cleaning_instructions_template, '');
  IF NEW.guest_name IS NOT NULL AND NEW.guest_name != '' THEN
    mission_instructions := mission_instructions || E'\n\nVoyageur: ' || NEW.guest_name;
  END IF;

  -- Check if mission already exists
  SELECT id INTO existing_id
  FROM public.missions
  WHERE source_type = 'booking'
    AND source_id = NEW.id::text
    AND mission_type = 'cleaning_checkout'
    AND user_id = NEW.user_id;

  IF existing_id IS NOT NULL THEN
    -- Update existing mission
    UPDATE public.missions
    SET
      start_at = mission_start,
      end_at = mission_end,
      payout_amount = COALESCE(prop.cleaning_payout_amount, 0),
      instructions = mission_instructions,
      title = mission_title,
      updated_at = now()
    WHERE id = existing_id
      AND status NOT IN ('done', 'approved', 'confirmed');
  ELSE
    -- Insert new mission
    INSERT INTO public.missions (
      user_id, property_id, title, mission_type, start_at, end_at,
      payout_amount, instructions, status, is_open_to_all,
      source_type, source_id
    ) VALUES (
      NEW.user_id,
      NEW.property_id,
      mission_title,
      'cleaning_checkout',
      mission_start,
      mission_end,
      COALESCE(prop.cleaning_payout_amount, 0),
      mission_instructions,
      CASE WHEN prop.cleaning_open_mode THEN 'open' ELSE 'draft' END,
      prop.cleaning_open_mode,
      'booking',
      NEW.id::text
    )
    ON CONFLICT (user_id, source_type, source_id, mission_type)
      WHERE source_type IS NOT NULL AND source_id IS NOT NULL
    DO UPDATE SET
      start_at = EXCLUDED.start_at,
      end_at = EXCLUDED.end_at,
      payout_amount = EXCLUDED.payout_amount,
      instructions = EXCLUDED.instructions,
      title = EXCLUDED.title,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trg_auto_cleaning_mission ON public.bookings;
CREATE TRIGGER trg_auto_cleaning_mission
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_cleaning_mission();
