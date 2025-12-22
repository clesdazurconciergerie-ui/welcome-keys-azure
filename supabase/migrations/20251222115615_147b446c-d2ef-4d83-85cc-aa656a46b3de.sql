-- Add cron job for cleanup-expired-trials (runs daily at 4 AM)
SELECT cron.schedule(
  'cleanup-expired-trials-daily',
  '0 4 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/cleanup-expired-trials',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eG56amt5emtwb3ltZXlwbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjgzODEsImV4cCI6MjA3NjkwNDM4MX0.TuYdc9Qqia-25i0XrFJWR4zyOmAMqcqtAjJ0jwO0nAQ"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);