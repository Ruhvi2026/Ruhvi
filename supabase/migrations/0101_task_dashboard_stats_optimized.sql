-- ============================================================================
-- Migration 0101: Task Manager Dashboard Aggregation RPC - Optimized
--
-- Optimizations:
-- 1. Replaced CROSS JOIN LATERAL with single GROUP BY aggregations for
--    department_workload and staff_workload to avoid N+1 subquery pattern
-- 2. Combined status/priority lookups into a single CTE
-- 3. Used CTEs to avoid repeated computations
-- 4. Added more targeted partial indexes for the hot query paths
-- ============================================================================

-- Additional partial indexes for dashboard query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_live_dept_status_due
  ON public.tasks (department_id, status_id, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_live_assignee_status_due
  ON public.tasks (assignee_id, status_id, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_live_creator_status_due
  ON public.tasks (created_by, status_id, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_live_priority_status
  ON public.tasks (priority_id, status_id)
  WHERE deleted_at IS NULL;

-- Index for unassigned tasks
CREATE INDEX IF NOT EXISTS idx_tasks_live_unassigned
  ON public.tasks (department_id, status_id)
  WHERE deleted_at IS NULL AND assignee_id IS NULL;

-- Index for task_assignments and task_spectators (used in staff view)
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_active
  ON public.task_assignments (user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_task_spectators_user
  ON public.task_spectators (user_id);

-- ============================================================================
-- Optimized RPC function using single-pass aggregations
-- ============================================================================
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
  -- Resolve all status/priority IDs in a single query using CTE
  WITH status_priority AS (
    SELECT
      (SELECT s.id FROM public.task_statuses s WHERE s.name = 'Open') AS open_id,
      (SELECT s.id FROM public.task_statuses s WHERE s.name = 'In Progress') AS progress_id,
      COALESCE(
        (SELECT array_agg(s.id) FROM public.task_statuses s
         WHERE s.name IN ('Open', 'In Progress', 'Blocked')),
        '{}'::uuid[]
      ) AS active_ids,
      COALESCE(
        (SELECT array_agg(s.id) FROM public.task_statuses s
         WHERE s.name IN ('Completed', 'Closed')),
        '{}'::uuid[]
      ) AS done_ids,
      COALESCE(
        (SELECT array_agg(p.id) FROM public.task_priorities p
         WHERE p.name IN ('High', 'Important', 'Immediate')),
        '{}'::uuid[]
      ) AS urgent_ids
  )
  SELECT open_id, progress_id, active_ids, done_ids, urgent_ids
  INTO v_open_id, v_progress_id, v_active, v_done, v_urgent
  FROM status_priority;

  -- Scope: NULL department means org-wide (admin).
  -- Single aggregation for all totals using FILTER clauses
  SELECT jsonb_build_object(
    'total',            count(t.id),
    'open',             count(t.id) FILTER (WHERE t.status_id = v_open_id),
    'in_progress',      count(t.id) FILTER (WHERE t.status_id = v_progress_id),
    'completed',        count(t.id) FILTER (WHERE t.status_id = ANY (v_done)),
    'overdue',          count(t.id) FILTER (
                          WHERE t.due_date < v_today
                            AND NOT (t.status_id = ANY (v_done))
                        ),
    'sla_breached',     count(t.id) FILTER (
                          WHERE t.due_date < v_today
                            AND t.status_id = ANY (v_active)
                        ),
    'completed_today',  count(t.id) FILTER (
                          WHERE t.due_date = v_today
                            AND t.status_id = ANY (v_done)
                        ),
    'unassigned',       count(t.id) FILTER (WHERE t.assignee_id IS NULL),
    'high_priority',    count(t.id) FILTER (WHERE t.priority_id = ANY (v_urgent))
  )
  INTO v_totals
  FROM public.tasks t
  WHERE t.deleted_at IS NULL
    AND (p_department_id IS NULL OR t.department_id = p_department_id);

  -- Admin-only workload breakdowns: use single GROUP BY instead of CROSS JOIN LATERAL
  IF p_department_id IS NULL THEN
    -- Department workload: single aggregation grouped by department
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', d.name,
          'total', d.total,
          'open', d.open,
          'overdue', d.overdue
        ) ORDER BY d.name
      ),
      '[]'::jsonb
    )
    INTO v_department
    FROM (
      SELECT
        dep.name,
        count(t.id) AS total,
        count(t.id) FILTER (WHERE t.status_id = v_open_id) AS open,
        count(t.id) FILTER (
          WHERE t.due_date < v_today AND t.status_id = ANY (v_active)
        ) AS overdue
      FROM public.departments dep
      LEFT JOIN public.tasks t
        ON t.department_id = dep.id
        AND t.deleted_at IS NULL
      GROUP BY dep.id, dep.name
    ) d;

    -- Staff workload: single aggregation grouped by user
    -- Only include staff with active tasks to reduce result size
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', u.name,
          'total', u.total,
          'open', u.open,
          'overdue', u.overdue
        ) ORDER BY u.name
      ),
      '[]'::jsonb
    )
    INTO v_staff
    FROM (
      SELECT
        coalesce(nullif(trim(u.full_name), ''), u.id::text) AS name,
        count(DISTINCT t.id) AS total,
        count(DISTINCT t.id) FILTER (WHERE t.status_id = v_open_id) AS open,
        count(DISTINCT t.id) FILTER (
          WHERE t.due_date < v_today AND t.status_id = ANY (v_active)
        ) AS overdue
      FROM public.users u
      LEFT JOIN public.tasks t
        ON (t.assignee_id = u.id OR t.created_by = u.id)
        AND t.deleted_at IS NULL
      WHERE u.role <> 'customer'
        AND u.account_status = 'active'
      GROUP BY u.id, u.full_name
      HAVING count(DISTINCT t.id) > 0
    ) u;
  END IF;

  -- Staff-specific view: user-scoped aggregations
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
                            AND a.status = 'active'
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
    'totals',              coalesce(v_totals, '{}'::jsonb),
    'department_workload', coalesce(v_department, '[]'::jsonb),
    'staff_workload',      coalesce(v_staff, '[]'::jsonb),
    'mine',                coalesce(v_mine, '{}'::jsonb)
  );
END;
$$;

-- Permissions remain the same: service_role only
REVOKE ALL ON FUNCTION public.get_task_dashboard_stats(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_task_dashboard_stats(uuid, uuid) TO service_role;