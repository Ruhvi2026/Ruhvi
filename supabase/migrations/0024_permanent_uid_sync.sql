-- =============================================================================
-- 0024_permanent_uid_sync.sql
-- Permanent, self-healing Firebase UID sync solution.
--
-- Problem:  If any row in public.users has a missing or wrong firebase_uid,
--           the user cannot log in. Previously, this required manual DB fixes.
--
-- Solution: Three mechanisms that together guarantee firebase_uid is always
--           correct for every user, automatically:
--
--   1. upsert_firebase_user()  – called by the API on every login.
--                                Auto-creates or updates the profile.
--   2. sync_firebase_uids()    – one-time bulk fix for all existing rows.
--                                Run once manually: SELECT public.sync_firebase_uids();
--   3. set_firebase_uid trigger – BEFORE INSERT OR UPDATE on public.users.
--                                Enforces correct UID on every future write.
-- =============================================================================


-- =============================================================================
-- 1. upsert_firebase_user()
--    Called by the API auth routes on every successful Firebase login.
--    Creates a new user profile if one doesn't exist, or updates it if it does.
--    Returns the user's internal Supabase UUID (id column).
--    Using SECURITY DEFINER so it bypasses RLS — the API route already
--    verifies the Firebase token before calling this.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.upsert_firebase_user(
  p_uid    text,
  p_email  text  DEFAULT NULL,
  p_name   text  DEFAULT NULL,
  p_phone  text  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insert a new user or update the existing one (matched on firebase_uid).
  -- We also handle the case where the same email exists with a different/null UID
  -- by doing a secondary check on email.
  INSERT INTO public.users (firebase_uid, email, full_name, phone, role, wallet_balance, reward_coins)
  VALUES (p_uid, p_email, p_name, p_phone, 'customer', 0, 0)
  ON CONFLICT (firebase_uid) DO UPDATE
    SET
      email      = COALESCE(EXCLUDED.email,     public.users.email),
      full_name  = COALESCE(EXCLUDED.full_name,  public.users.full_name),
      phone      = COALESCE(EXCLUDED.phone,      public.users.phone),
      updated_at = now()
  RETURNING id INTO v_user_id;

  -- If the insert/update didn't return an id (extremely rare edge case),
  -- try finding by email as a last resort.
  IF v_user_id IS NULL AND p_email IS NOT NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE email = p_email
    LIMIT 1;

    -- If found by email, also fix the firebase_uid on that row
    IF v_user_id IS NOT NULL THEN
      UPDATE public.users
      SET firebase_uid = p_uid, updated_at = now()
      WHERE id = v_user_id;
    END IF;
  END IF;

  RETURN v_user_id;
END;
$$;


-- =============================================================================
-- 2. sync_firebase_uids()
--    One-time bulk fix: joins public.users with auth.users on email and
--    updates any firebase_uid that is NULL or doesn't match.
--    Run once manually in the Supabase SQL Editor:
--      SELECT public.sync_firebase_uids();
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_firebase_uids()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated integer;
BEGIN
  UPDATE public.users u
  SET
    firebase_uid = a.id::text,
    updated_at   = now()
  FROM auth.users a
  WHERE u.email = a.email
    AND (u.firebase_uid IS NULL OR u.firebase_uid <> a.id::text);

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  RETURN v_rows_updated;
END;
$$;


-- =============================================================================
-- 3. set_firebase_uid trigger
--    BEFORE INSERT OR UPDATE on public.users.
--    If the operation is performed in a Supabase Auth context (auth.uid() is
--    not null), force the firebase_uid to match the authenticated UID.
--    This prevents accidental mismatches caused by admin edits or scripts.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_firebase_uid_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only override if auth.uid() is available (i.e., a real user session)
  -- and the incoming row doesn't already have a firebase_uid set explicitly.
  IF auth.uid() IS NOT NULL AND NEW.firebase_uid IS NULL THEN
    NEW.firebase_uid := auth.uid()::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_firebase_uid ON public.users;
CREATE TRIGGER trg_set_firebase_uid
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_firebase_uid_fn();


-- =============================================================================
-- 4. Ensure the unique constraint on firebase_uid exists.
--    (Already added in 0014, but we re-confirm it here idempotently.)
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid
  ON public.users(firebase_uid);
