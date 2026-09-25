-- ============================================================================
-- Migration 0098: Lock staff name from client modifications
-- Enforces that staff full_name can only be modified directly in the database (Supabase),
-- never via RPC or client calls.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_staff_profile(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_bio text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_updated record;
BEGIN
  -- Strict Policy: p_full_name is intentionally ignored.
  -- Full name can only be changed directly in the database by administrators.
  UPDATE public.users
  SET 
    avatar_url = coalesce(p_avatar_url, avatar_url),
    bio = coalesce(p_bio, bio),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING id, full_name, email, department, role, avatar_url, bio INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN to_jsonb(v_updated);
END;
$$;
