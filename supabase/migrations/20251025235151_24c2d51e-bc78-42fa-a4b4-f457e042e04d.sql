-- Hotfix: Restore safe schema for public.users and add diagnostics

-- 1️⃣ Create diagnostic table for signup errors
CREATE TABLE IF NOT EXISTS public._signup_errors (
  id BIGSERIAL PRIMARY KEY,
  details TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ Drop problematic check constraint if it exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 3️⃣ Ensure safe defaults on public.users
-- Make role a simple text field with default
ALTER TABLE public.users
  ALTER COLUMN role TYPE TEXT,
  ALTER COLUMN role SET DEFAULT 'free_trial',
  ALTER COLUMN subscription_status SET DEFAULT 'trial_active',
  ALTER COLUMN has_used_demo SET DEFAULT false,
  ALTER COLUMN trial_expires_at SET DEFAULT (now() + interval '7 days'),
  ALTER COLUMN demo_token_issued_at DROP NOT NULL,
  ALTER COLUMN demo_token_expires_at DROP NOT NULL;

-- 4️⃣ Create index on email if not exists
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 5️⃣ Recreate the trigger function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      ELSE now() + interval '7 days'
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 999999
      ELSE 3
    END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also insert into user_roles for the new system (if table exists)
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
  -- Re-raise to prevent user creation if profile fails
  RAISE;
END;
$$;

-- 6️⃣ Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7️⃣ Update RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "me_select" ON public.users;
CREATE POLICY "me_select"
  ON public.users 
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their profile but NOT the role
DROP POLICY IF EXISTS "me_update_safe" ON public.users;
CREATE POLICY "me_update_safe"
  ON public.users 
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND COALESCE(role, 'free_trial') = COALESCE((SELECT role FROM public.users WHERE id = auth.uid()), 'free_trial')
  );

-- Block client-side inserts (trigger handles it)
DROP POLICY IF EXISTS "no_client_insert" ON public.users;
CREATE POLICY "no_client_insert"
  ON public.users 
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 8️⃣ Update can_create_booklet to handle role column safely
CREATE OR REPLACE FUNCTION public.can_create_booklet(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    WHEN (SELECT role FROM u) = 'pack_business' THEN (SELECT n FROM c) < 15
    WHEN (SELECT role FROM u) = 'pack_premium' THEN true
    WHEN (SELECT role FROM u) = 'super_admin' THEN true
    
    ELSE false
  END;
$$;