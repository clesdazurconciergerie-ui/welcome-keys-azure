-- Fix notification trigger to prevent null user_id insertions
-- The issue is that the provider_record variable is being reused in nested blocks

CREATE OR REPLACE FUNCTION public.notify_providers_new_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  provider_rec RECORD;
  property_name TEXT;
  mission_date TEXT;
  notification_title TEXT;
  notification_message TEXT;
  skipped_count INT;
BEGIN
  -- Only notify for new missions or status changes to 'open'
  IF (TG_OP = 'INSERT' AND NEW.status = 'open') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'open' AND NEW.status = 'open') THEN
    
    -- Get property name
    SELECT name INTO property_name
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Format mission date
    mission_date := to_char(NEW.start_at, 'DD/MM à HH24:MI');
    
    -- Build notification content
    notification_title := 'Nouvelle mission disponible';
    notification_message := NEW.title || E'\n' || mission_date;
    
    -- Find relevant providers with valid auth accounts
    FOR provider_rec IN
      SELECT DISTINCT sp.auth_user_id, sp.id as provider_id, sp.email
      FROM service_providers sp
      WHERE sp.status = 'active'
        AND sp.concierge_user_id = NEW.user_id
        AND sp.auth_user_id IS NOT NULL  -- CRITICAL: Skip providers without auth accounts
    LOOP
      -- Double-check auth_user_id is not null before insert
      IF provider_rec.auth_user_id IS NOT NULL THEN
        BEGIN
          -- Create notification for each provider
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            category,
            related_id,
            related_type,
            is_read
          ) VALUES (
            provider_rec.auth_user_id,
            notification_title,
            notification_message,
            'mission_available',
            'mission',
            NEW.id::text,
            'mission',
            false
          );
          
          RAISE LOG 'Notification created for provider % (user_id: %)', 
            provider_rec.email, provider_rec.auth_user_id;
            
        EXCEPTION WHEN OTHERS THEN
          -- Log error but don't block mission creation
          RAISE LOG 'Failed to create notification for provider % (user_id: %): %', 
            provider_rec.email, provider_rec.auth_user_id, SQLERRM;
        END;
      ELSE
        RAISE LOG 'Notification skipped: provider % has null auth_user_id despite WHERE filter', 
          provider_rec.email;
      END IF;
    END LOOP;
    
    -- Count and log skipped providers (moved outside main loop, use different var name)
    SELECT COUNT(*) INTO skipped_count
    FROM service_providers sp
    WHERE sp.status = 'active'
      AND sp.concierge_user_id = NEW.user_id
      AND sp.auth_user_id IS NULL;
      
    IF skipped_count > 0 THEN
      RAISE LOG 'Notification skipped: % provider(s) without linked auth account for mission %', 
        skipped_count, NEW.id;
    END IF;
  END IF;
  
  -- Notify provider when mission is directly assigned
  IF (TG_OP = 'INSERT' AND NEW.selected_provider_id IS NOT NULL AND NEW.status = 'assigned') OR
     (TG_OP = 'UPDATE' AND NEW.selected_provider_id IS NOT NULL AND 
      (OLD.selected_provider_id IS NULL OR OLD.selected_provider_id != NEW.selected_provider_id)) THEN
    
    -- Get property name
    SELECT name INTO property_name
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Format mission date
    mission_date := to_char(NEW.start_at, 'DD/MM à HH24:MI');
    
    -- Get provider's auth_user_id with email for logging (use different variable)
    DECLARE
      assigned_provider_rec RECORD;
    BEGIN
      SELECT auth_user_id, email INTO assigned_provider_rec
      FROM service_providers
      WHERE id = NEW.selected_provider_id;
      
      -- Only create notification if auth_user_id exists and is not null
      IF assigned_provider_rec.auth_user_id IS NOT NULL THEN
        BEGIN
          -- Create assigned notification
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            category,
            related_id,
            related_type,
            is_read
          ) VALUES (
            assigned_provider_rec.auth_user_id,
            'Mission assignée',
            NEW.title || E'\n' || mission_date,
            'mission_assigned',
            'mission',
            NEW.id::text,
            'mission',
            false
          );
          
          RAISE LOG 'Assignment notification created for provider % (user_id: %)', 
            assigned_provider_rec.email, assigned_provider_rec.auth_user_id;
            
        EXCEPTION WHEN OTHERS THEN
          -- Log error but don't block mission assignment
          RAISE LOG 'Failed to create assignment notification for provider % (user_id: %): %', 
            assigned_provider_rec.email, assigned_provider_rec.auth_user_id, SQLERRM;
        END;
      ELSE
        RAISE LOG 'Notification skipped: selected provider % has no linked auth account for mission %',
          NEW.selected_provider_id, NEW.id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;