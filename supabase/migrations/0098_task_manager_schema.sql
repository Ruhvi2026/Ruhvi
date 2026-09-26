-- =============================================================================
-- Migration 0098: Task Manager Database Schema
-- =============================================================================

-- 1. Task Priorities
CREATE TABLE IF NOT EXISTS public.task_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  level integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.task_priorities (name, level, color) VALUES
  ('Low', 1, '#6b7280'),
  ('Normal', 2, '#3b82f6'),
  ('High', 3, '#f59e0b'),
  ('Important', 4, '#ef4444'),
  ('Immediate', 5, '#e11d48')
ON CONFLICT (name) DO NOTHING;

-- 2. Task Statuses
CREATE TABLE IF NOT EXISTS public.task_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.task_statuses (name, description, display_order, color) VALUES
  ('Open', 'Task is open and not started', 1, '#6b7280'),
  ('In Progress', 'Task is currently being worked on', 2, '#3b82f6'),
  ('Blocked', 'Task is blocked by an issue', 3, '#ef4444'),
  ('Completed', 'Task work is done', 4, '#10b981'),
  ('Closed', 'Task is fully closed', 5, '#4b5563')
ON CONFLICT (name) DO NOTHING;

-- 3. Task Types
CREATE TABLE IF NOT EXISTS public.task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.task_types (name, icon) VALUES
  ('Order Issue', 'ShoppingCart'),
  ('Product Information', 'Package'),
  ('Customer Support', 'Headphones'),
  ('Technical Issue', 'Wrench'),
  ('Inventory', 'Warehouse'),
  ('Dispatch', 'Truck'),
  ('Approval', 'CheckCircle'),
  ('Internal Request', 'Mail'),
  ('Other', 'MoreHorizontal')
ON CONFLICT (name) DO NOTHING;

-- 4. Tasks (created before task_slas to avoid circular reference)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id_text text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  priority_id uuid NOT NULL REFERENCES public.task_priorities(id) ON DELETE RESTRICT,
  type_id uuid REFERENCES public.task_types(id) ON DELETE SET NULL,
  sla_id uuid,
  start_time timestamptz,
  expected_duration text,
  due_date date,
  due_time time,
  status_id uuid NOT NULL REFERENCES public.task_statuses(id) ON DELETE RESTRICT,
  related_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  related_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  related_ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  is_recurring boolean NOT NULL DEFAULT false,
  parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz
);

-- 5. Task SLA Configurations
CREATE TABLE IF NOT EXISTS public.task_slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  expected_duration_interval text NOT NULL DEFAULT '4 hours',
  default_duration text NOT NULL DEFAULT '4 hours',
  sla_level text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add SLA foreign key constraint to tasks table after task_slas exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_tasks_sla' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks 
      ADD CONSTRAINT fk_tasks_sla FOREIGN KEY (sla_id) REFERENCES public.task_slas(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_slas_task_id ON public.task_slas(task_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON public.tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_id ON public.tasks(priority_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_task_id_text ON public.tasks(task_id_text);

-- 6. Task Assignments
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);

-- 7. Task Spectators
CREATE TABLE IF NOT EXISTS public.task_spectators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_spectators_task_id ON public.task_spectators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_spectators_user_id ON public.task_spectators(user_id);

-- 8. Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_progress_update boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- 9. Task Attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  message_id uuid,
  cloudinary_public_id text NOT NULL,
  cloudinary_url text NOT NULL,
  resource_type text NOT NULL DEFAULT 'raw',
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  duration numeric,
  uploader_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploader_id ON public.task_attachments(uploader_id);

-- 10. Task Activity
CREATE TABLE IF NOT EXISTS public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_user_id ON public.task_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON public.task_activity(created_at);

-- 11. Task Checklists
CREATE TABLE IF NOT EXISTS public.task_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON public.task_checklists(task_id);

-- 12. Task Dependencies
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'blocked', 'ready')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

-- 13. Task Recurrences
CREATE TABLE IF NOT EXISTS public.task_recurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  recurrence_pattern text NOT NULL DEFAULT 'weekly',
  recurrence_interval integer NOT NULL DEFAULT 1,
  recurrence_days text[],
  recurrence_end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_recurrences_task_id ON public.task_recurrences(task_id);

-- 14. Enable RLS on all task tables
ALTER TABLE public.task_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_spectators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_recurrences ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies
DROP POLICY IF EXISTS "Staff can view task reference data" ON public.task_priorities;
CREATE POLICY "Staff can view task reference data"
  ON public.task_priorities FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can view task reference data" ON public.task_statuses;
CREATE POLICY "Staff can view task reference data"
  ON public.task_statuses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can view task reference data" ON public.task_types;
CREATE POLICY "Staff can view task reference data"
  ON public.task_types FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role full access on tasks" ON public.tasks;
CREATE POLICY "Service role full access on tasks"
  ON public.tasks FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_assignments" ON public.task_assignments;
CREATE POLICY "Service role full access on task_assignments"
  ON public.task_assignments FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_spectators" ON public.task_spectators;
CREATE POLICY "Service role full access on task_spectators"
  ON public.task_spectators FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_comments" ON public.task_comments;
CREATE POLICY "Service role full access on task_comments"
  ON public.task_comments FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_attachments" ON public.task_attachments;
CREATE POLICY "Service role full access on task_attachments"
  ON public.task_attachments FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_activity" ON public.task_activity;
CREATE POLICY "Service role full access on task_activity"
  ON public.task_activity FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_checklists" ON public.task_checklists;
CREATE POLICY "Service role full access on task_checklists"
  ON public.task_checklists FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_dependencies" ON public.task_dependencies;
CREATE POLICY "Service role full access on task_dependencies"
  ON public.task_dependencies FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_recurrences" ON public.task_recurrences;
CREATE POLICY "Service role full access on task_recurrences"
  ON public.task_recurrences FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on task_slas" ON public.task_slas;
CREATE POLICY "Service role full access on task_slas"
  ON public.task_slas FOR ALL
  USING (true)
  WITH CHECK (true);

-- 16. Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_task_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::text FROM public.users WHERE id = p_user_id LIMIT 1;
$$;
