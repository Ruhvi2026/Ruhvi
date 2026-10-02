-- =============================================================================
-- Migration 0107: Task Manager Scheduled Recurrences & Reminders
-- =============================================================================

-- 1. Extend task_recurrences table with automation schedule configuration
ALTER TABLE public.task_recurrences 
  ADD COLUMN IF NOT EXISTS trigger_time time without time zone DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS due_time time without time zone,
  ADD COLUMN IF NOT EXISTS day_of_month integer,
  ADD COLUMN IF NOT EXISTS remind_overdue boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_run_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS next_run_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Extend tasks table with schedule metadata and reminder tracking
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS schedule_time time without time zone,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_auto_scheduled boolean DEFAULT false;

-- 3. Indexes for fast cron lookups
CREATE INDEX IF NOT EXISTS idx_task_recurrences_active ON public.task_recurrences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tasks_schedule_type ON public.tasks(schedule_type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_reminders ON public.tasks(due_date, due_time, reminder_sent_at) WHERE deleted_at IS NULL;
