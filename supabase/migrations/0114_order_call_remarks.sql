-- =============================================================================
-- Migration: 0114_order_call_remarks.sql
-- Description: Collision-proof customer call remarks and follow-up tracking for
--              Orders, Deliveries, Returns, and RTO events.
-- =============================================================================

-- 1. Create table public.order_call_remarks
CREATE TABLE IF NOT EXISTS public.order_call_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  return_id uuid REFERENCES public.returns(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  staff_name text NOT NULL,
  department text NOT NULL DEFAULT 'orders',
  call_status text NOT NULL DEFAULT 'calling_in_progress'
    CHECK (call_status IN (
      'calling_in_progress',
      'connected_resolved',
      'customer_unreachable',
      'rescheduled',
      'rto_confirmed',
      'return_coordination_scheduled',
      'cancelled',
      'other'
    )),
  remark_text text NOT NULL,
  rescheduled_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for high-throughput concurrency checks
CREATE INDEX IF NOT EXISTS idx_order_call_remarks_order_id 
  ON public.order_call_remarks(order_id);

CREATE INDEX IF NOT EXISTS idx_order_call_remarks_return_id 
  ON public.order_call_remarks(return_id) 
  WHERE return_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_call_remarks_order_status 
  ON public.order_call_remarks(order_id, call_status);

CREATE INDEX IF NOT EXISTS idx_order_call_remarks_created 
  ON public.order_call_remarks(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.order_call_remarks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Authenticated Staff and Admin Access Only
DROP POLICY IF EXISTS "Staff and Admin can view order call remarks" ON public.order_call_remarks;
CREATE POLICY "Staff and Admin can view order call remarks" 
  ON public.order_call_remarks 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND lower(users.role::text) IN ('admin', 'super_admin', 'manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff and Admin can insert order call remarks" ON public.order_call_remarks;
CREATE POLICY "Staff and Admin can insert order call remarks" 
  ON public.order_call_remarks 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND lower(users.role::text) IN ('admin', 'super_admin', 'manager', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff and Admin can update order call remarks" ON public.order_call_remarks;
CREATE POLICY "Staff and Admin can update order call remarks" 
  ON public.order_call_remarks 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND lower(users.role::text) IN ('admin', 'super_admin', 'manager', 'staff')
    )
  );

-- 5. Helper RPC function for fast latest remark lookup (used by RuhChat AI Workers & Portal)
CREATE OR REPLACE FUNCTION public.get_order_latest_call_remark(p_order_id uuid)
RETURNS TABLE (
  remark_id uuid,
  order_id uuid,
  staff_id uuid,
  staff_name text,
  department text,
  call_status text,
  remark_text text,
  rescheduled_date timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id AS remark_id,
    order_id,
    staff_id,
    staff_name,
    department,
    call_status,
    remark_text,
    rescheduled_date,
    created_at
  FROM public.order_call_remarks
  WHERE order_call_remarks.order_id = p_order_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;
