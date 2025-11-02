-- Update Business plan quota from 25 to 50 booklets
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
    -- Demo user: 1 booklet for 7 days
    WHEN (SELECT role FROM u) = 'demo_user' THEN 
      (SELECT demo_token_expires_at FROM u) > now() AND (SELECT n FROM c) < 1
    
    -- Free trial: 1 booklet for 7 days
    WHEN (SELECT role FROM u) = 'free_trial' THEN 
      (SELECT trial_expires_at FROM u) > now() AND (SELECT n FROM c) < 1
    
    -- Paid users: check subscription status
    WHEN (SELECT status FROM u) <> 'active' THEN false
    
    -- Quotas per plan
    WHEN (SELECT role FROM u) = 'pack_starter' THEN (SELECT n FROM c) < 1
    WHEN (SELECT role FROM u) = 'pack_pro' THEN (SELECT n FROM c) < 5
    WHEN (SELECT role FROM u) = 'pack_business' THEN (SELECT n FROM c) < 50
    WHEN (SELECT role FROM u) = 'pack_premium' THEN true
    WHEN (SELECT role FROM u) = 'super_admin' THEN true
    
    ELSE false
  END;
$function$;