-- Fix search_path for generate_unique_pin function
CREATE OR REPLACE FUNCTION public.generate_unique_pin()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_pin TEXT;
  pin_exists BOOLEAN;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  LOOP
    new_pin := '';
    FOR i IN 1..8 LOOP
      new_pin := new_pin || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.pins WHERE pin_code = new_pin) INTO pin_exists;
    EXIT WHEN NOT pin_exists;
  END LOOP;
  
  RETURN new_pin;
END;
$$;