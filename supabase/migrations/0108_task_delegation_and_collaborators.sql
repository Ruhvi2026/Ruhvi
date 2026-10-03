-- =============================================================================
-- Migration 0108: Task Delegation & Collaborators
-- =============================================================================
-- Feature 1: Track assignment source (department vs direct_user)
-- Feature 2: task_collaborators table for multi-user collaboration

-- 1. Add assigned_type column to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'assigned_type'
  ) THEN
    ALTER TABLE public.tasks
      ADD COLUMN assigned_type text NOT NULL DEFAULT 'direct_user'
      CHECK (assigned_type IN ('department', 'direct_user'));
  END IF;
END $$;

-- Back-fill: mark existing department-routed tasks correctly.
UPDATE public.tasks t
SET    assigned_type = 'department'
WHERE  t.department_id IS NOT NULL
  AND  t.assigned_type = 'direct_user'
  AND  EXISTS (
         SELECT 1 FROM public.users u
         WHERE  u.id            = t.assignee_id
           AND  u.department_id = t.department_id
           AND  u.role          = 'manager'
       );

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_type ON public.tasks(assigned_type);

-- 2. task_collaborators mapping table
CREATE TABLE IF NOT EXISTS public.task_collaborators (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES public.tasks(id)  ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  added_by    uuid        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_collaborators_task_id ON public.task_collaborators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_user_id ON public.task_collaborators(user_id);

-- 3. Enable RLS on task_collaborators
ALTER TABLE public.task_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on task_collaborators" ON public.task_collaborators;
CREATE POLICY "Service role full access on task_collaborators"
  ON public.task_collaborators FOR ALL
  USING (true)
  WITH CHECK (true);