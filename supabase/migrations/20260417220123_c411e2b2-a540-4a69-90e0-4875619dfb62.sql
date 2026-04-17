-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing job if present (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-create-inspections-daily') THEN
    PERFORM cron.unschedule('auto-create-inspections-daily');
  END IF;
END $$;

-- Schedule daily at 06:00 UTC (07:00 / 08:00 Paris depending on DST)
SELECT cron.schedule(
  'auto-create-inspections-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/auto-create-inspections',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eG56amt5emtwb3ltZXlwbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjgzODEsImV4cCI6MjA3NjkwNDM4MX0.TuYdc9Qqia-25i0XrFJWR4zyOmAMqcqtAjJ0jwO0nAQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);