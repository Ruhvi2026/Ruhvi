-- Migration 0082: Customer Notification Center Foundation
-- Adds structured metadata to the existing notifications table for categorical filtering and deep linking.

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
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_category ON public.notifications(user_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);

-- Enable RLS and add basic policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications (read status)" ON public.notifications;
CREATE POLICY "Users can update their own notifications (read status)"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
