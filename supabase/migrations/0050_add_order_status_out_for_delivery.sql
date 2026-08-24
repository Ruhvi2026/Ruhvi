-- =============================================================================
-- 0050_add_order_status_out_for_delivery.sql
-- The admin order status endpoint dispatches an "out for delivery" email
-- (src/app/api/admin/orders/status/route.ts), but 'out_for_delivery' was not a
-- member of the order_status enum, so the UPDATE threw a check constraint
-- error before the email branch could ever run. Add it to the enum.
-- =============================================================================

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
