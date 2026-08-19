-- Migration 0043_order_event_timeline.sql
-- Phase 17: Order Event Timeline

-- 1. Create enum for order event types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_event_type') THEN
    CREATE TYPE order_event_type AS ENUM (
      'ORDER_CREATED',
      'PAYMENT_CONFIRMED',
      'ORDER_CONFIRMED',
      'PACKING_STARTED',
      'PACKED',
      'LABEL_CREATED',
      'MANIFEST_CREATED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'RETURN_REQUESTED',
      'RETURN_APPROVED',
      'RETURN_PICKED',
      'REFUND_INITIATED',
      'RTO_INITIATED',
      'RTO_RECEIVED',
      'CANCELLED'
    );
  END IF;
END $$;

-- 2. Create order_events table (idempotent)
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type order_event_type NOT NULL,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  portal VARCHAR(50) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Users can view events for their orders (or admin/staff)
DROP POLICY IF EXISTS "Users can view events for their orders" ON public.order_events;
CREATE POLICY "Users can view events for their orders"
  ON public.order_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_events.order_id
      AND (o.user_id = auth.uid() OR public.is_admin_or_staff())
    )
  );

-- 5. Policy: Authorized backend (admin/staff) can insert order events
DROP POLICY IF EXISTS "Authorized backend can insert order events" ON public.order_events;
CREATE POLICY "Authorized backend can insert order events"
  ON public.order_events
  FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

-- 6. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON public.order_events(created_at);

-- 7. Create trigger function to automatically log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  event_type_mapping order_event_type;
  event_metadata JSONB := '{}'::jsonb;
  portal_name VARCHAR(50) := 'system';
BEGIN
  -- Only log on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Map status to event type
    CASE NEW.status
      WHEN 'pending' THEN event_type_mapping := 'ORDER_CREATED';
      WHEN 'confirmed' THEN event_type_mapping := 'ORDER_CONFIRMED';
      WHEN 'shipped' THEN event_type_mapping := 'SHIPPED';
      WHEN 'delivered' THEN event_type_mapping := 'DELIVERED';
      WHEN 'cancelled' THEN event_type_mapping := 'CANCELLED';
      WHEN 'returned' THEN event_type_mapping := 'RETURN_PICKED';
      ELSE event_type_mapping := NULL;
    END CASE;

    -- If we have a mapped event, insert it
    IF event_type_mapping IS NOT NULL THEN
      -- Determine portal from current context (if available)
      -- For now default to 'system' - will be overridden by explicit calls
      INSERT INTO public.order_events (order_id, event_type, performed_by, portal, metadata)
      VALUES (NEW.id, event_type_mapping, auth.uid(), portal_name, event_metadata);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger on orders table
DROP TRIGGER IF EXISTS orders_status_trigger ON public.orders;
CREATE TRIGGER orders_status_trigger
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();