-- Migration 0067: Link orphaned guest tickets to existing user accounts
-- ============================================================================
-- If a ticket was created with a guest_email that belongs to an existing user,
-- we map the ticket to their user ID so it appears in their "My Tickets".
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
