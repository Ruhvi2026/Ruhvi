-- Migration 0048_seed_marketing_rbac.sql

-- Seed the missing `promotions.*` and `marketing.*` permissions required by
-- the marketing API routes, and seed base role permissions so legacy users
-- (role = admin/manager/staff without a role_id) are not locked out by
-- hasPermission().

-- 1. Marketing Manager: add promotions + marketing permissions
--    (coupons.* and campaigns.* were already seeded in 0040)
DO $$
DECLARE
  v_role_id uuid;
  p text;
  perms text[] := ARRAY[
    'promotions.view', 'promotions.create', 'promotions.edit',
    'marketing.view', 'marketing.edit'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'marketing_manager';

  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY perms LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 2. Operations Manager: add promotions + marketing permissions
--    (coupons.* and campaigns.* were already seeded in 0040)
DO $$
DECLARE
  v_role_id uuid;
  p text;
  perms text[] := ARRAY[
    'promotions.view', 'promotions.create', 'promotions.edit',
    'marketing.view', 'marketing.edit'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'operations_manager';

  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY perms LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 3. Base ADMIN: full access
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'ADMIN';

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, '*') ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 4. Base MANAGER: marketing module access
DO $$
DECLARE
  v_role_id uuid;
  p text;
  perms text[] := ARRAY[
    'promotions.view', 'promotions.create', 'promotions.edit',
    'coupons.view', 'coupons.create', 'coupons.edit',
    'campaigns.view', 'campaigns.create', 'campaigns.edit',
    'marketing.view', 'marketing.edit'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'MANAGER';

  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY perms LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 5. Base STAFF: view-only marketing access
DO $$
DECLARE
  v_role_id uuid;
  p text;
  perms text[] := ARRAY[
    'promotions.view',
    'coupons.view',
    'campaigns.view',
    'marketing.view'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'STAFF';

  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY perms LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
