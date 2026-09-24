-- Migration 0082: Customer Notification Center Foundation
-- Adds structured metadata to the existing notifications table for categorical filtering and deep linking.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ORDERS',
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_category ON public.notifications(user_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);
