-- Migration 0004: Phase 3 Post-Purchase & Account (Notifications, Returns RLS & Policies)

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  type text NOT NULL DEFAULT 'order',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Extend returns table columns if not exists
ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS item_condition text DEFAULT 'tag_intact',
ADD COLUMN IF NOT EXISTS comments text;

-- RLS Policies for returns
CREATE POLICY "Users can view own return requests"
  ON public.returns FOR SELECT
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = returns.order_id AND orders.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Users can insert own return request"
  ON public.returns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = returns.order_id AND orders.user_id = auth.uid()
    )
  );
