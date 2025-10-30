-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any existing demo expiration job (ignore error if doesn't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-demo-trials-hourly');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore error if job doesn't exist
END $$;

-- Schedule the expire-trials edge function to run every hour
SELECT cron.schedule(
  'expire-demo-trials-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/expire-trials',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eG56amt5emtwb3ltZXlwbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjgzODEsImV4cCI6MjA3NjkwNDM4MX0.TuYdc9Qqia-25i0XrFJWR4zyOmAMqcqtAjJ0jwO0nAQ"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);