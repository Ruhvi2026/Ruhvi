-- =============================================================================
-- 0076_api_keys.sql
--
-- External API key system (machine-to-machine auth for third-party tools
-- such as n8n). See API_ENDPOINT.md.
--
-- Safety contract (additive only):
--   * Creates one NEW table `api_keys`. Does not alter any existing table,
--     policy, or function.
--   * Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
--   * RLS enabled with policies granting access only to service_role /
--     authenticated admin sessions via is_admin_or_staff().
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  key_prefix   text NOT NULL,
  scopes       text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   text,
  revoked_at   timestamptz,
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON public.api_keys (key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_created_by
  ON public.api_keys (created_by);

-- The table must be invisible to anon / unauthenticated traffic.
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Admin / staff sessions (via the existing is_admin_or_staff() helper) can
-- read and manage keys. The external endpoint and admin actions also use the
-- service-role client, which bypasses RLS entirely.
DROP POLICY IF EXISTS "admins can read api_keys" ON public.api_keys;
CREATE POLICY "admins can read api_keys"
  ON public.api_keys
  FOR SELECT
  USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "admins can manage api_keys" ON public.api_keys;
CREATE POLICY "admins can manage api_keys"
  ON public.api_keys
  FOR ALL
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());
