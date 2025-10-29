-- Remove remaining duplicate UPDATE policy
DROP POLICY IF EXISTS "Users can update their own booklets" ON public.booklets;