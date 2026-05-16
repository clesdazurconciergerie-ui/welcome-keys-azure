ALTER TABLE public.property_inspections
  ADD COLUMN IF NOT EXISTS concierge_signature_url text,
  ADD COLUMN IF NOT EXISTS guest_signature_url text,
  ADD COLUMN IF NOT EXISTS concierge_signer_name text,
  ADD COLUMN IF NOT EXISTS guest_signer_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS meter_electricity text,
  ADD COLUMN IF NOT EXISTS meter_water text,
  ADD COLUMN IF NOT EXISTS meter_gas text,
  ADD COLUMN IF NOT EXISTS occupants_count integer,
  ADD COLUMN IF NOT EXISTS damage_notes text;