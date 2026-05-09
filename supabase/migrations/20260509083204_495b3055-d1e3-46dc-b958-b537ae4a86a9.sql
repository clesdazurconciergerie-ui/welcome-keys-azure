
SELECT cron.schedule(
  'auto-sync-ical-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/auto-sync-ical-daily',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eG56amt5emtwb3ltZXlwbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjgzODEsImV4cCI6MjA3NjkwNDM4MX0.TuYdc9Qqia-25i0XrFJWR4zyOmAMqcqtAjJ0jwO0nAQ"}'::jsonb,
    body := '{"triggered_by":"cron"}'::jsonb
  ) AS request_id;
  $$
);
