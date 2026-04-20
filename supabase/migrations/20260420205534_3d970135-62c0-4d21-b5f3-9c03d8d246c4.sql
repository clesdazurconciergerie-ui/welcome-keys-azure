-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove existing job if present (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('monthly-reports-generation');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule monthly report generation: 1st day of month at 08:00 UTC
SELECT cron.schedule(
  'monthly-reports-generation',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/generate-monthly-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eG56amt5emtwb3ltZXlwbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjgzODEsImV4cCI6MjA3NjkwNDM4MX0.TuYdc9Qqia-25i0XrFJWR4zyOmAMqcqtAjJ0jwO0nAQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);