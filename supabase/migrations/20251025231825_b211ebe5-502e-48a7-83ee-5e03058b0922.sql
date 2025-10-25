-- Add demo-related columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS demo_token_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS demo_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_used_demo boolean DEFAULT false;

-- Update can_create_booklet function to handle demo_user role
CREATE OR REPLACE FUNCTION public.can_create_booklet(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH u AS (
    SELECT 
      COALESCE(role, 'free_trial') AS role, 
      COALESCE(subscription_status, 'none') AS status,
      trial_expires_at,
      demo_token_expires_at
    FROM public.users 
    WHERE id = uid
  ),
  c AS (
    SELECT count(*)::int AS n 
    FROM public.booklets 
    WHERE user_id = uid
  )
  SELECT CASE
    -- Demo user: 1 livret pendant 7 jours
    WHEN (SELECT role FROM u) = 'demo_user' THEN 
      (SELECT demo_token_expires_at FROM u) > now() AND (SELECT n FROM c) < 1
    
    -- Free trial: 1 livret pendant 7 jours
    WHEN (SELECT role FROM u) = 'free_trial' THEN 
      (SELECT trial_expires_at FROM u) > now() AND (SELECT n FROM c) < 1
    
    -- Utilisateurs payants: vérifier le statut d'abonnement
    WHEN (SELECT status FROM u) <> 'active' THEN false
    
    -- Quotas par plan
    WHEN (SELECT role FROM u) = 'pack_starter' THEN (SELECT n FROM c) < 1
    WHEN (SELECT role FROM u) = 'pack_pro' THEN (SELECT n FROM c) < 5
    WHEN (SELECT role FROM u) = 'pack_business' THEN (SELECT n FROM c) < 15
    WHEN (SELECT role FROM u) = 'pack_premium' THEN true
    WHEN (SELECT role FROM u) = 'super_admin' THEN true
    
    ELSE false
  END;
$function$;

-- Create function to clean up expired demo users
CREATE OR REPLACE FUNCTION public.cleanup_demo_users()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete booklets belonging to expired demo users
  DELETE FROM public.booklets
  WHERE user_id IN (
    SELECT id 
    FROM public.users
    WHERE role = 'demo_user' 
      AND demo_token_expires_at < now()
  );

  -- Update expired demo users to free role
  UPDATE public.users
  SET 
    role = 'free',
    subscription_status = 'expired'
  WHERE role = 'demo_user' 
    AND demo_token_expires_at < now();
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3 AM
SELECT cron.schedule(
  'cleanup-demo-users',
  '0 3 * * *',
  'SELECT public.cleanup_demo_users();'
);