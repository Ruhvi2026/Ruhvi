-- Migration 0063: EspoCRM Contact ID on users
-- Adds espo_contact_id to users so the VM cron sync can track which
-- customers already have an EspoCRM Contact and skip them on the next run.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS espo_contact_id text;

-- Fast lookup so the cron can filter WHERE espo_contact_id IS NULL
CREATE INDEX IF NOT EXISTS idx_users_espo_contact
  ON public.users(espo_contact_id)
  WHERE espo_contact_id IS NOT NULL;
