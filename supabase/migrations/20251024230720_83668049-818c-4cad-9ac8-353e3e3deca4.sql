-- Security fix: Remove public access to PIN codes
-- Only authenticated booklet owners should see their own PINs
-- Public access to booklets continues via server-side endpoint with service role

-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Public can view pins" ON public.pins;

-- Ensure RLS is enabled (should already be)
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- The existing policies already restrict access to owners:
-- "Users can view pins for their booklets" - SELECT for owners
-- "Users can insert pins for their booklets" - INSERT for owners

-- Add UPDATE and DELETE policies for owners (currently missing)
CREATE POLICY "Users can update pins for their booklets"
ON public.pins
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = pins.booklet_id
      AND booklets.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = pins.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete pins for their booklets"
ON public.pins
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = pins.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Verify booklets table security (should already have RLS)
ALTER TABLE public.booklets ENABLE ROW LEVEL SECURITY;