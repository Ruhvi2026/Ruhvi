-- =============================================================================
-- 0074_orders_dashboard_core.sql
-- Orders Dashboard — non-destructive extension of the existing live checkout
-- schema (Phase 0 reconciliation). Preserves every existing column, enum value,
-- trigger, policy and API contract. Only additive ALTERs + new tables.
--
-- Safety contract:
--   * No DROP, no column renames, no enum renames.
--   * All ALTER ... ADD COLUMN IF NOT EXISTS / ADD VALUE IF NOT EXISTS.
--   * Existing triggers (orders_status_trigger, wallet ledger triggers) intact;
--     the status->event mapper is extended, not replaced.
-- =============================================================================

-- ============================================================================
-- 1. EXTEND order_status enum with fulfillment-side branch statuses
--    (existing: pending, confirmed, shipped, delivered, cancelled, returned,
--     out_for_delivery — all preserved untouched)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'processing') THEN
    ALTER TYPE public.order_status ADD VALUE 'processing';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'delivery_failed') THEN
    ALTER TYPE public.order_status ADD VALUE 'delivery_failed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'rto_initiated') THEN
    ALTER TYPE public.order_status ADD VALUE 'rto_initiated';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'rto_received') THEN
    ALTER TYPE public.order_status ADD VALUE 'rto_received';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'return_requested') THEN
    ALTER TYPE public.order_status ADD VALUE 'return_requested';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'return_approved') THEN
    ALTER TYPE public.order_status ADD VALUE 'return_approved';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'return_rejected') THEN
    ALTER TYPE public.order_status ADD VALUE 'return_rejected';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'refunded') THEN
    ALTER TYPE public.order_status ADD VALUE 'refunded';
  END IF;
END $$;

-- ============================================================================
-- 2. EXTEND orders table with lifecycle timestamps (additive only)
-- ============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS rto_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_result text;

-- Index for order number + status lookups (dashboard hot paths)
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================================================
-- 3. EXTEND order_items with variant + cost snapshot for margin (additive)
--    existing columns preserved: id, order_id, product_id, sku, quantity,
--    price_at_purchase, created_at
-- ============================================================================
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS unit_cost_price numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total numeric(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_items_variant ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ============================================================================
-- 4. EXTEND inventory_movements with an order FK (additive)
--    existing `reference_order_id` text column is kept for backward compat.
-- ============================================================================
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON public.inventory_movements(order_id);

-- ============================================================================
-- 5. EXTEND order_event_type enum (existing values preserved)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_event_type' AND e.enumlabel = 'PROCESSING') THEN
    ALTER TYPE public.order_event_type ADD VALUE 'PROCESSING';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_event_type' AND e.enumlabel = 'DELIVERY_FAILED') THEN
    ALTER TYPE public.order_event_type ADD VALUE 'DELIVERY_FAILED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_event_type' AND e.enumlabel = 'RETURN_REJECTED') THEN
    ALTER TYPE public.order_event_type ADD VALUE 'RETURN_REJECTED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_event_type' AND e.enumlabel = 'RETURN_RECEIVED') THEN
    ALTER TYPE public.order_event_type ADD VALUE 'RETURN_RECEIVED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_event_type' AND e.enumlabel = 'REFUNDED') THEN
    ALTER TYPE public.order_event_type ADD VALUE 'REFUNDED';
  END IF;
END $$;

-- ============================================================================
-- 6. EXTEND the existing orders_status_trigger mapper so the audit trail covers
--    the new statuses. The original function is REPLACED, not dropped/recreated
--    separately, and only adds CASE arms — all original mappings preserved.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  event_type_mapping order_event_type;
  event_metadata JSONB := '{}'::jsonb;
  portal_name VARCHAR(50) := 'system';
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'pending' THEN event_type_mapping := 'ORDER_CREATED';
      WHEN 'confirmed' THEN event_type_mapping := 'ORDER_CONFIRMED';
      WHEN 'processing' THEN event_type_mapping := 'PROCESSING';
      WHEN 'shipped' THEN event_type_mapping := 'SHIPPED';
      WHEN 'out_for_delivery' THEN event_type_mapping := 'OUT_FOR_DELIVERY';
      WHEN 'delivered' THEN event_type_mapping := 'DELIVERED';
      WHEN 'delivery_failed' THEN event_type_mapping := 'DELIVERY_FAILED';
      WHEN 'cancelled' THEN event_type_mapping := 'CANCELLED';
      WHEN 'returned' THEN event_type_mapping := 'RETURN_PICKED';
      WHEN 'return_requested' THEN event_type_mapping := 'RETURN_REQUESTED';
      WHEN 'return_approved' THEN event_type_mapping := 'RETURN_APPROVED';
      WHEN 'return_rejected' THEN event_type_mapping := 'RETURN_REJECTED';
      WHEN 'rto_initiated' THEN event_type_mapping := 'RTO_INITIATED';
      WHEN 'rto_received' THEN event_type_mapping := 'RTO_RECEIVED';
      WHEN 'refunded' THEN event_type_mapping := 'REFUNDED';
      ELSE event_type_mapping := NULL;
    END CASE;

    IF event_type_mapping IS NOT NULL THEN
      INSERT INTO public.order_events (order_id, event_type, performed_by, portal, metadata)
      VALUES (NEW.id, event_type_mapping, auth.uid(), portal_name, event_metadata);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger re-asserted (idempotent) to guarantee it still exists after replace.
DROP TRIGGER IF EXISTS orders_status_trigger ON public.orders;
CREATE TRIGGER orders_status_trigger
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ============================================================================
-- 7. NEW TABLE: shipments — normalized shipment records per order
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_provider text NOT NULL,
  awb_number text,
  tracking_url text,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'rto_initiated', 'rto_received', 'cancelled')),
  shipped_at timestamptz,
  estimated_delivery_date date,
  delivered_at timestamptz,
  delivery_attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_attempt_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_awb ON public.shipments(awb_number);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Customers can view shipments for their own orders
CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid()
    )
  );

-- Staff/admin/manager can view all shipments
CREATE POLICY "Staff can view all shipments"
  ON public.shipments FOR SELECT
  USING (public.is_admin_or_staff());

-- Staff can create/update shipments (server routes use service role)
CREATE POLICY "Staff can insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Staff can update shipments"
  ON public.shipments FOR UPDATE
  USING (public.is_admin_or_staff());

-- ============================================================================
-- 8. NEW TABLE: cod_eligibility — per-customer COD refusal tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cod_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cod_disabled boolean NOT NULL DEFAULT false,
  cod_refusal_count integer NOT NULL DEFAULT 0,
  last_refusal_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cod_eligibility_customer ON public.cod_eligibility(customer_id);

-- Idempotency ledger: one row per qualifying refusal event, keyed by order so
-- a retried callback can never increment the counter twice.
CREATE TABLE IF NOT EXISTS public.cod_eligibility_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cod_eligibility_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view cod eligibility events"
  ON public.cod_eligibility_events FOR SELECT
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff can insert cod eligibility events"
  ON public.cod_eligibility_events FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

ALTER TABLE public.cod_eligibility ENABLE ROW LEVEL SECURITY;

-- Staff-only read/write. Customers must NOT see their own internal refusal
-- counters (staff-internal data).
CREATE POLICY "Staff can view cod eligibility"
  ON public.cod_eligibility FOR SELECT
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff can insert cod eligibility"
  ON public.cod_eligibility FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Staff can update cod eligibility"
  ON public.cod_eligibility FOR UPDATE
  USING (public.is_admin_or_staff());

-- ============================================================================
-- 9. NEW TABLE: courier_providers — active-provider config
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.courier_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courier_providers ENABLE ROW LEVEL SECURITY;

-- Everyone can read provider names; only staff can manage
CREATE POLICY "Courier providers are viewable by everyone"
  ON public.courier_providers FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage courier providers"
  ON public.courier_providers FOR ALL
  USING (public.is_admin_or_staff());

-- Seed: Shiprocket is the currently-integrated provider (per Phase 0).
INSERT INTO public.courier_providers (name, is_active, priority, notes)
VALUES
  ('shiprocket', true, 1, 'Active provider — existing Shiprocket integration'),
  ('delhivery', false, 0, 'Available for future switch-over (add adapter, no rebuild)'),
  ('expressbees', false, 0, 'Available for future switch-over (add adapter, no rebuild)')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 10. Configurable COD refusal threshold (public policy says "multiple";
--     operational default of 2 is a setting, NOT a hard-coded public fact)
-- ============================================================================
INSERT INTO public.settings (key, value) VALUES
  ('cod_refusal_threshold', '2'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 11. RPC: increment_variant_stock — used by the returns/RTO engine to
--     atomically increase stock on warehouse receipt. Service-role only:
--     this is SECURITY DEFINER and must NOT be callable by ordinary customers.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_variant_stock(
  p_variant_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: only staff/admin may mutate inventory directly.
  IF NOT public.is_admin_or_staff() THEN
    RAISE EXCEPTION 'Forbidden: only staff can adjust inventory';
  END IF;

  UPDATE public.product_variants
  SET stock_quantity = stock_quantity + p_quantity,
      updated_at = now()
  WHERE id = p_variant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_variant_stock FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_variant_stock TO service_role;

-- ============================================================================
-- 12. RPC: increment_cod_refusal — atomic, concurrency-safe COD refusal counter.
--     Inserts the eligibility row on first refusal; increments otherwise.
--     Returns the authoritative post-increment count. Staff/service-role only.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_cod_refusal(p_customer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.cod_eligibility (customer_id, cod_refusal_count, cod_disabled, last_refusal_at)
  VALUES (p_customer_id, 1, false, now())
  ON CONFLICT (customer_id)
  DO UPDATE SET cod_refusal_count = public.cod_eligibility.cod_refusal_count + 1,
                last_refusal_at = now(),
                updated_at = now()
  RETURNING cod_refusal_count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_cod_refusal FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_cod_refusal TO service_role;

-- ============================================================================
-- 12. RPC: get_my_cod_eligibility — returns ONLY the caller's cod_disabled
--     flag (never refusal counters). Binds to auth.uid() server-side so the
--     checkout endpoint cannot be used to read other customers' data.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_cod_eligibility()
RETURNS TABLE(cod_disabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT e.cod_disabled
  FROM public.cod_eligibility e
  WHERE e.customer_id = auth.uid()
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_cod_eligibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_cod_eligibility() TO authenticated;

-- ============================================================================
-- 13. Idempotency guards for financial/inventory mutations.
--     * wallet_ledger: only one 'credit' (refund) row per order — prevents
--       concurrent wallet refunds from double-crediting.
--     * inventory_movements: only one 'return' stock-in per (order, variant) —
--       prevents concurrent return receipts from double-stocking.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_order_credit
  ON public.wallet_ledger(order_id)
  WHERE type = 'credit' AND order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_return_unique
  ON public.inventory_movements(order_id, variant_id)
  WHERE movement_type = 'return' AND order_id IS NOT NULL AND variant_id IS NOT NULL;

INSERT INTO public.settings (key, value) VALUES
  (
    'orders_policy',
    '{
      "free_shipping_threshold": 500,
      "shipping_fee": 49,
      "cod_charge": 49,
      "cod_deposit_pct": 10,
      "processing_days_min": 1,
      "processing_days_max": 2,
      "delivery_days_min": 3,
      "delivery_days_max": 7,
      "delivery_days_remote_max": 10,
      "max_delivery_attempts": 3
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;
