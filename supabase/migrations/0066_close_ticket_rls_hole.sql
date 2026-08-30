-- Migration 0066: Close guest-ticket RLS hole + enforce own-ticket access
-- -----------------------------------------------------------------------------
-- Purpose: Fix privacy vulnerability where ANY authenticated user could SELECT
-- every ticket that had a guest_email (introduced by migration 0033's policy
-- "Customers and guests can view tickets"). Guest ticket access is handled
-- exclusively through service-role API routes that verify ticket identifier +
-- email, so the RLS clause `guest_email IS NOT NULL` is unnecessary and unsafe.
--
-- This migration is idempotent: safe to run even if 0064/0065 already applied
-- the same policy changes (in case the DB is in a partially-migrated state).
-- ============================================================================

-- ============================================================================
-- 1. SUPPORT TICKETS — SELECT
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
-- 2. SUPPORT TICKET MESSAGES — SELECT (customer-visible only, own tickets)
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
-- 3. SUPPORT TICKET MESSAGES — INSERT
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
-- 5. GUEST ACCESS IS HANDLED ENTIRELY BY THE SERVICE-ROLE STATUS API
-- ----------------------------------------------------------------------------
-- The `/api/support/tickets/status` route uses the service-role client (which
-- bypasses RLS) and verifies the ticket identifier + email before returning
-- ticket data. No RLS policy is needed to expose guest tickets, so no further
-- grants are required here.
-- ============================================================================
