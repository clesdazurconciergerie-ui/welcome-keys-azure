
-- Add linen_price_per_person to property_financial_settings
ALTER TABLE public.property_financial_settings
  ADD COLUMN IF NOT EXISTS linen_price_per_person numeric DEFAULT 0;

-- Add new inspection fields
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS meter_photos_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS keys_handed_over integer DEFAULT NULL;
