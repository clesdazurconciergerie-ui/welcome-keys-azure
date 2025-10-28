-- Add demo-related columns to booklets table
ALTER TABLE public.booklets 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;

-- Add index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_booklets_demo_expires 
ON public.booklets(is_demo, demo_expires_at) 
WHERE is_demo = true;

-- Create a function to expire demo trials
CREATE OR REPLACE FUNCTION public.expire_demo_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update users whose demo has expired
  UPDATE public.users
  SET 
    role = 'free',
    subscription_status = 'expired'
  WHERE 
    role = 'demo_user' 
    AND demo_token_expires_at < now();

  -- Hide expired demo booklets
  UPDATE public.booklets
  SET status = 'archived'
  WHERE 
    is_demo = true 
    AND demo_expires_at < now()
    AND status = 'published';
    
  -- Log the operation
  RAISE NOTICE 'Demo trials expired at %', now();
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.expire_demo_trials() TO service_role;

-- Add RLS policy to prevent access to expired demo booklets
CREATE POLICY "Hide expired demo booklets from public access"
ON public.booklets
FOR SELECT
USING (
  CASE 
    WHEN is_demo = true AND demo_expires_at < now() THEN false
    ELSE true
  END
);