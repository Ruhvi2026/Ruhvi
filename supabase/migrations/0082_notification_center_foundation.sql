-- Migration 0082: Customer & Internal Notification Center Foundation
-- Adds structured metadata to the existing notifications table for categorical filtering, 
-- deep linking, and cross-department communication (Support, Tech, Orders, Operations).

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ORDERS',
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS target_department text,
  ADD COLUMN IF NOT EXISTS actor_id uuid;

ALTER TABLE public.notifications
  ALTER COLUMN user_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'target_check' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications ADD CONSTRAINT target_check CHECK (user_id IS NOT NULL OR target_department IS NOT NULL);
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_category ON public.notifications(user_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_target_dept ON public.notifications(target_department);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);

-- Enable RLS and add basic policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    (target_department IS NOT NULL AND (auth.jwt() ->> 'role') IN ('admin', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Users can update their own notifications (read status)" ON public.notifications;
CREATE POLICY "Users can update their own notifications (read status)"
  ON public.notifications FOR UPDATE
  USING (
    auth.uid() = user_id
    OR 
    (target_department IS NOT NULL AND (auth.jwt() ->> 'role') IN ('admin', 'manager', 'staff'))
  );
