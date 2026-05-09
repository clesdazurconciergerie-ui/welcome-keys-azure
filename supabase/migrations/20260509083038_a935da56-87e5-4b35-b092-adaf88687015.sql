
-- Extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add columns to ical_calendars
ALTER TABLE public.ical_calendars
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_status text,
  ADD COLUMN IF NOT EXISTS sync_health_score numeric(3,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_sync_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_frequency_hours integer NOT NULL DEFAULT 24;

-- Sync history
CREATE TABLE IF NOT EXISTS public.ical_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ical_calendar_id uuid NOT NULL REFERENCES public.ical_calendars(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'running',
  events_fetched integer DEFAULT 0,
  events_created integer DEFAULT 0,
  events_updated integer DEFAULT 0,
  events_deleted integer DEFAULT 0,
  duplicates_avoided integer DEFAULT 0,
  error_message text,
  error_code text,
  http_status integer,
  response_time_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'manual',
  sync_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_history_calendar ON public.ical_sync_history(ical_calendar_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_user ON public.ical_sync_history(user_id, started_at DESC);

ALTER TABLE public.ical_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_sync_history" ON public.ical_sync_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Sync queue
CREATE TABLE IF NOT EXISTS public.ical_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ical_calendar_id uuid NOT NULL REFERENCES public.ical_calendars(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  priority integer NOT NULL DEFAULT 5,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  status text NOT NULL DEFAULT 'pending',
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status_sched ON public.ical_sync_queue(status, scheduled_for, priority DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON public.ical_sync_queue(user_id);

ALTER TABLE public.ical_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_sync_queue" ON public.ical_sync_queue
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Health score function
CREATE OR REPLACE FUNCTION public.update_calendar_health_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count integer;
  success_count integer;
  new_score numeric(3,2);
  fails integer;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'success')
    INTO total_count, success_count
  FROM public.ical_sync_history
  WHERE ical_calendar_id = NEW.ical_calendar_id
    AND started_at > now() - interval '30 days';

  IF total_count = 0 THEN
    new_score := 1.00;
  ELSE
    new_score := ROUND((success_count::numeric / total_count::numeric), 2);
  END IF;

  -- Compute consecutive failures
  IF NEW.status = 'success' THEN
    fails := 0;
  ELSE
    SELECT COALESCE(consecutive_failures, 0) + 1 INTO fails
    FROM public.ical_calendars WHERE id = NEW.ical_calendar_id;
  END IF;

  UPDATE public.ical_calendars
  SET
    sync_health_score = new_score,
    last_sync_at = NEW.completed_at,
    last_sync_status = NEW.status,
    consecutive_failures = fails,
    is_sync_enabled = CASE WHEN fails >= 5 THEN false ELSE is_sync_enabled END
  WHERE id = NEW.ical_calendar_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_calendar_health_score ON public.ical_sync_history;
CREATE TRIGGER trg_update_calendar_health_score
  AFTER INSERT OR UPDATE OF completed_at, status ON public.ical_sync_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_health_score();

-- updated_at trigger for queue
DROP TRIGGER IF EXISTS trg_sync_queue_updated_at ON public.ical_sync_queue;
CREATE TRIGGER trg_sync_queue_updated_at
  BEFORE UPDATE ON public.ical_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
