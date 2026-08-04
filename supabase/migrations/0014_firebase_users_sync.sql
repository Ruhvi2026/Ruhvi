-- Phase 1: Firebase Users Sync
-- We need to drop the constraint on public.users.id linking to auth.users.id
-- because Firebase users don't have a Supabase Auth UUID.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Ensure id generates a default UUID if none is provided
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add a unique column to store Firebase UID
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS firebase_uid text UNIQUE;
