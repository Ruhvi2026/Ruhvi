-- =============================================================================
-- Migration 0094: User Department Management and RBAC RPC
--
-- 1. Inserts 'tech' department into public.departments if not already present.
-- 2. Links existing staff in public.users to public.departments via department_id.
-- 3. Sets default allowed_portals matching their department subdomain for existing staff.
-- 4. Creates public.admin_update_user_privileges() to allow admins to assign role,
--    department, and allowed_portals via the Admin User Directory dropdown.
-- 5. Updates public.admin_update_user_role() for backward compatibility.
-- =============================================================================

-- 1. Ensure 'tech' department exists
INSERT INTO public.departments (name, description) VALUES
  ('tech', 'Technology, IT infrastructure, development')
ON CONFLICT (name) DO NOTHING;

-- 2. Link existing staff in public.users to public.departments
UPDATE public.users u
SET department_id = d.id
FROM public.departments d
WHERE lower(u.department) = lower(d.name)
AND u.department_id IS NULL;

-- 3. Update allowed_portals for existing staff who have department set
UPDATE public.users
SET allowed_portals = '["orders"]'::jsonb
WHERE lower(department) = 'orders' AND (allowed_portals IS NULL OR allowed_portals = '[]'::jsonb);

UPDATE public.users
SET allowed_portals = '["operations"]'::jsonb
WHERE lower(department) = 'operations' AND (allowed_portals IS NULL OR allowed_portals = '[]'::jsonb);

UPDATE public.users
SET allowed_portals = '["support"]'::jsonb
WHERE lower(department) = 'support' AND (allowed_portals IS NULL OR allowed_portals = '[]'::jsonb);

UPDATE public.users
SET allowed_portals = '["tech"]'::jsonb
WHERE lower(department) = 'tech' AND (allowed_portals IS NULL OR allowed_portals = '[]'::jsonb);

UPDATE public.users
SET allowed_portals = '["admin", "operations", "orders", "support", "tech", "marketing"]'::jsonb
WHERE lower(department) = 'management' AND (allowed_portals IS NULL OR allowed_portals = '[]'::jsonb);

-- 4. Create admin_update_user_privileges RPC
CREATE OR REPLACE FUNCTION public.admin_update_user_privileges(
  target_user_id UUID,
  new_role text,
  new_department text DEFAULT NULL,
  new_allowed_portals jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
  v_portals jsonb;
  v_clean_dept text;
  v_updated record;
BEGIN
  -- Check if caller is super_admin or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can update user privileges';
  END IF;

  v_clean_dept := NULLIF(trim(new_department), '');

  -- Resolve department_id
  IF v_clean_dept IS NOT NULL THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE lower(name) = lower(v_clean_dept) LIMIT 1;
    IF v_dept_id IS NULL THEN
      INSERT INTO public.departments (name, description)
      VALUES (lower(v_clean_dept), v_clean_dept || ' Department')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_dept_id;
    END IF;
  ELSE
    v_dept_id := NULL;
  END IF;

  -- Determine allowed_portals
  IF new_allowed_portals IS NOT NULL AND jsonb_typeof(new_allowed_portals) = 'array' AND jsonb_array_length(new_allowed_portals) > 0 THEN
    v_portals := new_allowed_portals;
  ELSIF v_clean_dept IS NOT NULL THEN
    CASE lower(v_clean_dept)
      WHEN 'operations' THEN v_portals := '["operations"]'::jsonb;
      WHEN 'orders' THEN v_portals := '["orders"]'::jsonb;
      WHEN 'support' THEN v_portals := '["support"]'::jsonb;
      WHEN 'tech' THEN v_portals := '["tech"]'::jsonb;
      WHEN 'marketing' THEN v_portals := '["marketing"]'::jsonb;
      WHEN 'management' THEN v_portals := '["admin", "operations", "orders", "support", "tech", "marketing"]'::jsonb;
      ELSE v_portals := jsonb_build_array(lower(v_clean_dept));
    END CASE;
  ELSE
    v_portals := '[]'::jsonb;
  END IF;

  -- If setting role back to customer, clear department and portals
  IF new_role = 'customer' THEN
    v_clean_dept := NULL;
    v_dept_id := NULL;
    v_portals := '[]'::jsonb;
  END IF;

  UPDATE public.users 
  SET 
    role = new_role::public.user_role,
    department = v_clean_dept,
    department_id = v_dept_id,
    allowed_portals = v_portals,
    updated_at = NOW()
  WHERE id = target_user_id
  RETURNING id, full_name, email, role::text, department, department_id, allowed_portals INTO v_updated;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_updated.id,
    'role', v_updated.role,
    'department', v_updated.department,
    'department_id', v_updated.department_id,
    'allowed_portals', v_updated.allowed_portals
  );
END;
$$;

-- 5. Backward compatibility wrapper
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id UUID, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_update_user_privileges(target_user_id, new_role, NULL, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_privileges(UUID, text, text, jsonb) TO authenticated;
