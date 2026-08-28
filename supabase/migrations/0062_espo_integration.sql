-- Migration 0062: EspoCRM Integration — Sync Columns
-- Adds tracking columns to support_tickets for the EspoCRM bidirectional sync.
-- EspoCRM runs on the VPS (crm.support.ruhvi.in) as the agent console.
-- Supabase remains the source of truth for customers/orders/wallet.

-- 1. Add sync tracking columns to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS espo_case_id        text,
  ADD COLUMN IF NOT EXISTS espo_synced_at       timestamptz,
  ADD COLUMN IF NOT EXISTS espo_last_sync_error text;

-- Index for fast EspoCRM → Supabase lookup (inbound webhook matching)
CREATE INDEX IF NOT EXISTS idx_support_tickets_espo_case
  ON public.support_tickets(espo_case_id)
  WHERE espo_case_id IS NOT NULL;

-- 2. Sync log table (optional audit trail for integration events)
CREATE TABLE IF NOT EXISTS public.espo_sync_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction   text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  entity_type text NOT NULL DEFAULT 'ticket',
  entity_id   uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  espo_case_id text,
  action      text NOT NULL,
  status      text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'skipped')),
  payload     jsonb,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_espo_sync_log_ticket
  ON public.espo_sync_log(entity_id, created_at DESC);

ALTER TABLE public.espo_sync_log ENABLE ROW LEVEL SECURITY;

-- Staff can view sync logs (advisory; service-role code bypasses RLS)
DROP POLICY IF EXISTS "Staff can view espo sync logs" ON public.espo_sync_log;
CREATE POLICY "Staff can view espo sync logs"
  ON public.espo_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

-- 3. RPC: get customer context for EspoCRM integration
CREATE OR REPLACE FUNCTION public.get_customer_context(
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'customer', (
      SELECT jsonb_build_object(
        'id', id, 'full_name', full_name, 'email', email,
        'phone', phone, 'created_at', created_at,
        'wallet_balance', wallet_balance, 'reward_coins', reward_coins
      )
      FROM public.users WHERE id = p_customer_id
    ),
    'recent_orders', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', o.id, 'order_number', o.order_number, 'status', o.status,
          'total', o.total, 'payment_status', o.payment_status,
          'payment_method', o.payment_method, 'created_at', o.created_at,
          'awb_code', o.awb_code, 'courier_name', o.courier_name
        ) ORDER BY o.created_at DESC
      ), '[]'::jsonb)
      FROM public.orders o
      WHERE o.user_id = p_customer_id
      LIMIT 10
    ),
    'recent_tickets', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', t.id, 'ticket_number', t.ticket_number, 'title', t.title,
          'status', t.status, 'priority', t.priority, 'created_at', t.created_at
        ) ORDER BY t.created_at DESC
      ), '[]'::jsonb)
      FROM public.support_tickets t
      WHERE t.customer_id = p_customer_id
      LIMIT 10
    )
  ) INTO result;

  RETURN result;
END;
$$;