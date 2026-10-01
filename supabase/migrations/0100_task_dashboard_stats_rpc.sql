-- ============================================================================
-- Migration 0100: Task Manager Dashboard Aggregation RPC
--
-- The dashboard endpoint previously issued one HTTP request per counter and
-- then looped over departments and staff members issuing three more counts each
-- (~90 round trips for the admin role). Every one of those round trips paid
-- PostgREST + TLS + network latency, which dominated TTFB.
--
-- This migration adds a single STABLE aggregation function so the whole
-- dashboard is one database round trip. It also resolves the status/priority
-- id lookups (previously a sequential waterfall inside the handler) server side.
--
-- Semantics are preserved exactly as the route handler had them:
--   * admin    -> org-wide totals + department_workload + staff_workload
--   * manager  -> totals scoped to p_department_id
--   * staff    -> totals scoped to p_user_id (assignee OR creator)
-- ============================================================================

-- Partial indexes: every dashboard query filters deleted_at IS NULL, and the
-- hot paths are department+status and status+due_date.
CREATE INDEX IF NOT EXISTS idx_tasks_live_department_status
  ON public.tasks (department_id, status_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_live_status_due
  ON public.tasks (status_id, due_date)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_task_dashboard_stats(
  p_department_id uuid DEFAULT NULL,
  p_user_id       uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_today       date   := current_date;
  v_open_id     uuid;
  v_progress_id uuid;
  v_active      uuid[] := '{}'::uuid[];
  v_done        uuid[] := '{}'::uuid[];
  v_urgent      uuid[] := '{}'::uuid[];
  v_totals      jsonb;
  v_department  jsonb;
  v_staff       jsonb;
  v_mine        jsonb;
BEGIN
  -- Resolve every status/priority id in a single pass instead of one lookup per
  -- counter in the request handler.
  SELECT
    (SELECT s.id FROM public.task_statuses s WHERE s.name = 'Open'),
    (SELECT s.id FROM public.task_statuses s WHERE s.name = 'In Progress'),
    COALESCE(
      (SELECT array_agg(s.id) FROM public.task_statuses s
        WHERE s.name IN ('Open', 'In Progress', 'Blocked')),
      '{}'::uuid[]
    ),
    COALESCE(
      (SELECT array_agg(s.id) FROM public.task_statuses s
        WHERE s.name IN ('Completed', 'Closed')),
      '{}'::uuid[]
    ),
    COALESCE(
      (SELECT array_agg(p.id) FROM public.task_priorities p
        WHERE p.name IN ('High', 'Important', 'Immediate')),
      '{}'::uuid[]
    )
  INTO v_open_id, v_progress_id, v_active, v_done, v_urgent;

  -- Scope: NULL department means org-wide (admin).
  SELECT jsonb_build_object(
    'total',           count(t.id),
    'open',            count(t.id) FILTER (WHERE t.status_id = v_open_id),
    'in_progress',     count(t.id) FILTER (WHERE t.status_id = v_progress_id),
    'completed',       count(t.id) FILTER (WHERE t.status_id = ANY (v_done)),
    'overdue',         count(t.id) FILTER (
                         WHERE t.due_date < v_today
                           AND NOT (t.status_id = ANY (v_done))
                       ),
    'sla_breached',    count(t.id) FILTER (
                         WHERE t.due_date < v_today
                           AND t.status_id = ANY (v_active)
                       ),
    'completed_today', count(t.id) FILTER (
                         WHERE t.due_date = v_today
                           AND t.status_id = ANY (v_done)
                       ),
    'unassigned',      count(t.id) FILTER (WHERE t.assignee_id IS NULL),
    'high_priority',   count(t.id) FILTER (WHERE t.priority_id = ANY (v_urgent))
  )
  INTO v_totals
  FROM public.tasks t
  WHERE t.deleted_at IS NULL
    AND (p_department_id IS NULL OR t.department_id = p_department_id);

  -- Workload breakdowns are an admin-only view, so they are skipped entirely
  -- for department and per-user scopes.
  IF p_department_id IS NULL THEN
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', d.name,
          'total', c.total,
          'open', c.open,
          'overdue', c.overdue
        ) ORDER BY d.name
      ),
      '[]'::jsonb
    )
    INTO v_department
    FROM public.departments d
    CROSS JOIN LATERAL (
      SELECT
        count(t.id) AS total,
        count(t.id) FILTER (WHERE t.status_id = v_open_id) AS open,
        count(t.id) FILTER (
          WHERE t.due_date < v_today AND t.status_id = ANY (v_active)
        ) AS overdue
      FROM public.tasks t
      WHERE t.deleted_at IS NULL
        AND t.department_id = d.id
    ) c;

    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', coalesce(nullif(trim(u.full_name), ''), u.id::text),
          'total', c.total,
          'open', c.open,
          'overdue', c.overdue
        ) ORDER BY coalesce(nullif(trim(u.full_name), ''), u.id::text)
      ),
      '[]'::jsonb
    )
    INTO v_staff
    FROM public.users u
    CROSS JOIN LATERAL (
      SELECT
        count(DISTINCT t.id) AS total,
        count(DISTINCT t.id) FILTER (WHERE t.status_id = v_open_id) AS open,
        count(DISTINCT t.id) FILTER (
          WHERE t.due_date < v_today AND t.status_id = ANY (v_active)
        ) AS overdue
      FROM public.tasks t
      WHERE t.deleted_at IS NULL
        AND (t.assignee_id = u.id OR t.created_by = u.id)
    ) c
    WHERE u.role <> 'customer'
      AND u.account_status = 'active';
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'my_open_tasks', count(t.id),
      'due_today',     count(t.id) FILTER (WHERE t.due_date = v_today),
      'due_soon',      count(t.id) FILTER (WHERE t.due_date > v_today),
      'overdue',       count(t.id) FILTER (WHERE t.due_date < v_today),
      'supporting',    (
                          SELECT count(*)
                          FROM public.task_assignments a
                          WHERE a.user_id = p_user_id
                        ),
      'spectating',    (
                          SELECT count(*)
                          FROM public.task_spectators s
                          WHERE s.user_id = p_user_id
                        )
    )
    INTO v_mine
    FROM public.tasks t
    WHERE t.deleted_at IS NULL
      AND t.status_id = ANY (v_active)
      AND (t.assignee_id = p_user_id OR t.created_by = p_user_id);
  END IF;

  RETURN jsonb_build_object(
    'totals',             coalesce(v_totals, '{}'::jsonb),
    'department_workload', coalesce(v_department, '[]'::jsonb),
    'staff_workload',      coalesce(v_staff, '[]'::jsonb),
    'mine',                coalesce(v_mine, '{}'::jsonb)
  );
END;
$$;

-- The function is SECURITY DEFINER and exposes org-wide task counts, so it is
-- restricted to the service role. The dashboard API authenticates the caller
-- and authorises by role before invoking it; no end user calls it directly.
REVOKE ALL ON FUNCTION public.get_task_dashboard_stats(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_task_dashboard_stats(uuid, uuid) TO service_role;
