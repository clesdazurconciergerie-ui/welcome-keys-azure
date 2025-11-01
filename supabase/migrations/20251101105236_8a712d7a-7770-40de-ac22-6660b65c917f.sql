-- Fix function search_path for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix function search_path for try_cast_jsonb
CREATE OR REPLACE FUNCTION public.try_cast_jsonb(txt text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  RETURN txt::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $function$;