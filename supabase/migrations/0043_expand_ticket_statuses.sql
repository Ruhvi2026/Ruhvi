-- Migration 0043: Expand Ticket Statuses & Support Attachments for Guests
-- Alter status check constraint on support_tickets and drop NOT NULL on support_attachments.uploaded_by

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check 
  CHECK (status IN ('new', 'open', 'in_progress', 'waiting_for_customer', 'waiting_for_team', 'resolved', 'closed', 'reopened'));

ALTER TABLE public.support_attachments ALTER COLUMN uploaded_by DROP NOT NULL;
