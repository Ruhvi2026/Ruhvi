-- =============================================================================
-- Migration 0131: Staff and Customer Identity Separation & Notification Isolation
--
-- Core Guarantees:
-- 1. Context-Aware Separation: Staff and Customer identities live in decoupled tables.
-- 2. Admin-Only Staff Creation: Public signup cannot insert into staff_profiles (Strict RLS).
-- 3. Notification Zero-Leakage: Enforces target_audience ('customer' | 'staff') so
--    internal department/staff alerts never leak into customer storefront sessions.
-- 4. Backward Compatibility: Preserves public.users and legacy_user_id so existing
--    orders, chat history, and ticket foreign keys continue functioning without disruption.
-- =============================================================================

-- Step 1: Create staff_profiles Table
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  legacy_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  employee_code text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  work_email text UNIQUE,
  phone text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  department text NOT NULL DEFAULT 'Support',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'manager', 'staff')),
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_portals jsonb NOT NULL DEFAULT '["admin", "chat"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES auth.users(id),
  invitation_token text UNIQUE,
  invitation_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create customer_profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  loyalty_points integer DEFAULT 0,
  vip_status text DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Populate staff_profiles from existing public.users
DO $$
DECLARE
  u record;
  emp_idx integer := 1;
  gen_code text;
  v_first text;
  v_last text;
  name_parts text[];
BEGIN
  FOR u IN 
    SELECT * FROM public.users 
    WHERE role NOT IN ('customer') 
    ORDER BY created_at ASC
  LOOP
    -- Extract first and last name
    name_parts := string_to_array(COALESCE(u.full_name, 'Staff Member'), ' ');
    v_first := name_parts[1];
    IF array_length(name_parts, 1) > 1 THEN
      v_last := array_to_string(name_parts[2:], ' ');
    ELSE
      v_last := '';
    END IF;

    -- Generate employee code if missing
    gen_code := COALESCE(u.employee_id, 'RHV-STF-' || LPAD(emp_idx::text, 3, '0'));
    emp_idx := emp_idx + 1;

    INSERT INTO public.staff_profiles (
      legacy_user_id,
      employee_code,
      first_name,
      last_name,
      work_email,
      phone,
      department_id,
      department,
      role,
      permissions,
      allowed_portals,
      is_active,
      created_at
    ) VALUES (
      u.id,
      gen_code,
      v_first,
      v_last,
      u.email,
      u.phone,
      u.department_id,
      COALESCE(u.department, 'Support'),
      CASE 
        WHEN u.role = 'super_admin' THEN 'super_admin'
        WHEN u.role = 'admin' THEN 'admin'
        WHEN u.role = 'manager' THEN 'manager'
        ELSE 'staff'
      END,
      COALESCE(u.allowed_portals, '["admin", "chat"]'::jsonb),
      COALESCE(u.allowed_portals, '["admin", "chat"]'::jsonb),
      (COALESCE(u.account_status, 'active') = 'active'),
      COALESCE(u.created_at, now())
    )
    ON CONFLICT (employee_code) DO UPDATE SET
      work_email = EXCLUDED.work_email,
      phone = EXCLUDED.phone,
      department = EXCLUDED.department,
      role = EXCLUDED.role;
  END LOOP;
END $$;

-- Step 4: Alter notifications table for strict audience isolation
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'customer' 
  CHECK (target_audience IN ('customer', 'staff'));

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE CASCADE;

-- Backfill existing internal notifications to 'staff' audience
UPDATE public.notifications
SET target_audience = 'staff'
WHERE category = 'CHAT'
   OR target_department IS NOT NULL
   OR actor_id IS NOT NULL;

-- Step 5: Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_staff_profiles_work_email ON public.staff_profiles(lower(work_email));
CREATE INDEX IF NOT EXISTS idx_staff_profiles_auth_user ON public.staff_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_legacy_user ON public.staff_profiles(legacy_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active_dept ON public.staff_profiles(is_active, department);

CREATE INDEX IF NOT EXISTS idx_notifications_audience_user ON public.notifications(target_audience, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_audience_staff ON public.notifications(target_audience, target_staff_id);
CREATE INDEX IF NOT EXISTS idx_notifications_audience_dept ON public.notifications(target_audience, target_department);

-- Step 6: Enable Row Level Security (RLS) on staff_profiles
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Block all anonymous/public access
DROP POLICY IF EXISTS "Deny all public inserts on staff_profiles" ON public.staff_profiles;
CREATE POLICY "Deny all public inserts on staff_profiles"
  ON public.staff_profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Only service_role or active super_admin can insert new staff
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE (sp.auth_user_id = auth.uid() OR sp.legacy_user_id = auth.uid())
        AND sp.role IN ('super_admin', 'admin')
        AND sp.is_active = true
    )
  );

DROP POLICY IF EXISTS "Staff can view own profile or admin view all" ON public.staff_profiles;
CREATE POLICY "Staff can view own profile or admin view all"
  ON public.staff_profiles FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'service_role'
    OR auth_user_id = auth.uid()
    OR legacy_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE (sp.auth_user_id = auth.uid() OR sp.legacy_user_id = auth.uid())
        AND sp.role IN ('super_admin', 'admin')
        AND sp.is_active = true
    )
  );

-- Step 7: Update Notifications RLS Policies (Zero-Leakage Guarantee)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- 7A: Customer notifications policy (Customer portal only fetches customer-targeted notifications)
CREATE POLICY "Customer notifications policy"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    target_audience = 'customer' 
    AND user_id = auth.uid()
  );

-- 7B: Staff notifications policy (Staff portal/chatapp only fetches internal staff notifications)
CREATE POLICY "Staff notifications policy"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    target_audience = 'staff'
    AND (
      auth.role() = 'service_role'
      OR (
        target_staff_id IN (
          SELECT id FROM public.staff_profiles 
          WHERE (auth_user_id = auth.uid() OR legacy_user_id = auth.uid()) AND is_active = true
        )
      )
      OR (
        target_department IS NOT NULL 
        AND target_department IN (
          SELECT department FROM public.staff_profiles 
          WHERE (auth_user_id = auth.uid() OR legacy_user_id = auth.uid()) AND is_active = true
        )
      )
      OR (
        user_id IN (
          SELECT legacy_user_id FROM public.staff_profiles
          WHERE (auth_user_id = auth.uid() OR legacy_user_id = auth.uid()) AND is_active = true
        )
      )
    )
  );

-- Step 8: Update get_staff_directory Function
DROP FUNCTION IF EXISTS public.get_staff_directory();

CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  department text,
  employee_code text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    COALESCE(sp.legacy_user_id, sp.id) as id,
    (sp.first_name || ' ' || sp.last_name) as full_name,
    sp.work_email as email,
    sp.role,
    sp.department,
    sp.employee_code
  FROM public.staff_profiles sp
  WHERE sp.is_active = true
  ORDER BY sp.first_name ASC;
$$;

-- Step 9: Update authenticate_staff_mobile RPC to check staff_profiles
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
  v_staff record;
  v_jwt_secret text;
  v_jwt text;
  v_header text;
  v_payload text;
  v_signature text;
  v_issued_at bigint;
  v_expires_at bigint;
  v_user_id uuid;
BEGIN
  -- Check staff_profiles first
  SELECT * INTO v_staff
  FROM public.staff_profiles
  WHERE (lower(work_email) = lower(p_email) OR phone = p_email)
    AND is_active = true
  LIMIT 1;

  -- Fallback to users table if not yet synced in staff_profiles
  IF v_staff IS NULL THEN
    SELECT id as legacy_user_id, email as work_email, role, department, (account_status = 'active') as is_active, employee_id as employee_code
    INTO v_staff
    FROM public.users
    WHERE lower(email) = lower(p_email)
      AND role NOT IN ('customer')
      AND account_status = 'active'
    LIMIT 1;
  END IF;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Staff account not found or deactivated. Please contact management.'
    );
  END IF;

  v_user_id := COALESCE(v_staff.legacy_user_id, v_staff.id);

  -- Retrieve JWT Secret from Supabase Vault or settings
  SELECT decrypted_secret INTO v_jwt_secret
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_jwt_secret'
  LIMIT 1;

  IF v_jwt_secret IS NULL THEN
    v_jwt_secret := current_setting('app.settings.jwt_secret', true);
  END IF;

  IF v_jwt_secret IS NULL OR v_jwt_secret = '' THEN
    v_jwt_secret := 'RUHVI-STAFF-JWT-FALLBACK-SECRET-2026';
  END IF;

  v_issued_at := extract(epoch from now())::bigint;
  v_expires_at := v_issued_at + (30 * 24 * 3600); -- 30 days session

  -- Encode Header
  v_header := replace(replace(encode('{"alg":"HS256","typ":"JWT"}'::bytea, 'base64'), E'\n', ''), '=', '');

  -- Encode Payload with Context = 'staff'
  v_payload := replace(replace(encode(
    jsonb_build_object(
      'sub', v_user_id::text,
      'aud', 'authenticated',
      'role', 'authenticated',
      'context', 'staff',
      'staff_role', v_staff.role,
      'department', v_staff.department,
      'email', v_staff.work_email,
      'iat', v_issued_at,
      'exp', v_expires_at
    )::text::bytea, 
    'base64'
  ), E'\n', ''), '=', '');

  -- Generate HMAC-SHA256 Signature
  v_signature := replace(replace(encode(
    hmac(
      (v_header || '.' || v_payload)::bytea, 
      v_jwt_secret::bytea, 
      'sha256'
    ), 
    'base64'
  ), E'\n', ''), '=', '');

  v_jwt := v_header || '.' || v_payload || '.' || v_signature;

  RETURN jsonb_build_object(
    'supabaseToken', v_jwt,
    'supabaseUserId', v_user_id,
    'role', v_staff.role,
    'department', v_staff.department,
    'context', 'staff'
  );
END;
$$;

