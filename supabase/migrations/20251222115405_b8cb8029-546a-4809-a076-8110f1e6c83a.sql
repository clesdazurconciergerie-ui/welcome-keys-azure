-- Add grace_period_ends_at column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamp with time zone DEFAULT NULL;

-- Update handle_new_user trigger to set trial_expires_at to 30 days instead of 7
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'clesdazur.conciergerie@gmail.com' THEN
    user_role := 'super_admin';
  ELSE
    user_role := 'free_trial';
  END IF;

  -- Insert into public.users
  INSERT INTO public.users (
    id, 
    email, 
    subscription_status, 
    role,
    trial_expires_at,
    booklet_quota
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 'active'
      ELSE 'trial_active'
    END,
    user_role,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN NULL
      ELSE now() + interval '30 days'  -- Changed from 7 days to 30 days
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 999999
      ELSE 3
    END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also insert into user_roles for the new system
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error for debugging
  INSERT INTO public._signup_errors (details)
  VALUES (SQLERRM);
  RAISE;
END;
$$;

-- Update can_create_booklet function to check grace_period_ends_at
CREATE OR REPLACE FUNCTION public.can_create_booklet(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH u AS (
    SELECT 
      COALESCE(role, 'free_trial') AS role, 
      COALESCE(subscription_status, 'none') AS status,
      trial_expires_at,
      grace_period_ends_at,
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
    
    -- Free trial: blocked if trial expired (regardless of grace period)
    WHEN (SELECT role FROM u) = 'free_trial' THEN 
      (SELECT trial_expires_at FROM u) > now() AND (SELECT n FROM c) < 3
    
    -- Free user: cannot create booklets
    WHEN (SELECT role FROM u) = 'free' THEN false
    
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
$$;

-- Update booklets RLS policy to hide booklets when trial expired (but keep during grace period for viewing)
DROP POLICY IF EXISTS "booklets_select_own" ON public.booklets;

CREATE POLICY "booklets_select_own" ON public.booklets
FOR SELECT
USING (
  user_id = auth.uid() 
  AND (
    -- Demo: check demo expiration
    (is_demo = true AND (demo_expires_at > now() OR demo_expires_at IS NULL))
    OR
    -- Non-demo: always visible to owner (even during grace period for dashboard access)
    is_demo = false
  )
);