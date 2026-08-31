-- =============================================================================
-- 0075_super_admin_rls_and_productivity_config.sql
--
-- Super Admin Master Dashboard — Phase 1 Foundation
--
-- Safety contract:
--   * No DROP TABLE, no column renames, no enum value renames.
--   * No existing policies removed — only new named policies added.
--   * All ALTER ... ADD COLUMN IF NOT EXISTS.
--   * settings seeds use ON CONFLICT (key) DO UPDATE — fully idempotent.
--   * get_staff_productivity RPC is CREATE OR REPLACE — safe to re-run.
-- =============================================================================

-- ============================================================================
-- SECTION 1: orders.processed_by — track which staff member processed an order
-- Additive only. All existing rows remain with processed_by = NULL.
-- ============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS processed_by uuid
    REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_processed_by
  ON public.orders(processed_by)
  WHERE processed_by IS NOT NULL;

-- ============================================================================
-- SECTION 2: Super-admin RLS policies (all additive, no existing policy touched)
--
-- Note: Most admin reads in the codebase currently use SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS. These policies are for correctness, future-proofing, and
-- any client-side calls that use the anon key with the super_admin JWT.
-- The existing is_admin_or_staff() helper already includes 'super_admin' in its
-- role check, so most SELECT policies are already covered. We add explicit
-- super_admin policies only on tables that need WRITE access (settings) or
-- do not yet have an explicit super_admin grant.
-- ============================================================================

-- wallet_ledger — super_admin read for wallet liability calculation on dashboard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'wallet_ledger') THEN
    ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "super_admin can read wallet_ledger" ON public.wallet_ledger;
    CREATE POLICY "super_admin can read wallet_ledger"
      ON public.wallet_ledger
      FOR SELECT
      USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
      );
  END IF;
END $$;

-- inventory_movements — super_admin read (for cross-portal productivity data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'inventory_movements') THEN
    ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "super_admin can read inventory_movements" ON public.inventory_movements;
    CREATE POLICY "super_admin can read inventory_movements"
      ON public.inventory_movements
      FOR SELECT
      USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
      );
  END IF;
END $$;

-- settings — extend write access to super_admin (existing policy only covers 'admin' role string)
DROP POLICY IF EXISTS "super_admin can manage settings" ON public.settings;
CREATE POLICY "super_admin can manage settings"
  ON public.settings
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- ============================================================================
-- SECTION 3: Productivity config seed
-- Uses the existing settings table (key/value jsonb pattern).
-- ON CONFLICT DO UPDATE makes this fully idempotent.
-- All thresholds are intentionally conservative defaults — the managing
-- director can adjust them via the admin UI without a deploy.
-- ============================================================================
INSERT INTO public.settings (key, value) VALUES (
  'super_admin_productivity_config',
  '{
    "negligence_threshold_days": 3,
    "designation_kpis": {
      "super_admin": {
        "min_orders": 0,
        "min_tickets": 0,
        "max_response_hours": 0,
        "min_activity_actions": 0,
        "min_inventory_movements": 0
      },
      "admin": {
        "min_orders": 10,
        "min_tickets": 20,
        "max_response_hours": 4,
        "min_activity_actions": 50,
        "min_inventory_movements": 0
      },
      "manager": {
        "min_orders": 5,
        "min_tickets": 15,
        "max_response_hours": 8,
        "min_activity_actions": 30,
        "min_inventory_movements": 0
      },
      "staff": {
        "min_orders": 3,
        "min_tickets": 10,
        "max_response_hours": 24,
        "min_activity_actions": 15,
        "min_inventory_movements": 0
      },
      "operations_manager": {
        "min_orders": 20,
        "min_tickets": 5,
        "max_response_hours": 12,
        "min_activity_actions": 40,
        "min_inventory_movements": 10
      },
      "orders_manager": {
        "min_orders": 30,
        "min_tickets": 5,
        "max_response_hours": 8,
        "min_activity_actions": 40,
        "min_inventory_movements": 0
      },
      "support_manager": {
        "min_orders": 0,
        "min_tickets": 30,
        "max_response_hours": 4,
        "min_activity_actions": 50,
        "min_inventory_movements": 0
      },
      "operations_staff": {
        "min_orders": 10,
        "min_tickets": 3,
        "max_response_hours": 24,
        "min_activity_actions": 20,
        "min_inventory_movements": 5
      },
      "orders_staff": {
        "min_orders": 20,
        "min_tickets": 3,
        "max_response_hours": 24,
        "min_activity_actions": 20,
        "min_inventory_movements": 0
      },
      "support_staff": {
        "min_orders": 0,
        "min_tickets": 15,
        "max_response_hours": 8,
        "min_activity_actions": 30,
        "min_inventory_movements": 0
      }
    }
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = now();

-- ============================================================================
-- SECTION 4: get_staff_productivity RPC
--
-- Aggregates all per-staff productivity metrics in a single query.
-- Security: SECURITY DEFINER with explicit search_path prevents privilege
-- escalation. Callable by any authenticated user — the API route enforces
-- super_admin role check before calling it.
--
-- Data sources:
--   orders.processed_by         → orders handled by this staff member
--   support_tickets.assigned_to → ticket metrics (counts, response, resolution)
--   audit_logs.actor_id         → general activity volume
--   inventory_movements.created_by → operations-side activity
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_staff_productivity(
  p_from     timestamptz,
  p_to       timestamptz,
  p_staff_id uuid DEFAULT NULL  -- NULL = return all staff
)
RETURNS TABLE (
  staff_id                uuid,
  full_name               text,
  email                   text,
  role                    text,
  department_name         text,
  orders_handled          bigint,
  tickets_total           bigint,
  tickets_closed          bigint,
  tickets_overdue         bigint,
  tickets_open            bigint,
  avg_first_response_hrs  numeric,
  avg_resolution_hrs      numeric,
  activity_actions        bigint,
  inventory_movements     bigint,
  last_active_at          timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id                                                              AS staff_id,
    COALESCE(u.full_name, u.email, 'Unknown')                        AS full_name,
    u.email,
    u.role::text,
    COALESCE(d.name, 'unassigned')                                   AS department_name,

    -- Orders this staff member processed in the date range
    COUNT(DISTINCT o.id)                                             AS orders_handled,

    -- Support ticket counts
    COUNT(DISTINCT st.id)                                            AS tickets_total,
    COUNT(DISTINCT st.id) FILTER (
      WHERE st.status IN ('resolved', 'closed')
    )                                                                AS tickets_closed,
    COUNT(DISTINCT st.id) FILTER (
      WHERE st.sla_due_at < now()
        AND st.status NOT IN ('resolved', 'closed', 'rejected', 'duplicate')
    )                                                                AS tickets_overdue,
    COUNT(DISTINCT st.id) FILTER (
      WHERE st.status NOT IN ('resolved', 'closed', 'rejected', 'duplicate')
    )                                                                AS tickets_open,

    -- Response and resolution times (in hours, rounded to 1 decimal)
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (st.first_response_at - st.created_at)) / 3600.0
      ) FILTER (WHERE st.first_response_at IS NOT NULL),
      1
    )                                                                AS avg_first_response_hrs,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (st.resolved_at - st.created_at)) / 3600.0
      ) FILTER (WHERE st.resolved_at IS NOT NULL),
      1
    )                                                                AS avg_resolution_hrs,

    -- Activity volume from audit logs
    COUNT(DISTINCT al.id)                                            AS activity_actions,

    -- Operations-specific: inventory movements
    COUNT(DISTINCT im.id)                                            AS inventory_movements,

    -- Most recent action across all activity tables (for negligence flag)
    GREATEST(
      MAX(o.updated_at),
      MAX(st.updated_at),
      MAX(al.created_at),
      MAX(im.created_at)
    )                                                                AS last_active_at

  FROM public.users u
  LEFT JOIN public.departments d
    ON d.id = u.department_id
  LEFT JOIN public.orders o
    ON o.processed_by = u.id
    AND o.created_at >= p_from
    AND o.created_at <= p_to
  LEFT JOIN public.support_tickets st
    ON st.assigned_to = u.id
    AND st.created_at >= p_from
    AND st.created_at <= p_to
  LEFT JOIN public.audit_logs al
    ON al.actor_id = u.id
    AND al.created_at >= p_from
    AND al.created_at <= p_to
  LEFT JOIN public.inventory_movements im
    ON im.created_by = u.id
    AND im.created_at >= p_from
    AND im.created_at <= p_to

  WHERE u.role::text NOT IN ('customer', 'guest')
    AND (p_staff_id IS NULL OR u.id = p_staff_id)

  GROUP BY u.id, u.full_name, u.email, u.role, d.name
  ORDER BY u.full_name ASC;
$$;

-- Grant execute to authenticated users (API layer enforces super_admin check)
REVOKE ALL ON FUNCTION public.get_staff_productivity(timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_productivity(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_productivity(timestamptz, timestamptz, uuid) TO service_role;
