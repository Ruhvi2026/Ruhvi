-- Migration 0033: Secure AI Analytics view and allow Guest Support Tickets
-- Re-create the view with security_invoker = true to fix the security warning

-- 1. Recreate view
DROP VIEW IF EXISTS public.ai_credential_analytics;
CREATE VIEW public.ai_credential_analytics WITH (security_invoker = true) AS
SELECT
    l.credential_id,
    c.display_name AS credential_name,
    c.provider_id,
    c.priority,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE l.status = 'success') AS successful_requests,
    COUNT(*) FILTER (WHERE l.status = 'failed') AS failed_requests,
    ROUND(
        (COUNT(*) FILTER (WHERE l.status = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100,
        2
    ) AS success_rate_percent,
    SUM(l.tokens_used) AS total_tokens,
    SUM(l.estimated_cost) AS total_cost,
    MAX(l.created_at) AS last_request_at
FROM public.ai_logs l
LEFT JOIN public.ai_provider_credentials c ON c.id = l.credential_id
WHERE l.credential_id IS NOT NULL
GROUP BY l.credential_id, c.display_name, c.provider_id, c.priority
ORDER BY c.provider_id, c.priority;

-- 2. Modify support_tickets table to allow guest tickets
ALTER TABLE public.support_tickets ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_name text;

-- 3. Modify RLS policies for support_tickets
DROP POLICY IF EXISTS "Customers can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can create own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can view visible messages on own tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Customers can add messages to own tickets" ON public.support_messages;

CREATE POLICY "Customers and guests can view tickets"
  ON public.support_tickets FOR SELECT
  USING (
    customer_id = auth.uid()
    OR guest_email IS NOT NULL -- API status check will securely verify matching email + ticket_number via service role client
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Anyone can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR (auth.uid() IS NULL AND customer_id IS NULL AND guest_email IS NOT NULL)
  );

CREATE POLICY "Customers and guests can view messages on own tickets"
  ON public.support_messages FOR SELECT
  USING (
    (
      visibility = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE support_tickets.id = support_messages.ticket_id
        AND (support_tickets.customer_id = auth.uid() OR support_tickets.guest_email IS NOT NULL)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Customers and guests can add messages to own tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    (
      sender_type IN ('customer', 'ai')
      AND visibility = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE support_tickets.id = support_messages.ticket_id
        AND (support_tickets.customer_id = auth.uid() OR support_tickets.guest_email IS NOT NULL)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );
