create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Note: the Authorization header below uses this project's public anon key
-- (safe to embed — it's meant for client-side use), just to satisfy the
-- Edge Function's JWT verification. It carries no elevated privilege; the
-- function itself uses the service-role key internally.
select
  cron.schedule(
    'keja-daily-cycle',
    '0 6 * * *',
    $$
    select net.http_post(
      url := 'https://vvuoirqtvzunenxhhotf.supabase.co/functions/v1/daily-cycle',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dW9pcnF0dnp1bmVueGhob3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDUxODUsImV4cCI6MjEwMTA4MTE4NX0.5AzIYfVmt6PteQpNEU2jOhrxltPt00_H8uv6ZAAcIMU',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $$
  );
