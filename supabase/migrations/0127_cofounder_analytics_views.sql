-- ==============================================================================
-- Migration 0127: AI Co-Founder Narrow Read-Only Analytics Views & RPC Engine
-- Purpose: Expose aggregated, privacy-safe (zero PII) e-commerce metrics for the
--          AI Co-Founder without granting unrestricted table access.
-- Architecture Reference: Blueprint Section 3.1 (Supabase E-commerce only) & Section 8.C
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Daily Sales & Revenue Aggregates (Zero PII)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.cofounder_analytics_daily_sales AS
SELECT
    DATE(o.created_at) AS sale_date,
    COUNT(*)::INTEGER AS total_orders,
    COUNT(*) FILTER (WHERE o.status IN ('confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'))::INTEGER AS valid_orders,
    COUNT(*) FILTER (WHERE o.status = 'cancelled')::INTEGER AS cancelled_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER AS delivered_orders,
    COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled'), 0)::NUMERIC(12,2) AS net_revenue,
    COALESCE(AVG(o.total) FILTER (WHERE o.status != 'cancelled'), 0)::NUMERIC(12,2) AS average_order_value,
    COALESCE(SUM(o.coupon_discount + o.coins_redeemed) FILTER (WHERE o.status != 'cancelled'), 0)::NUMERIC(12,2) AS total_discounts,
    COUNT(*) FILTER (WHERE o.payment_method = 'cod')::INTEGER AS cod_orders,
    COUNT(*) FILTER (WHERE o.payment_method != 'cod')::INTEGER AS prepaid_orders
FROM public.orders o
GROUP BY DATE(o.created_at)
ORDER BY sale_date DESC;

COMMENT ON VIEW public.cofounder_analytics_daily_sales IS 
'Privacy-safe aggregated daily sales numbers for AI Co-Founder analytics (zero customer PII).';

-- ------------------------------------------------------------------------------
-- 2. Inventory Health & Stock-Out Status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.cofounder_analytics_inventory_health AS
SELECT
    COUNT(*)::INTEGER AS total_skus,
    COUNT(*) FILTER (WHERE p.status = 'active')::INTEGER AS active_skus,
    COUNT(*) FILTER (WHERE p.stock_quantity > p.low_stock_threshold)::INTEGER AS in_stock_skus,
    COUNT(*) FILTER (WHERE p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold)::INTEGER AS low_stock_skus,
    COUNT(*) FILTER (WHERE p.stock_quantity <= 0)::INTEGER AS out_of_stock_skus,
    COALESCE(SUM(p.stock_quantity), 0)::INTEGER AS total_stock_units,
    COALESCE(SUM(p.price * p.stock_quantity), 0)::NUMERIC(14,2) AS total_stock_retail_value
FROM public.products p;

COMMENT ON VIEW public.cofounder_analytics_inventory_health IS 
'Real-time aggregated inventory levels and stock-out counters for AI Co-Founder operations.';

-- ------------------------------------------------------------------------------
-- 3. Weekly Cancellation & RTO Performance Rate
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.cofounder_analytics_cancellation_rates AS
SELECT
    DATE_TRUNC('week', o.created_at)::DATE AS week_start,
    COUNT(*)::INTEGER AS total_orders,
    COUNT(*) FILTER (WHERE o.status = 'cancelled')::INTEGER AS cancelled_orders,
    ROUND(
        (COUNT(*) FILTER (WHERE o.status = 'cancelled')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2
    ) AS cancellation_rate_pct,
    COUNT(*) FILTER (WHERE o.status IN ('rto_initiated', 'rto_received'))::INTEGER AS rto_orders,
    ROUND(
        (COUNT(*) FILTER (WHERE o.status IN ('rto_initiated', 'rto_received'))::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2
    ) AS rto_rate_pct,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::INTEGER AS delivered_orders,
    ROUND(
        (COUNT(*) FILTER (WHERE o.status = 'delivered')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2
    ) AS delivery_success_rate_pct
FROM public.orders o
GROUP BY DATE_TRUNC('week', o.created_at)
ORDER BY week_start DESC;

COMMENT ON VIEW public.cofounder_analytics_cancellation_rates IS 
'Aggregated weekly order performance, cancellation percentages, and RTO friction metrics.';

-- ------------------------------------------------------------------------------
-- 4. Bounded Range Aggregates RPC Function for AI Co-Founder
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cofounder_analytics_summary(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sales RECORD;
    v_inventory RECORD;
    v_cancellations RECORD;
    v_result JSONB;
BEGIN
    -- 1. Aggregate Sales in Date Window
    SELECT
        COUNT(*)::INTEGER AS total_orders,
        COUNT(*) FILTER (WHERE status != 'cancelled')::INTEGER AS valid_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER AS cancelled_orders,
        COUNT(*) FILTER (WHERE status = 'delivered')::INTEGER AS delivered_orders,
        COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0)::NUMERIC(12,2) AS net_revenue,
        COALESCE(AVG(total) FILTER (WHERE status != 'cancelled'), 0)::NUMERIC(12,2) AS aov,
        COUNT(*) FILTER (WHERE payment_method = 'cod')::INTEGER AS cod_count,
        COUNT(*) FILTER (WHERE payment_method != 'cod')::INTEGER AS prepaid_count
    INTO v_sales
    FROM public.orders
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;

    -- 2. Current Inventory Snapshot
    SELECT
        total_skus,
        active_skus,
        low_stock_skus,
        out_of_stock_skus,
        total_stock_units,
        total_stock_retail_value
    INTO v_inventory
    FROM public.cofounder_analytics_inventory_health;

    -- 3. Calculate Rates
    v_result := jsonb_build_object(
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'sales_performance', jsonb_build_object(
            'total_orders', v_sales.total_orders,
            'valid_orders', v_sales.valid_orders,
            'cancelled_orders', v_sales.cancelled_orders,
            'delivered_orders', v_sales.delivered_orders,
            'cancellation_rate_pct', CASE 
                WHEN v_sales.total_orders > 0 
                THEN ROUND((v_sales.cancelled_orders::NUMERIC / v_sales.total_orders * 100), 2)
                ELSE 0 
            END,
            'net_revenue', v_sales.net_revenue,
            'average_order_value', v_sales.aov,
            'prepaid_orders', v_sales.prepaid_count,
            'cod_orders', v_sales.cod_count
        ),
        'inventory_health', jsonb_build_object(
            'total_skus', v_inventory.total_skus,
            'active_skus', v_inventory.active_skus,
            'low_stock_skus', v_inventory.low_stock_skus,
            'out_of_stock_skus', v_inventory.out_of_stock_skus,
            'total_stock_units', v_inventory.total_stock_units,
            'total_stock_retail_value', v_inventory.total_stock_retail_value
        ),
        'generated_at', NOW()
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_cofounder_analytics_summary IS
'Secure narrow RPC function returning date-bounded e-commerce metrics for AI Co-Founder without exposing PII.';

-- ------------------------------------------------------------------------------
-- 5. Access Control & Grants
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_cofounder_analytics_summary(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cofounder_analytics_summary(DATE, DATE) TO authenticated, service_role;

GRANT SELECT ON public.cofounder_analytics_daily_sales TO authenticated, service_role;
GRANT SELECT ON public.cofounder_analytics_inventory_health TO authenticated, service_role;
GRANT SELECT ON public.cofounder_analytics_cancellation_rates TO authenticated, service_role;

