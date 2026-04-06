
-- Atomic claim function with row-level locking
CREATE OR REPLACE FUNCTION public.claim_mission(_mission_id uuid, _provider_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mission_row RECORD;
BEGIN
  -- Lock the mission row to prevent race conditions
  SELECT id, status, selected_provider_id
  INTO mission_row
  FROM missions
  WHERE id = _mission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission introuvable');
  END IF;

  IF mission_row.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission déjà attribuée');
  END IF;

  IF mission_row.selected_provider_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission déjà prise par un autre prestataire');
  END IF;

  -- Claim the mission
  UPDATE missions
  SET status = 'assigned',
      selected_provider_id = _provider_id,
      updated_at = now()
  WHERE id = _mission_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
