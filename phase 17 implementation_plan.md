# Implementation Plan - Phase 17: Order Event Timeline

This plan outlines the architecture and execution steps to implement a secure, detailed, and visually premium Order Event Timeline inside the Orders Portal (`orders.ruhvi.in`).

---

## 1. Database Schema (`supabase/migrations/0043_order_event_timeline.sql`) [NEW]
We will create a new table `public.order_events` to log all key state changes of an order.

```sql
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

CREATE TABLE public.order_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type order_event_type NOT NULL,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Can be null for automated/system actions
  portal VARCHAR(50) NOT NULL, -- 'orders', 'operations', 'storefront', 'system'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users associated with the order to view timeline events
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

-- Restrict event inserts to service role or authenticated backend execution
CREATE POLICY "Authorized backend can insert order events"
  ON public.order_events
  FOR INSERT
  WITH CHECK (public.is_admin_or_staff());
```

---

## 2. Order Event Logger Utility (`src/lib/order-events.ts`) [NEW]
We will create a server-side helper function to record events securely.
- Enforce that portal context and metadata are stored reliably.
- Log corresponding entries automatically inside the `order_events` table.

---

## 3. Order status tracking hooks (Supabase Triggers or API changes)
To make timeline logging automatic and bulletproof, we will:
- Write a PL/pgSQL function and trigger on `public.orders` to log status transitions:
  - `pending` -> `ORDER_CREATED`
  - `confirmed` -> `ORDER_CONFIRMED`
  - `shipped` -> `SHIPPED`
  - `delivered` -> `DELIVERED`
  - `cancelled` -> `CANCELLED`
  - `returned` -> `RTO_RECEIVED` or `RETURN_PICKED`
- In the Shiprocket API (`src/app/api/admin/shiprocket/create-order/route.ts`), we will log the specific `LABEL_CREATED` and `SHIPPED` events using our new helper.

---

## 4. UI Refinement (`src/app/portal-orders/[id]/page.tsx`) [MODIFY]
- Retrieve `order_events` joined with the actor name from `public.users`.
- Display a visually stunning vertical timeline matching the glassmorphic dark-indigo aesthetic.
- Color code the status checkmarks and paths (e.g. green for DELIVERED, blue for confirm/shipped).

---

## Verification Plan
- **Type Checking:** Run `npx tsc --noEmit` to verify type-safety.
- **Manual Verification:**
  - Create a new order and verify the `ORDER_CREATED` event appears on the timeline.
  - Trigger Shiprocket push and verify that the timeline updates with shipment creation details.
