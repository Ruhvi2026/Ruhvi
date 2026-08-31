-- =============================================================================
-- 0071_consolidated_user_profile_rpc.sql
-- Consolidates AuthContext's four sequential user lookups (id → firebase_uid
-- → phone → email) into a single RPC, preserving the exact same precedence
-- order and RLS-equivalent access restrictions as the old four-step logic.
--
-- Access model (must match the old client-side behaviour exactly):
--   * id lookup           → only the caller's own row (old step 1 was an RLS-
--                           gated `users` SELECT where auth.uid() = id)
--   * firebase_uid lookup → any row via customer_identities (old step 2 was
--                           the SECURITY DEFINER get_user_profile RPC, which
--                           resolved firebase_uid across all users)
--   * phone lookup        → only the caller's own row (old step 3 was an
--                           RLS-gated `users` SELECT)
--   * email lookup        → only the caller's own row (old step 4 was an
--                           RLS-gated `users` SELECT)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_profile_consolidated(
  p_id uuid DEFAULT NULL,
  p_firebase_uid text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS SETOF public.users
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. id (own row only)
  IF p_id IS NOT NULL THEN
    RETURN QUERY
      SELECT * FROM public.users u
      WHERE u.id = p_id
        AND u.id = auth.uid()
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 2. firebase_uid (any user via customer_identities)
  IF p_firebase_uid IS NOT NULL THEN
    RETURN QUERY
      SELECT u.* FROM public.users u
      JOIN public.customer_identities ci ON ci.customer_id = u.id
      WHERE ci.firebase_uid = p_firebase_uid
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 3. phone (own row only; old code matched on the last 10 digits)
  IF p_phone IS NOT NULL THEN
    RETURN QUERY
      SELECT * FROM public.users u
      WHERE u.phone ILIKE '%' || p_phone || '%'
        AND u.id = auth.uid()
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 4. email (own row only)
  IF p_email IS NOT NULL THEN
    RETURN QUERY
      SELECT * FROM public.users u
      WHERE u.email = p_email
        AND u.id = auth.uid()
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN;
END;
$$;

-- Single-column indexes for the OR-based lookups (email, phone). The existing
-- UNIQUE constraint on customer_identities.firebase_uid already provides its
-- index, and users.id is the primary key.
CREATE INDEX IF NOT EXISTS idx_users_email_lookup
  ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_users_phone_lookup
  ON public.users(phone);
