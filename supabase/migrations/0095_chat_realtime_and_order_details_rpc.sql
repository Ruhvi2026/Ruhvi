-- =============================================================================
-- Migration 0095: Chat Realtime Publication and Order Suggestion RPCs
--
-- 1. Sets REPLICA IDENTITY FULL on chat tables so complete payloads are delivered.
-- 2. Adds chat_messages, chat_conversations, chat_message_reads, chat_entity_references,
--    chat_message_mentions, and chat_message_reactions to supabase_realtime publication.
-- 3. Creates search_chat_orders() for auto-suggesting active orders when typing '#'.
-- 4. Creates get_chat_order_details() for rich interactive order preview modals in chat.
-- =============================================================================

-- 1. Replica Identity
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_entity_references REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_mentions REPLICA IDENTITY FULL;

-- 2. Add to supabase_realtime publication (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_reads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_mentions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_mentions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_entity_references'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_entity_references;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
  END IF;
END $$;

-- 3. Search chat orders for '#' trigger suggestions
CREATE OR REPLACE FUNCTION public.search_chat_orders(p_query text DEFAULT '')
RETURNS TABLE (
  id uuid,
  order_number text,
  status text,
  total numeric,
  payment_status text,
  created_at timestamptz,
  customer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    o.status::text,
    o.total,
    o.payment_status::text,
    o.created_at,
    COALESCE(u.full_name, u.email, 'Valued Customer') AS customer_name
  FROM public.orders o
  LEFT JOIN public.users u ON u.id = o.user_id
  WHERE (
    p_query IS NULL 
    OR trim(p_query) = '' 
    OR o.order_number ILIKE '%' || trim(p_query) || '%'
    OR u.full_name ILIKE '%' || trim(p_query) || '%'
  )
  ORDER BY o.created_at DESC
  LIMIT 15;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_chat_orders(text) TO authenticated, anon;

-- 4. Get full interactive order details for tapping #order in chat
CREATE OR REPLACE FUNCTION public.get_chat_order_details(p_order_id_or_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_order record;
  v_items jsonb;
  v_clean text;
BEGIN
  v_clean := replace(trim(p_order_id_or_number), '#', '');

  SELECT 
    o.id,
    o.order_number,
    o.status::text,
    o.subtotal,
    o.shipping_charge,
    o.total,
    o.payment_method::text,
    o.payment_status::text,
    o.created_at,
    o.shipped_at,
    o.delivered_at,
    COALESCE(u.full_name, u.email, 'Valued Customer') AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone
  INTO v_order
  FROM public.orders o
  LEFT JOIN public.users u ON u.id = o.user_id
  WHERE o.order_number ILIKE v_clean
     OR o.id::text = v_clean
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'product_name', COALESCE(oi.product_name, 'Jewellery Item'),
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price
        )
      ), '[]'::jsonb
    )
    INTO v_items
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id;
  EXCEPTION WHEN OTHERS THEN
    v_items := '[]'::jsonb;
  END;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'subtotal', v_order.subtotal,
    'shipping_charge', v_order.shipping_charge,
    'total', v_order.total,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at,
    'shipped_at', v_order.shipped_at,
    'delivered_at', v_order.delivered_at,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'customer_phone', v_order.customer_phone,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_order_details(text) TO authenticated, anon;
