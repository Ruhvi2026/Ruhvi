-- Migration 0032: AI-First Customer Support & Ticket System V1
-- Creates the complete support infrastructure: categories, tickets, messages,
-- attachments, assignments, and audit logs with RLS policies.

-- ============================================================================
-- 1. SUPPORT CATEGORIES (config-driven, hierarchical)
-- ============================================================================
CREATE TABLE public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  parent_id uuid REFERENCES public.support_categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. TICKET NUMBER SEQUENCE
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text AS $$
DECLARE
  seq_val bigint;
  year_str text;
BEGIN
  seq_val := nextval('support_ticket_seq');
  year_str := to_char(now(), 'YYYY');
  RETURN 'RUV-' || year_str || '-' || lpad(seq_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. SUPPORT TICKETS
-- ============================================================================
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT public.generate_ticket_number(),
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.support_categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.support_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  ai_summary text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')),
  source text NOT NULL DEFAULT 'ai_chat' CHECK (source IN ('ai_chat', 'manual', 'email')),
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  sla_due_at timestamptz DEFAULT (now() + interval '24 hours'),
  sla_breached boolean NOT NULL DEFAULT false,
  ai_created boolean NOT NULL DEFAULT false,
  ai_conversation_id text
);

-- Index for common queries
CREATE INDEX idx_support_tickets_customer ON public.support_tickets(customer_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_sla ON public.support_tickets(sla_due_at) WHERE sla_breached = false AND status NOT IN ('resolved', 'closed');
CREATE INDEX idx_support_tickets_order ON public.support_tickets(order_id) WHERE order_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_support_ticket_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_support_ticket_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_support_ticket_timestamp();

-- ============================================================================
-- 4. SUPPORT MESSAGES (conversation timeline)
-- ============================================================================
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'staff', 'system', 'ai')),
  sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer', 'internal')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);

-- ============================================================================
-- 5. SUPPORT ATTACHMENTS
-- ============================================================================
CREATE TABLE public.support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.support_messages(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  storage_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_attachments_ticket ON public.support_attachments(ticket_id);

-- ============================================================================
-- 6. SUPPORT ASSIGNMENTS (history)
-- ============================================================================
CREATE TABLE public.support_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz
);

CREATE INDEX idx_support_assignments_ticket ON public.support_assignments(ticket_id);

-- ============================================================================
-- 7. SUPPORT AUDIT LOGS
-- ============================================================================
CREATE TABLE public.support_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('customer', 'staff', 'system', 'ai')),
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_audit_ticket ON public.support_audit_logs(ticket_id, created_at);

-- ============================================================================
-- 8. ENABLE RLS
-- ============================================================================
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

-- Support Categories: readable by everyone
CREATE POLICY "Support categories are viewable by everyone"
  ON public.support_categories FOR SELECT USING (true);

CREATE POLICY "Only admins can manage support categories"
  ON public.support_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin')
    )
  );

-- Support Tickets: customers see own, staff/manager/admin see all
CREATE POLICY "Customers can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Customers can create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Staff can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

-- Support Messages: customers see customer-visible only, staff see all
CREATE POLICY "Customers can view visible messages on own tickets"
  ON public.support_messages FOR SELECT
  USING (
    (
      visibility = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE support_tickets.id = support_messages.ticket_id
        AND support_tickets.customer_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Customers can add messages to own tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    (
      sender_type = 'customer'
      AND visibility = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE support_tickets.id = support_messages.ticket_id
        AND support_tickets.customer_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

-- Support Attachments: follow ticket access
CREATE POLICY "Users can view attachments on accessible tickets"
  ON public.support_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_attachments.ticket_id
      AND (
        support_tickets.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
        )
      )
    )
  );

CREATE POLICY "Users can add attachments to accessible tickets"
  ON public.support_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_attachments.ticket_id
      AND (
        support_tickets.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
        )
      )
    )
  );

-- Support Assignments: staff only
CREATE POLICY "Staff can view assignments"
  ON public.support_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Staff can manage assignments"
  ON public.support_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

-- Support Audit Logs: staff only
CREATE POLICY "Staff can view audit logs"
  ON public.support_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON public.support_audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 10. SEED SUPPORT CATEGORIES
-- ============================================================================
INSERT INTO public.support_categories (name, slug, sort_order) VALUES
  ('Orders & Delivery', 'orders-delivery', 1),
  ('Product', 'product', 2),
  ('Warranty', 'warranty', 3),
  ('Return & Exchange', 'return-exchange', 4),
  ('Payments & Refunds', 'payments-refunds', 5),
  ('Account & Security', 'account-security', 6),
  ('Rewards & Promotions', 'rewards-promotions', 7),
  ('Technical', 'technical', 8),
  ('Other', 'other', 9);

-- Subcategories for Orders & Delivery
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Order issue', 'order-issue', 1),
  ('Delivery delay', 'delivery-delay', 2),
  ('Delivery failed', 'delivery-failed', 3),
  ('Wrong delivery status', 'wrong-delivery-status', 4),
  ('Wrong/missing item', 'wrong-missing-item', 5),
  ('Other order issue', 'other-order-issue', 6)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'orders-delivery') cat;

-- Subcategories for Product
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Damaged product', 'damaged-product', 1),
  ('Defective/product quality issue', 'defective-quality-issue', 2),
  ('Wrong product received', 'wrong-product-received', 3),
  ('Missing item', 'missing-item', 4),
  ('Product information', 'product-information', 5),
  ('Other product issue', 'other-product-issue', 6)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'product') cat;

-- Subcategories for Warranty
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Warranty claim', 'warranty-claim', 1),
  ('Warranty status', 'warranty-status', 2),
  ('Warranty eligibility', 'warranty-eligibility', 3),
  ('Other warranty issue', 'other-warranty-issue', 4)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'warranty') cat;

-- Subcategories for Return & Exchange
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Return request', 'return-request', 1),
  ('Exchange request', 'exchange-request', 2),
  ('Return status', 'return-status', 3),
  ('Exchange status', 'exchange-status', 4),
  ('Other return/exchange issue', 'other-return-exchange-issue', 5)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'return-exchange') cat;

-- Subcategories for Payments & Refunds
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Payment issue', 'payment-issue', 1),
  ('Refund issue', 'refund-issue', 2),
  ('Refund not received', 'refund-not-received', 3),
  ('Payment deducted but order failed', 'payment-deducted-order-failed', 4),
  ('Wallet balance issue', 'wallet-balance-issue', 5),
  ('Wallet deduction dispute', 'wallet-deduction-dispute', 6),
  ('Other payment issue', 'other-payment-issue', 7)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'payments-refunds') cat;

-- Subcategories for Account & Security
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Cannot log in', 'cannot-login', 1),
  ('Account access issue', 'account-access-issue', 2),
  ('Profile/account issue', 'profile-account-issue', 3),
  ('OTP issue', 'otp-issue', 4),
  ('Security concern', 'security-concern', 5),
  ('Other account issue', 'other-account-issue', 6)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'account-security') cat;

-- Subcategories for Rewards & Promotions
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Coupon issue', 'coupon-issue', 1),
  ('Reward issue', 'reward-issue', 2),
  ('Offer issue', 'offer-issue', 3),
  ('Other rewards issue', 'other-rewards-issue', 4)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'rewards-promotions') cat;

-- Subcategories for Technical
INSERT INTO public.support_categories (name, slug, parent_id, sort_order)
SELECT sub.name, sub.slug, cat.id, sub.sort_order
FROM (VALUES
  ('Website problem', 'website-problem', 1),
  ('App problem', 'app-problem', 2),
  ('Feature not working', 'feature-not-working', 3),
  ('Error/bug', 'error-bug', 4),
  ('Other technical issue', 'other-technical-issue', 5)
) AS sub(name, slug, sort_order)
CROSS JOIN (SELECT id FROM public.support_categories WHERE slug = 'technical') cat;

-- Other has no subcategories (it IS the catch-all)

-- ============================================================================
-- 11. SUPPORT ANALYTICS RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_support_analytics(
  p_date_from timestamptz DEFAULT (now() - interval '30 days'),
  p_date_to timestamptz DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'ticket_counts', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'today', COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())),
        'this_week', COUNT(*) FILTER (WHERE created_at >= date_trunc('week', now())),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))
      ) FROM public.support_tickets
    ),
    'by_status', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM public.support_tickets
        GROUP BY status
      ) s
    ),
    'by_priority', (
      SELECT jsonb_object_agg(priority, cnt)
      FROM (
        SELECT priority, COUNT(*) as cnt
        FROM public.support_tickets
        GROUP BY priority
      ) p
    ),
    'by_category', (
      SELECT COALESCE(jsonb_object_agg(sc.name, cnt), '{}'::jsonb)
      FROM (
        SELECT category_id, COUNT(*) as cnt
        FROM public.support_tickets
        WHERE created_at BETWEEN p_date_from AND p_date_to
        GROUP BY category_id
      ) t
      JOIN public.support_categories sc ON sc.id = t.category_id
    ),
    'performance', (
      SELECT jsonb_build_object(
        'avg_first_response_hours', ROUND(EXTRACT(EPOCH FROM AVG(first_response_at - created_at)) / 3600, 1),
        'avg_resolution_hours', ROUND(EXTRACT(EPOCH FROM AVG(resolved_at - created_at)) / 3600, 1),
        'resolution_rate', CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::numeric / COUNT(*)::numeric) * 100, 1)
          ELSE 0 
        END,
        'sla_breach_count', COUNT(*) FILTER (WHERE sla_breached = true),
        'reopen_count', 0
      )
      FROM public.support_tickets
      WHERE created_at BETWEEN p_date_from AND p_date_to
    ),
    'ai_metrics', (
      SELECT jsonb_build_object(
        'ai_created_tickets', COUNT(*) FILTER (WHERE ai_created = true),
        'total_tickets', COUNT(*),
        'ai_creation_rate', CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE ai_created = true)::numeric / COUNT(*)::numeric) * 100, 1)
          ELSE 0 
        END
      )
      FROM public.support_tickets
      WHERE created_at BETWEEN p_date_from AND p_date_to
    ),
    'by_executive', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', u.id,
        'name', u.full_name,
        'open_tickets', t.open_count,
        'resolved_tickets', t.resolved_count,
        'total_tickets', t.total_count
      )), '[]'::jsonb)
      FROM (
        SELECT 
          assigned_to,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as open_count,
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_count
        FROM public.support_tickets
        WHERE assigned_to IS NOT NULL
        GROUP BY assigned_to
      ) t
      JOIN public.users u ON u.id = t.assigned_to
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. ENABLE REALTIME FOR SUPPORT TABLES
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
