
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source_platform text DEFAULT 'other';

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS source_platform text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS source_name text;

CREATE INDEX IF NOT EXISTS idx_bookings_source_platform ON public.bookings(source_platform);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source_platform ON public.calendar_events(source_platform);

-- Backfill bookings.source_platform from existing source column
UPDATE public.bookings
SET source_platform = CASE
  WHEN lower(coalesce(source, '')) IN ('airbnb') THEN 'airbnb'
  WHEN lower(coalesce(source, '')) IN ('booking', 'booking.com') THEN 'booking'
  WHEN lower(coalesce(source, '')) IN ('vrbo', 'abritel', 'homeaway') THEN 'vrbo'
  WHEN lower(coalesce(source, '')) IN ('direct', 'manual') THEN 'direct'
  ELSE 'other'
END
WHERE source_platform IS NULL OR source_platform = 'other';

-- Backfill calendar_events.source_platform from existing platform column
UPDATE public.calendar_events
SET source_platform = CASE
  WHEN lower(coalesce(platform, '')) = 'airbnb' THEN 'airbnb'
  WHEN lower(coalesce(platform, '')) IN ('booking', 'booking.com') THEN 'booking'
  WHEN lower(coalesce(platform, '')) IN ('vrbo', 'abritel', 'homeaway') THEN 'vrbo'
  ELSE 'other'
END
WHERE source_platform IS NULL OR source_platform = 'other';
