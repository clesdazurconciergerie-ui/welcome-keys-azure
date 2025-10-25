-- Add Stripe-related columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS latest_checkout_session_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';

-- Create function to check if user can create booklet
CREATE OR REPLACE FUNCTION public.can_create_booklet(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH u AS (
    SELECT role
    FROM public.users
    WHERE id = uid
  ),
  c AS (
    SELECT count(*)::int AS n
    FROM public.booklets
    WHERE user_id = uid
  )
  SELECT CASE
    WHEN (SELECT role FROM u) IS NULL THEN false
    WHEN (SELECT role FROM u) = 'pack_starter' THEN (SELECT n FROM c) < 1
    WHEN (SELECT role FROM u) = 'super_admin' THEN true
    ELSE false
  END;
$$;

-- Update booklets RLS policy for INSERT to check quota
DROP POLICY IF EXISTS "Users can insert their own booklets" ON public.booklets;
CREATE POLICY "Users can insert their own booklets"
ON public.booklets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.can_create_booklet(auth.uid())
);