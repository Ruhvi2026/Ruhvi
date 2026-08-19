-- Migration 0040_seed_role_permissions.sql

-- 1. Insert specialized roles
INSERT INTO public.roles (name, display_name, description, department_id) VALUES
  ('operations_manager', 'Operations Manager', 'Manager for operations department', (SELECT id FROM public.departments WHERE name = 'operations')),
  ('orders_manager', 'Orders Manager', 'Manager for orders department', (SELECT id FROM public.departments WHERE name = 'orders')),
  ('support_manager', 'Support Manager', 'Manager for support department', (SELECT id FROM public.departments WHERE name = 'support')),
  ('inventory_manager', 'Inventory Manager', 'Manager for inventory', (SELECT id FROM public.departments WHERE name = 'inventory')),
  ('marketing_manager', 'Marketing Manager', 'Manager for marketing', (SELECT id FROM public.departments WHERE name = 'marketing')),
  ('finance_manager', 'Finance Manager', 'Manager for finance', (SELECT id FROM public.departments WHERE name = 'finance')),
  ('operations_staff', 'Operations Staff', 'Staff for operations', (SELECT id FROM public.departments WHERE name = 'operations')),
  ('orders_staff', 'Orders Staff', 'Staff for orders', (SELECT id FROM public.departments WHERE name = 'orders')),
  ('support_staff', 'Support Staff', 'Staff for support', (SELECT id FROM public.departments WHERE name = 'support')),
  ('inventory_staff', 'Inventory Staff', 'Staff for inventory', (SELECT id FROM public.departments WHERE name = 'inventory'))
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Permissions for Operations Manager
DO $$
DECLARE
  v_role_id uuid;
  p text;
  ops_manager_permissions text[] := ARRAY[
    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish',
    'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.receive', 'inventory.damage', 'inventory.export',
    'cms.view', 'cms.edit', 'cms.publish',
    'banner.view', 'banner.create', 'banner.edit', 'banner.delete', 'banner.publish',
    'hero.view', 'hero.edit', 'hero.publish',
    'coupons.view', 'coupons.create', 'coupons.edit',
    'campaigns.view', 'campaigns.create', 'campaigns.edit'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'operations_manager';
  
  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY ops_manager_permissions LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 3. Seed Permissions for Orders Manager
DO $$
DECLARE
  v_role_id uuid;
  p text;
  orders_manager_permissions text[] := ARRAY[
    'orders.view', 'orders.create', 'orders.edit', 'orders.cancel', 'orders.assign',
    'shipping.view', 'shipping.create_label', 'shipping.create_manifest', 'shipping.ship', 'shipping.track', 'shipping.courier_manage',
    'returns.view', 'returns.approve', 'returns.reject', 'returns.process',
    'exchange.view', 'exchange.approve', 'exchange.process',
    'refunds.view'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'orders_manager';
  
  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY orders_manager_permissions LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 4. Seed Permissions for Support Manager
DO $$
DECLARE
  v_role_id uuid;
  p text;
  support_manager_permissions text[] := ARRAY[
    'support.view', 'support.reply', 'support.assign', 'support.close', 'support.escalate',
    'customers.view', 'orders.view', 'returns.view'
  ];
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'support_manager';
  
  IF v_role_id IS NOT NULL THEN
    FOREACH p IN ARRAY support_manager_permissions LOOP
      INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, p) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 5. Seed wildcard '*' pseudo-permissions for SUPER_ADMIN
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission) VALUES (v_role_id, '*') ON CONFLICT DO NOTHING;
  END IF;
END $$;
