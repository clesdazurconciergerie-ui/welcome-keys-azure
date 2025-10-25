-- Fix function search_path security warnings

-- 1️⃣ Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2️⃣ Fix cleanup_demo_users function
CREATE OR REPLACE FUNCTION public.cleanup_demo_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 3️⃣ Fix generate_pin_code function
CREATE OR REPLACE FUNCTION public.generate_pin_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_pin TEXT;
  pin_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if PIN already exists
    SELECT EXISTS(SELECT 1 FROM public.pins WHERE pin_code = new_pin) INTO pin_exists;
    
    -- Exit loop if PIN is unique
    EXIT WHEN NOT pin_exists;
  END LOOP;
  
  RETURN new_pin;
END;
$function$;

-- 4️⃣ Fix check_booklet_quota function
CREATE OR REPLACE FUNCTION public.check_booklet_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_count INTEGER;
  user_quota INTEGER;
BEGIN
  -- Get user's quota
  SELECT booklet_quota INTO user_quota
  FROM public.users
  WHERE id = p_user_id;
  
  -- Count user's booklets
  SELECT COUNT(*) INTO current_count
  FROM public.booklets
  WHERE user_id = p_user_id;
  
  -- Return true if under quota
  RETURN current_count < user_quota;
END;
$function$;

-- 5️⃣ Fix update_wifi_credentials_updated_at function
CREATE OR REPLACE FUNCTION public.update_wifi_credentials_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6️⃣ Fix update_booklet_contacts_updated_at function
CREATE OR REPLACE FUNCTION public.update_booklet_contacts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;