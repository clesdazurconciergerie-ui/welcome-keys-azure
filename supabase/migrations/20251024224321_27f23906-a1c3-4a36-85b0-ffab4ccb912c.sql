-- Add status to pins table
ALTER TABLE public.pins ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add check constraint for pin status
ALTER TABLE public.pins ADD CONSTRAINT pins_status_check 
  CHECK (status IN ('active', 'disabled'));

-- Add missing columns to booklets for additional features
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS nearby jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;

-- Create index on pin code for faster lookups
CREATE INDEX IF NOT EXISTS idx_pins_code ON public.pins(pin_code);
CREATE INDEX IF NOT EXISTS idx_pins_status ON public.pins(status);

-- Update generate_pin_code function to ensure uniqueness
CREATE OR REPLACE FUNCTION public.generate_unique_pin()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_pin TEXT;
  pin_exists BOOLEAN;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars
BEGIN
  LOOP
    -- Generate 8-character alphanumeric PIN
    new_pin := '';
    FOR i IN 1..8 LOOP
      new_pin := new_pin || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if PIN already exists
    SELECT EXISTS(SELECT 1 FROM public.pins WHERE pin_code = new_pin) INTO pin_exists;
    
    -- Exit loop if PIN is unique
    EXIT WHEN NOT pin_exists;
  END LOOP;
  
  RETURN new_pin;
END;
$$;