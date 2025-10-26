-- Add owner_id column to equipment table for direct RLS
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Populate owner_id from booklets for existing records
UPDATE public.equipment
SET owner_id = (
  SELECT user_id 
  FROM public.booklets 
  WHERE booklets.id = equipment.booklet_id
)
WHERE owner_id IS NULL;

-- Make owner_id NOT NULL after populating
ALTER TABLE public.equipment
  ALTER COLUMN owner_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_equipment_owner ON public.equipment(owner_id);

-- Drop old RLS policy
DROP POLICY IF EXISTS "Users can manage equipment for their booklets" ON public.equipment;

-- Create new RLS policies using owner_id directly
CREATE POLICY "eq_owner_select" ON public.equipment
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "eq_owner_insert" ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "eq_owner_update" ON public.equipment
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "eq_owner_delete" ON public.equipment
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());