-- Migration: Convert equipment.instructions to steps (JSONB array)

-- Helper function to safely cast text to jsonb
CREATE OR REPLACE FUNCTION public.try_cast_jsonb(txt text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN txt::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

-- Rename column and convert to JSONB with normalization
ALTER TABLE public.equipment
  RENAME COLUMN instructions TO steps;

-- Convert steps to JSONB array format
ALTER TABLE public.equipment
  ALTER COLUMN steps TYPE jsonb
  USING (
    CASE
      -- If already valid JSONB, keep it
      WHEN jsonb_typeof(try_cast_jsonb(steps)) = 'array' THEN try_cast_jsonb(steps)
      -- If it's a JSON object or string, try to parse
      WHEN try_cast_jsonb(steps) IS NOT NULL THEN try_cast_jsonb(steps)
      -- Fallback: split text by newlines
      ELSE to_jsonb(
        array_remove(
          regexp_split_to_array(COALESCE(steps, ''), E'\r?\n+'),
          ''
        )
      )
    END
  );

-- Set default value
ALTER TABLE public.equipment
  ALTER COLUMN steps SET DEFAULT '[]'::jsonb;

-- Add constraint to ensure it's always an array
ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_steps_is_array
  CHECK (jsonb_typeof(steps) = 'array');

-- Add index on booklet_id for faster queries
CREATE INDEX IF NOT EXISTS idx_equipment_booklet_id ON public.equipment(booklet_id);

-- Add comment for documentation
COMMENT ON COLUMN public.equipment.steps IS 'Array of step objects: [{"id": "uuid", "text": "Step description"}]';