-- Migration 0080: Add tags and segments to users table
-- Required for External API Customer module functionality

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS segments text[] DEFAULT '{}';

COMMENT ON COLUMN public.users.tags IS 'Array of custom tags applied to the user (e.g., VIP, wholesale)';
COMMENT ON COLUMN public.users.segments IS 'Array of marketing/CRM segments the user belongs to';
