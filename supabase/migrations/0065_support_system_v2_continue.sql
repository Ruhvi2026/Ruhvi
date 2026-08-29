-- Migration 0065: Support System V2 — continuation / idempotent repair
-- -----------------------------------------------------------------------------
-- The first 0064 attempt failed partway (invalid enum literal 'SUPER_ADMIN'
-- inside a policy). Everything BEFORE the failure already applied:
--   1. Table renames (support_ticket_messages / _attachments / _audit_log)
--   2. support_tickets new columns + backfill + index
--   3. status CHECK incl. rejected/duplicate
--   4. support_sla_config table + seed + ENABLE RLS (policies failed)
--
-- Everything AFTER the failure is in this file, rewritten idempotently so it can
-- be re-run safely. Uses the lowercase 'super_admin' enum value only.
-- ============================================================================

-- ============================================================================
-- 4 (cont). SUPPORT SLA CONFIG — policies + helper
-- ============================================================================
DROP POLICY IF EXISTS "Staff can view SLA config" ON public.support_sla_config;
CREATE POLICY "Staff can view SLA config"
  ON public.support_sla_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
  ));

DROP POLICY IF EXISTS "Admins can manage SLA config" ON public.support_sla_config;
CREATE POLICY "Admins can manage SLA config"
  ON public.support_sla_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
  ));

CREATE OR REPLACE FUNCTION public.support_sla_deadline(p_priority text, p_from timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT p_from + make_interval(hours => COALESCE(
    (SELECT target_hours FROM public.support_sla_config WHERE priority = p_priority),
    24
  ));
$$;

-- ============================================================================
-- 5. SUPPORT TICKET TAGS (spec 7.4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag_type text NOT NULL CHECK (tag_type IN ('person', 'team')),
  tagged_staff_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  tagged_team text CHECK (tagged_team IN ('operations', 'marketing', 'orders', 'admin')),
  tagged_by_staff_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (
    (tag_type = 'person' AND tagged_staff_id IS NOT NULL AND tagged_team IS NULL) OR
    (tag_type = 'team'   AND tagged_team IS NOT NULL AND tagged_staff_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_tags_ticket ON public.support_ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_tags_open ON public.support_ticket_tags(ticket_id)
  WHERE resolved_at IS NULL;

ALTER TABLE public.support_ticket_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view tags" ON public.support_ticket_tags;
CREATE POLICY "Staff can view tags"
  ON public.support_ticket_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
  ));

DROP POLICY IF EXISTS "Staff can manage tags" ON public.support_ticket_tags;
CREATE POLICY "Staff can manage tags"
  ON public.support_ticket_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
  ));

-- ============================================================================
-- 6. STAFF SYNC COLUMNS (spec Section 5)
-- ============================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS espo_user_id text,
  ADD COLUMN IF NOT EXISTS team text;

CREATE INDEX IF NOT EXISTS idx_users_espo_user ON public.users(espo_user_id) WHERE espo_user_id IS NOT NULL;

-- ============================================================================
-- 7. ATTACHMENTS — cloudinary tracking + visibility (spec 7.3)
-- ============================================================================
ALTER TABLE public.support_ticket_attachments
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'customer'
    CHECK (visibility IN ('customer', 'internal'));

CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_ticket
  ON public.support_ticket_attachments(ticket_id);

-- ============================================================================
-- 8. TRANSACTIONAL AUDIT RPCs (spec Section 9)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.support_update_ticket_state(
  p_ticket_id uuid,
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_type text DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur public.support_tickets%ROWTYPE;
  new_assigned_to uuid;
  has_assignment_change boolean := false;
  audit_rows jsonb := '[]'::jsonb;
  updated public.support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO cur FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket_not_found';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('new','open','in_progress','waiting_for_customer','waiting_for_team','resolved','closed','reopened','rejected','duplicate') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  IF p_priority IS NOT NULL AND p_priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'invalid_priority';
  END IF;

  new_assigned_to := COALESCE(p_assigned_to, cur.assigned_to);

  IF p_status IS NOT NULL AND p_status <> cur.status THEN
    audit_rows := audit_rows || jsonb_build_object(
      'action', 'status_changed',
      'old_value', jsonb_build_object('status', cur.status),
      'new_value', jsonb_build_object('status', p_status)
    );
    IF p_status = 'closed' AND cur.close_reason IS NULL THEN
      audit_rows := audit_rows || jsonb_build_object(
        'action', 'close_reason_set',
        'old_value', jsonb_build_object('close_reason', cur.close_reason),
        'new_value', jsonb_build_object('close_reason', 'closed_by_staff')
      );
    END IF;
  END IF;

  IF p_priority IS NOT NULL AND p_priority <> cur.priority THEN
    audit_rows := audit_rows || jsonb_build_object(
      'action', 'priority_changed',
      'old_value', jsonb_build_object('priority', cur.priority),
      'new_value', jsonb_build_object('priority', p_priority)
    );
  END IF;

  IF p_assigned_to IS NOT NULL AND p_assigned_to <> cur.assigned_to THEN
    has_assignment_change := true;
    audit_rows := audit_rows || jsonb_build_object(
      'action', 'assignment_changed',
      'old_value', jsonb_build_object('assigned_to', cur.assigned_to),
      'new_value', jsonb_build_object('assigned_to', p_assigned_to)
    );
  END IF;

  UPDATE public.support_tickets SET
    status = COALESCE(p_status, status),
    priority = COALESCE(p_priority, priority),
    assigned_to = new_assigned_to,
    close_reason = CASE
      WHEN p_status = 'closed' THEN COALESCE(close_reason, 'closed_by_staff')
      WHEN p_status IN ('resolved', 'reopened') AND p_status <> cur.status THEN NULL
      ELSE close_reason END,
    first_response_at = CASE
      WHEN p_status IS NOT NULL AND p_status <> 'new' AND cur.status = 'new'
        THEN COALESCE(first_response_at, now())
      ELSE first_response_at END,
    resolved_at = CASE WHEN p_status = 'resolved' THEN COALESCE(resolved_at, now()) ELSE resolved_at END,
    closed_at = CASE
      WHEN p_status = 'closed' THEN COALESCE(closed_at, now())
      WHEN p_status IN ('resolved', 'reopened') AND p_status <> cur.status THEN NULL
      ELSE closed_at END,
    pending_customer_reply_since = CASE
      WHEN p_status = 'waiting_for_customer' THEN COALESCE(pending_customer_reply_since, now())
      ELSE NULL END,
    auto_close_eligible_until = CASE
      WHEN p_status = 'closed' AND cur.status = 'waiting_for_customer'
        THEN COALESCE(auto_close_eligible_until, now() + interval '30 days')
      WHEN p_status IN ('resolved', 'reopened') AND p_status <> cur.status THEN NULL
      ELSE auto_close_eligible_until END,
    updated_at = now()
  WHERE id = p_ticket_id;

  IF has_assignment_change THEN
    UPDATE public.support_assignments SET unassigned_at = now()
      WHERE ticket_id = p_ticket_id AND unassigned_at IS NULL;
    IF new_assigned_to IS NOT NULL THEN
      INSERT INTO public.support_assignments (ticket_id, assigned_to, assigned_by, assigned_at)
      VALUES (p_ticket_id, new_assigned_to, p_actor_id, now());
    END IF;
  END IF;

  IF jsonb_array_length(audit_rows) > 0 THEN
    INSERT INTO public.support_ticket_audit_log (ticket_id, actor_id, actor_type, action, old_value, new_value, created_at)
    SELECT p_ticket_id, p_actor_id, p_actor_type, r->>'action', r->'old_value', r->'new_value', now()
    FROM jsonb_array_elements(audit_rows) r;
  END IF;

  SELECT * INTO updated FROM public.support_tickets WHERE id = p_ticket_id;
  RETURN jsonb_build_object(
    'id', updated.id,
    'ticket_number', updated.ticket_number,
    'status', updated.status,
    'priority', updated.priority,
    'assigned_to', updated.assigned_to,
    'close_reason', updated.close_reason,
    'closed_at', updated.closed_at,
    'auto_close_eligible_until', updated.auto_close_eligible_until,
    'audit_written', jsonb_array_length(audit_rows)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.support_add_ticket_message(
  p_ticket_id uuid,
  p_sender_type text,
  p_sender_id uuid,
  p_message text,
  p_visibility text DEFAULT 'customer',
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_actor_id uuid DEFAULT NULL,
  p_actor_type text DEFAULT 'customer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur public.support_tickets%ROWTYPE;
  msg_id uuid;
  status_change text := NULL;
  att RECORD;
BEGIN
  IF p_message IS NULL OR btrim(p_message) = '' THEN
    RAISE EXCEPTION 'message_required';
  END IF;
  IF p_visibility NOT IN ('customer', 'internal') THEN
    RAISE EXCEPTION 'invalid_visibility';
  END IF;

  SELECT * INTO cur FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket_not_found';
  END IF;

  INSERT INTO public.support_ticket_messages (ticket_id, sender_type, sender_id, message, visibility, created_at)
  VALUES (p_ticket_id, p_sender_type, p_sender_id, btrim(p_message), p_visibility, now())
  RETURNING id INTO msg_id;

  IF jsonb_typeof(p_attachments) = 'array' THEN
    FOR att IN SELECT * FROM jsonb_array_elements(p_attachments)
    LOOP
      INSERT INTO public.support_ticket_attachments (
        ticket_id, message_id, uploaded_by, file_name, file_type, file_size,
        storage_url, cloudinary_public_id, visibility, created_at
      )
      VALUES (
        p_ticket_id, msg_id, p_sender_id,
        att.value->>'file_name', att.value->>'file_type',
        COALESCE((att.value->>'file_size')::integer, 0),
        att.value->>'storage_url', att.value->>'cloudinary_public_id',
        p_visibility, now()
      );
    END LOOP;
  END IF;

  INSERT INTO public.support_ticket_audit_log (ticket_id, actor_id, actor_type, action, new_value, created_at)
  VALUES (
    p_ticket_id, COALESCE(p_actor_id, p_sender_id), COALESCE(p_actor_type, p_sender_type),
    CASE WHEN p_visibility = 'internal' THEN 'internal_note_added'
         ELSE p_sender_type || '_reply' END,
    jsonb_build_object('message_id', msg_id, 'visibility', p_visibility),
    now()
  );

  IF p_sender_type = 'staff' AND p_visibility = 'customer' AND cur.status = 'new' THEN
    status_change := 'open';
  ELSIF p_sender_type = 'customer' AND cur.status = 'waiting_for_customer' THEN
    status_change := 'open';
  END IF;

  IF status_change IS NOT NULL THEN
    UPDATE public.support_tickets SET
      status = status_change,
      first_response_at = COALESCE(first_response_at, now()),
      pending_customer_reply_since = NULL,
      updated_at = now()
    WHERE id = p_ticket_id;
  END IF;

  RETURN jsonb_build_object('id', msg_id, 'status_transitioned_to', status_change);
END;
$$;

-- ============================================================================
-- 9. CLOSE GUEST-TICKET RLS HOLE (migration 0033)
-- ============================================================================
DROP POLICY IF EXISTS "Customers and guests can view tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can view own tickets" ON public.support_tickets;
CREATE POLICY "Customers can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Customers and guests can view messages on own tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Customers can view visible messages on own tickets" ON public.support_ticket_messages;
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

DROP POLICY IF EXISTS "Customers and guests can add messages to own tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Customers can add messages to own tickets" ON public.support_ticket_messages;
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

DROP POLICY IF EXISTS "Users can view attachments on accessible tickets" ON public.support_ticket_attachments;
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

DROP POLICY IF EXISTS "Users can add attachments to accessible tickets" ON public.support_ticket_attachments;
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
-- 10. GRANTS (SECURITY DEFINER functions need explicit EXECUTE)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.support_update_ticket_state(uuid, text, text, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_add_ticket_message(uuid, text, uuid, text, text, jsonb, uuid, text) TO authenticated;
