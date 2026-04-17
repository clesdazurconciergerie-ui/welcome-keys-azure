-- Add fields needed for direct (manual) bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_phone text;

-- Index to speed up filtering of direct bookings in stats
CREATE INDEX IF NOT EXISTS idx_bookings_property_source_platform
  ON public.bookings (property_id, source_platform);