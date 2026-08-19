-- Migration 0039_internal_portal_architecture.sql

-- 1. Create Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed basic departments
INSERT INTO public.departments (name, description) VALUES
  ('operations', 'Products, inventory, CMS, website operations'),
  ('orders', 'Orders, shipping, delivery, returns, RTO'),
  ('support', 'Customer support, tickets, lookup'),
  ('finance', 'Payments, refunds, finance reporting'),
  ('marketing', 'Campaigns, coupons, promotions, ads'),
  ('inventory', 'Warehouses, stock adjustment, transfers'),
  ('management', 'Global administration')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Roles Table (replacing/augmenting the simple ENUM)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed basic roles
INSERT INTO public.roles (name, display_name, description) VALUES
  ('SUPER_ADMIN', 'Super Admin', 'Global access across all portals and settings'),
  ('ADMIN', 'Admin', 'Administrative access'),
  ('MANAGER', 'Manager', 'Department manager'),
  ('STAFF', 'Staff', 'General staff access')
ON CONFLICT (name) DO NOTHING;

-- 3. Create Role Permissions Table (Phase 7 - Permission System)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission)
);

-- 4. Alter Users Table
-- Add new employee/internal user fields
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employee_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'disabled', 'suspended')),
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allowed_portals jsonb DEFAULT '[]'::jsonb;

-- Update the existing user_role ENUM to include 'super_admin' if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin') THEN
    ALTER TYPE user_role ADD VALUE 'super_admin';
  END IF;
END$$;
