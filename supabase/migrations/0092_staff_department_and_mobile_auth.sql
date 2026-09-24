-- =============================================================================
-- Migration 0092: Staff Department and Direct Mobile Auth RPC
--
-- 1. Adds `department` text column to `public.users`.
-- 2. Sets default departments for existing staff members.
-- 3. Recreates `get_staff_directory()` returning id, full_name, email, role, department.
-- 4. Creates `authenticate_staff_mobile()` allowing direct, zero-Vercel-dependency
--    mobile login via Supabase RPC with signed Supabase custom JWT.
-- =============================================================================

-- Step 1: Add department column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department text;

-- Step 2: Assign departments to current staff
UPDATE public.users SET department = 'Operations' WHERE lower(email) = 'subhasdas1996@gmail.com';
UPDATE public.users SET department = 'Management' WHERE lower(email) = 'ruhvi.main@gmail.com';
UPDATE public.users SET department = 'Tech' WHERE lower(email) = 'jarviscomputers.online@gmail.com';
UPDATE public.users SET department = 'Support' WHERE full_name = 'Staff (Mobile)';

-- Step 3: Recreate get_staff_directory
DROP FUNCTION IF EXISTS public.get_staff_directory();

CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  department text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    id, 
    full_name, 
    email, 
    role::text,
    department
  FROM public.users
  WHERE role NOT IN ('customer')
  ORDER BY full_name ASC;
$$;

-- Step 4: Create authenticate_staff_mobile
CREATE OR REPLACE FUNCTION public.authenticate_staff_mobile(
  p_firebase_uid text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user record;
  v_user_id uuid;
  v_jwt text;
  v_jwt_secret text := 'j5BQJQdui4LaUbmmtoU0NQAOn1gAmvwK9EkGEhk8lWAhBJ3tcKGyjYy6HHtw2I1MSqvtrtQzHb+omNsoR1BXrQ==';
BEGIN
  -- 1. Try to find user via customer_identities
  SELECT customer_id INTO v_user_id
  FROM public.customer_identities
  WHERE firebase_uid = p_firebase_uid
  LIMIT 1;

  -- 2. If not found, match by email in public.users
  IF v_user_id IS NULL AND p_email IS NOT NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE lower(email) = lower(p_email)
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.customer_identities (customer_id, firebase_uid, provider, provider_identifier)
      VALUES (v_user_id, p_firebase_uid, 'password', p_email)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 3. If still not found, resolve identity
  IF v_user_id IS NULL THEN
    SELECT resolve_customer_identity(
      p_firebase_uid := p_firebase_uid,
      p_provider := 'password',
      p_provider_identifier := p_email,
      p_email := p_email,
      p_email_verified := true,
      p_phone := NULL,
      p_phone_verified := false,
      p_name := NULL
    ) INTO v_user_id;
  END IF;

  -- 4. Fetch user details and verify staff role
  SELECT id, full_name, email, role::text, department INTO v_user
  FROM public.users
  WHERE id = v_user_id;

  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found in system.');
  END IF;

  IF v_user.role = 'customer' THEN
    RETURN jsonb_build_object('error', 'Access restricted to Ruhvi staff only.');
  END IF;

  -- 5. Sign Supabase Custom JWT (valid 30 days)
  v_jwt := public.sign_jwt(
    jsonb_build_object(
      'iss', 'supabase',
      'sub', v_user.id::text,
      'firebase_uid', p_firebase_uid,
      'aud', 'authenticated',
      'role', 'authenticated',
      'email', coalesce(v_user.email, p_email, ''),
      'exp', extract(epoch from (now() + interval '30 days'))::bigint
    ),
    v_jwt_secret
  );

  RETURN jsonb_build_object(
    'success', true,
    'supabaseToken', v_jwt,
    'supabaseUserId', v_user.id::text,
    'email', v_user.email,
    'full_name', v_user.full_name,
    'role', v_user.role,
    'department', v_user.department
  );
END;
$$;
