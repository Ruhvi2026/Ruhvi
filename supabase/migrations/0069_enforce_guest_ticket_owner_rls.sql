-- Migration 0069: Enforce guest-ticket owner-only visibility (idempotent)
-- -----------------------------------------------------------------------------
-- Closes the privacy hole where ANY authenticated user could see guest tickets
-- (introduced by migration 0033's `guest_email IS NOT NULL` clause), and links
-- orphaned guest tickets to their matching user accounts.
-- Idempotent: safe to run regardless of whether 0066/0067 were applied.
-- ============================================================================

-- ============================================================================
-- 1. SUPPORT TICKETS — SELECT: owner or staff only
-- ============================================================================
DROP POLICY IF EXISTS "Customers and guests can view tickets"
  ON public.support_tickets;

DROP POLICY IF EXISTS "Customers can view own tickets"
  ON public.support_tickets;

CREATE POLICY "Customers can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
    )
  );

-- ============================================================================
-- 2. SUPPORT TICKET MESSAGES — SELECT: customer-visible, own tickets only
-- ============================================================================
DROP POLICY IF EXISTS "Customers and guests can view messages on own tickets"
  ON public.support_ticket_messages;

DROP POLICY IF EXISTS "Customers can view visible messages on own tickets"
  ON public.support_ticket_messages;

CREATE POLICY "Customers can view visible messages on own tickets"
  ON public.support_ticket_messages FOR SELECT
  USING (
    (visibility = 'customer' AND EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.customer_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
    )
  );

-- ============================================================================
-- 3. SUPPORT TICKET MESSAGES — INSERT: own tickets, customer or ai role
-- ============================================================================
DROP POLICY IF EXISTS "Customers and guests can add messages to own tickets"
  ON public.support_ticket_messages;

DROP POLICY IF EXISTS "Customers can add messages to own tickets"
  ON public.support_ticket_messages;

CREATE POLICY "Customers can add messages to own tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    (sender_type IN ('customer', 'ai') AND visibility = 'customer' AND EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.customer_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
    )
  );

-- ============================================================================
-- 4. SUPPORT TICKET ATTACHMENTS — SELECT / INSERT follow ticket access
-- ============================================================================
DROP POLICY IF EXISTS "Users can view attachments on accessible tickets"
  ON public.support_ticket_attachments;

CREATE POLICY "Users can view attachments on accessible tickets"
  ON public.support_ticket_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_attachments.ticket_id
      AND (support_tickets.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
        ))
    )
  );

DROP POLICY IF EXISTS "Users can add attachments to accessible tickets"
  ON public.support_ticket_attachments;

CREATE POLICY "Users can add attachments to accessible tickets"
  ON public.support_ticket_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_attachments.ticket_id
      AND (support_tickets.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
        ))
    )
  );

-- ============================================================================
-- 5. LINK orphaned guest tickets to existing user accounts (idempotent)
-- ----------------------------------------------------------------------------
-- If a ticket has a guest_email that belongs to a registered user, map it to
-- that user so it appears in their "My Tickets" list.
-- ============================================================================
UPDATE public.support_tickets st
SET
  customer_id = u.id,
  customer_email = u.email,
  guest_email = NULL,
  guest_name = NULL
FROM public.users u
WHERE st.customer_id IS NULL
  AND st.guest_email IS NOT NULL
  AND lower(st.guest_email) = lower(u.email);