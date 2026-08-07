-- Phase 25: Security & Roles Update

-- 1. Ensure the 'role' column has constraints or at least standardizes the enum.
-- Since the database uses an ENUM type named 'user_role', we need to add the new roles to it.
-- We use a DO block to ignore errors if the values already exist (useful for idempotency).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'guest') THEN
    ALTER TYPE user_role ADD VALUE 'guest';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'staff') THEN
    ALTER TYPE user_role ADD VALUE 'staff';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'manager') THEN
    ALTER TYPE user_role ADD VALUE 'manager';
  END IF;
END $$;

-- 2. Add user_identifier to ai_logs for rate limiting tracking
ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS user_identifier TEXT;

-- 3. Enhance RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
DROP POLICY IF EXISTS "Only admins can insert/update settings" ON public.settings;

-- Public can read settings (e.g. for store config), but backend handles AI settings securely via service role.
-- Actually, some settings should not be readable by public. We can restrict by key.
CREATE POLICY "Public can read non-ai settings" ON public.settings
    FOR SELECT
    USING ( key NOT LIKE 'ai_%' );

CREATE POLICY "Only admins can manage settings" ON public.settings
    FOR ALL
    USING ( (auth.jwt() ->> 'role') = 'admin' );

-- Note: The server uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for ai_global fetching in generateAIContent.
