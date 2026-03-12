-- Migration 007: Abandoned Cart Cron + Unsubscribe column
-- Run this in Supabase SQL Editor after migration 006

-- Add unsubscribed_at column to checkout_sessions
ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ DEFAULT NULL;

-- Add currency column to checkout_sessions (for multi-currency email formatting)
ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Index for abandoned cart job queries
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_abandoned
  ON checkout_sessions (tenant_id, step_reached, created_at)
  WHERE recovered_at IS NULL AND unsubscribed_at IS NULL;

-- ─── Supabase pg_cron Setup (run in SQL Editor) ───────────────────────────
-- Uncomment and run once in Supabase SQL Editor to activate the cron job.
-- This calls the /api/cron/abandoned-carts endpoint every 5 minutes.
-- Replace YOUR_APP_URL and YOUR_CRON_SECRET with real values.

/*
SELECT cron.schedule(
  'abandoned-cart-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'YOUR_APP_URL/api/cron/abandoned-carts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    ),
    body := '{}'
  );
  $$
);
*/

-- Note: The pg_cron extension must be enabled in your Supabase project.
-- Go to Database → Extensions → enable pg_cron
-- pg_net is also required for HTTP calls from cron
