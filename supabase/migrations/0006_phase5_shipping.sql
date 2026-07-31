-- Phase 5: Courier & Shipping Integration
-- Add Shiprocket tracking fields to existing orders table

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shiprocket_order_id text,
ADD COLUMN IF NOT EXISTS shiprocket_shipment_id text,
ADD COLUMN IF NOT EXISTS awb_code text,
ADD COLUMN IF NOT EXISTS courier_name text;

-- Create Tracking Updates table to store webhook events
CREATE TABLE IF NOT EXISTS public.tracking_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    awb_code text NOT NULL,
    status text NOT NULL,
    location text,
    activity text NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for Tracking Updates
ALTER TABLE public.tracking_updates ENABLE ROW LEVEL SECURITY;

-- Customers can view tracking updates for their own orders
CREATE POLICY "Users can view their own order tracking updates"
    ON public.tracking_updates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = tracking_updates.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Admins can view all tracking updates
CREATE POLICY "Admins can view all tracking updates"
    ON public.tracking_updates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Only admins/service role can insert tracking updates
CREATE POLICY "Service role can insert tracking updates"
    ON public.tracking_updates
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Add index on order_id for fast lookup of tracking history
CREATE INDEX IF NOT EXISTS idx_tracking_updates_order_id ON public.tracking_updates(order_id);
