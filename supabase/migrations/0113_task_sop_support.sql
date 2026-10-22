-- =============================================================================
-- Migration 0113: Task Manager SOP (Standard Operating Procedure) Support
-- =============================================================================
-- Adds optional sop_url column to tasks table for linking Standard Operating
-- Procedures, documentation, or guidelines to operational tasks.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'sop_url'
  ) THEN
    ALTER TABLE public.tasks
      ADD COLUMN sop_url text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_sop_url ON public.tasks(sop_url) WHERE sop_url IS NOT NULL;
