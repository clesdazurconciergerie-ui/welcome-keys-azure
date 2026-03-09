-- Create function to notify providers when a new mission is created
CREATE OR REPLACE FUNCTION public.notify_providers_new_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_record RECORD;
  property_name TEXT;
  mission_date TEXT;
  notification_title TEXT;
  notification_message TEXT;
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
    
    -- Find relevant providers
    -- For now, notify all active service providers
    -- TODO: Add filtering by property, zone, or provider preferences
    FOR provider_record IN
      SELECT DISTINCT sp.auth_user_id
      FROM service_providers sp
      WHERE sp.status = 'active'
        AND sp.concierge_user_id = NEW.user_id
    LOOP
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
        provider_record.auth_user_id,
        notification_title,
        notification_message,
        'mission_available',
        'mission',
        NEW.id::text,
        'mission',
        false
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
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
    
    -- Get provider's auth_user_id
    SELECT auth_user_id INTO provider_record
    FROM service_providers
    WHERE id = NEW.selected_provider_id;
    
    IF provider_record.auth_user_id IS NOT NULL THEN
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
        provider_record.auth_user_id,
        'Mission assignée',
        NEW.title || E'\n' || mission_date,
        'mission_assigned',
        'mission',
        NEW.id::text,
        'mission',
        false
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for mission notifications
DROP TRIGGER IF EXISTS trigger_notify_providers_new_mission ON missions;
CREATE TRIGGER trigger_notify_providers_new_mission
  AFTER INSERT OR UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION notify_providers_new_mission();