-- =============================================================================
-- Migration 0099: Task Manager ↔ Messenger Integration
-- =============================================================================

-- Add messenger_group_id to tasks table to link a task to a single chat conversation
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS messenger_group_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_messenger_group_id ON public.tasks(messenger_group_id);

-- Ensure one group cannot be used for multiple tasks.
-- (A task already has at most one group because it's a 1:1 column on the task row).
ALTER TABLE public.tasks 
ADD CONSTRAINT unique_task_messenger_group UNIQUE (messenger_group_id);
