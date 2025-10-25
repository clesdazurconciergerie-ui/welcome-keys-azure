-- Add explicit deny policy for public/anonymous access to users table
-- This prevents any potential bypass or misconfiguration from exposing user emails

CREATE POLICY "deny_all_public_access"
ON public.users
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Also ensure no public role can access
CREATE POLICY "deny_all_unauthenticated_access"
ON public.users
FOR ALL
TO public
USING (false)
WITH CHECK (false);