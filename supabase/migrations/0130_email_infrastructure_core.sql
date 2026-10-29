-- Migration 0130: Production-grade Email Orchestrator Core Tables & Functions
-- Target: Resend + Mailjet with atomic quota, persistent outbox, delivery attempts, webhooks, and suppression.

-- 1. Provider Configurations Table
CREATE TABLE IF NOT EXISTS public.email_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT UNIQUE NOT NULL CHECK (provider IN ('resend', 'mailjet', 'brevo', 'brevo_legacy')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    encrypted_credentials TEXT,
    sender_email TEXT NOT NULL DEFAULT 'notifications@ruhvi.in',
    sender_name TEXT NOT NULL DEFAULT 'Ruhvi',
    health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy')),
    last_health_check_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Routing Policies Table
CREATE TABLE IF NOT EXISTS public.email_routing_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT UNIQUE NOT NULL CHECK (category IN (
        'account_security',
        'account_lifecycle',
        'order_transactional',
        'shipping_transactional',
        'customer_support',
        'marketing_campaign',
        'internal_staff'
    )),
    primary_provider TEXT NOT NULL CHECK (primary_provider IN ('resend', 'mailjet', 'brevo', 'brevo_legacy')),
    fallback_provider TEXT CHECK (fallback_provider IN ('resend', 'mailjet', 'brevo', 'brevo_legacy')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    fallback_enabled BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 50,
    max_attempts INTEGER NOT NULL DEFAULT 4,
    daily_limit_budget INTEGER,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_different_providers CHECK (fallback_provider IS NULL OR primary_provider <> fallback_provider)
);

-- 3. Email Deliveries (Durable Transactional Outbox)
CREATE TABLE IF NOT EXISTS public.email_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'account_security',
        'account_lifecycle',
        'order_transactional',
        'shipping_transactional',
        'customer_support',
        'marketing_campaign',
        'internal_staff'
    )),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    template_key TEXT NOT NULL,
    template_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued',
        'reserved',
        'sending',
        'accepted',
        'delivered',
        'delivery_delayed',
        'retry_scheduled',
        'failed',
        'unknown',
        'bounced',
        'complained',
        'suppressed',
        'cancelled',
        'dead_letter'
    )),
    priority INTEGER NOT NULL DEFAULT 50,
    selected_provider TEXT CHECK (selected_provider IN ('resend', 'mailjet', 'brevo', 'brevo_legacy')),
    provider_message_id TEXT,
    provider_message_uuid TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 4,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    leased_until TIMESTAMPTZ,
    lease_worker_id TEXT,
    last_error_code TEXT,
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Email Delivery Attempts (Audit & Reconcile Log)
CREATE TABLE IF NOT EXISTS public.email_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.email_deliveries(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('resend', 'mailjet', 'brevo', 'brevo_legacy')),
    attempt_number INTEGER NOT NULL,
    custom_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'accepted', 'rejected', 'unknown', 'reconciled_accepted', 'reconciled_not_found')),
    http_status INTEGER,
    provider_message_id TEXT,
    provider_message_uuid TEXT,
    error_code TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_delivery_provider_attempt UNIQUE (delivery_id, provider, attempt_number)
);

-- 5. Email Quota Windows (Atomic Reservation Ledger)
CREATE TABLE IF NOT EXISTS public.email_quota_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('resend', 'mailjet', 'brevo', 'brevo_legacy')),
    window_type TEXT NOT NULL CHECK (window_type IN ('daily', 'monthly')),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    hard_limit INTEGER NOT NULL,
    reserved_count INTEGER NOT NULL DEFAULT 0,
    accepted_count INTEGER NOT NULL DEFAULT 0,
    released_count INTEGER NOT NULL DEFAULT 0,
    last_reconciled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_provider_window UNIQUE (provider, window_type, window_start)
);

-- 6. Email Webhook Events Table
CREATE TABLE IF NOT EXISTS public.email_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('resend', 'mailjet', 'brevo', 'brevo_legacy')),
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    delivery_id UUID REFERENCES public.email_deliveries(id) ON DELETE SET NULL,
    custom_id TEXT,
    recipient_email TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_webhook_provider_event UNIQUE (provider, provider_event_id)
);

-- 7. Email Suppressions & Marketing Consent
CREATE TABLE IF NOT EXISTS public.email_suppressions (
    email_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'hard_bounce', 'spam_complaint', 'manual_block', 'invalid')),
    source_provider TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_marketing_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    has_consent BOOLEAN NOT NULL DEFAULT false,
    consent_source TEXT,
    consent_timestamp TIMESTAMPTZ DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ,
    unsubscribe_token TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for high-throughput query and queue workers
CREATE INDEX IF NOT EXISTS idx_email_deliveries_claim 
ON public.email_deliveries (status, priority DESC, next_attempt_at)
WHERE status IN ('queued', 'retry_scheduled');

CREATE INDEX IF NOT EXISTS idx_email_deliveries_leased 
ON public.email_deliveries (leased_until)
WHERE status = 'sending';

CREATE INDEX IF NOT EXISTS idx_email_deliveries_event_key 
ON public.email_deliveries (event_key);

CREATE INDEX IF NOT EXISTS idx_email_delivery_attempts_delivery 
ON public.email_delivery_attempts (delivery_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_email_quota_windows_lookup 
ON public.email_quota_windows (provider, window_type, window_start, window_end);

-- 8. Atomic Quota Reservation Function (Concurrency-Safe)
CREATE OR REPLACE FUNCTION public.reserve_email_quota(
    p_provider TEXT,
    p_daily_limit INTEGER,
    p_monthly_limit INTEGER,
    p_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_day_start TIMESTAMPTZ := date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
    v_day_end TIMESTAMPTZ := v_day_start + INTERVAL '1 day';
    v_month_start TIMESTAMPTZ := date_trunc('month', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
    v_month_end TIMESTAMPTZ := v_month_start + INTERVAL '1 month';
    v_daily_rec RECORD;
    v_monthly_rec RECORD;
BEGIN
    -- Upsert daily window
    INSERT INTO public.email_quota_windows (provider, window_type, window_start, window_end, hard_limit)
    VALUES (p_provider, 'daily', v_day_start, v_day_end, p_daily_limit)
    ON CONFLICT (provider, window_type, window_start) 
    DO UPDATE SET hard_limit = EXCLUDED.hard_limit;

    -- Upsert monthly window
    INSERT INTO public.email_quota_windows (provider, window_type, window_start, window_end, hard_limit)
    VALUES (p_provider, 'monthly', v_month_start, v_month_end, p_monthly_limit)
    ON CONFLICT (provider, window_type, window_start) 
    DO UPDATE SET hard_limit = EXCLUDED.hard_limit;

    -- Lock both windows FOR UPDATE
    SELECT * INTO v_daily_rec
    FROM public.email_quota_windows
    WHERE provider = p_provider AND window_type = 'daily' AND window_start = v_day_start
    FOR UPDATE;

    SELECT * INTO v_monthly_rec
    FROM public.email_quota_windows
    WHERE provider = p_provider AND window_type = 'monthly' AND window_start = v_month_start
    FOR UPDATE;

    -- Check capacity
    IF (v_daily_rec.accepted_count + v_daily_rec.reserved_count + p_count > v_daily_rec.hard_limit) OR
       (v_monthly_rec.accepted_count + v_monthly_rec.reserved_count + p_count > v_monthly_rec.hard_limit) THEN
        RETURN FALSE;
    END IF;

    -- Reserve capacity atomically
    UPDATE public.email_quota_windows
    SET reserved_count = reserved_count + p_count, updated_at = now()
    WHERE id = v_daily_rec.id;

    UPDATE public.email_quota_windows
    SET reserved_count = reserved_count + p_count, updated_at = now()
    WHERE id = v_monthly_rec.id;

    RETURN TRUE;
END;
$$;

-- 9. Atomic Quota Commit Function
CREATE OR REPLACE FUNCTION public.commit_email_quota(
    p_provider TEXT,
    p_count INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_day_start TIMESTAMPTZ := date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
    v_month_start TIMESTAMPTZ := date_trunc('month', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
    UPDATE public.email_quota_windows
    SET reserved_count = GREATEST(0, reserved_count - p_count),
        accepted_count = accepted_count + p_count,
        updated_at = now()
    WHERE provider = p_provider AND window_type = 'daily' AND window_start = v_day_start;

    UPDATE public.email_quota_windows
    SET reserved_count = GREATEST(0, reserved_count - p_count),
        accepted_count = accepted_count + p_count,
        updated_at = now()
    WHERE provider = p_provider AND window_type = 'monthly' AND window_start = v_month_start;
END;
$$;

-- 10. Atomic Quota Release Function
CREATE OR REPLACE FUNCTION public.release_email_quota(
    p_provider TEXT,
    p_count INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_day_start TIMESTAMPTZ := date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
    v_month_start TIMESTAMPTZ := date_trunc('month', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
    UPDATE public.email_quota_windows
    SET reserved_count = GREATEST(0, reserved_count - p_count),
        released_count = released_count + p_count,
        updated_at = now()
    WHERE provider = p_provider AND window_type = 'daily' AND window_start = v_day_start;

    UPDATE public.email_quota_windows
    SET reserved_count = GREATEST(0, reserved_count - p_count),
        released_count = released_count + p_count,
        updated_at = now()
    WHERE provider = p_provider AND window_type = 'monthly' AND window_start = v_month_start;
END;
$$;

-- 11. Transactional Queue Worker Claim Function (SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_email_deliveries(
    p_batch_size INTEGER DEFAULT 10,
    p_worker_id TEXT DEFAULT 'worker-1',
    p_lease_seconds INTEGER DEFAULT 60
)
RETURNS SETOF public.email_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lease_until TIMESTAMPTZ := now() + (p_lease_seconds || ' seconds')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT id
        FROM public.email_deliveries
        WHERE (status IN ('queued', 'retry_scheduled') AND next_attempt_at <= now())
           OR (status = 'sending' AND leased_until < now()) -- Stale lease recovery
        ORDER BY priority DESC, next_attempt_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.email_deliveries d
    SET status = 'sending',
        leased_until = v_lease_until,
        lease_worker_id = p_worker_id,
        attempt_count = attempt_count + 1,
        updated_at = now()
    FROM claimed
    WHERE d.id = claimed.id
    RETURNING d.*;
END;
$$;

-- 12. Seed Default Provider Configurations & Routing Policies
INSERT INTO public.email_provider_configs (provider, enabled, sender_email, sender_name, health_status)
VALUES 
    ('resend', true, 'notifications@ruhvi.in', 'Ruhvi', 'healthy'),
    ('mailjet', true, 'notifications@ruhvi.in', 'Ruhvi', 'healthy')
ON CONFLICT (provider) DO NOTHING;

INSERT INTO public.email_routing_policies (category, primary_provider, fallback_provider, enabled, fallback_enabled, priority, max_attempts)
VALUES 
    ('account_security', 'resend', 'mailjet', true, true, 100, 4),
    ('account_lifecycle', 'resend', 'mailjet', true, true, 80, 4),
    ('order_transactional', 'mailjet', 'resend', true, true, 90, 4),
    ('shipping_transactional', 'mailjet', 'resend', true, true, 85, 4),
    ('customer_support', 'mailjet', 'resend', true, true, 70, 4),
    ('marketing_campaign', 'mailjet', NULL, true, false, 20, 3),
    ('internal_staff', 'brevo', 'mailjet', true, true, 50, 3)
ON CONFLICT (category) DO NOTHING;

-- 13. Row Level Security Policies
ALTER TABLE public.email_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_routing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_quota_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_marketing_consent ENABLE ROW LEVEL SECURITY;

-- Admins and staff have full access; Customers/Public have NO access to infrastructure tables
CREATE POLICY "Staff can view provider configs" ON public.email_provider_configs
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can update provider configs" ON public.email_provider_configs
    FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Staff can view routing policies" ON public.email_routing_policies
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can update routing policies" ON public.email_routing_policies
    FOR ALL USING (public.is_admin_or_staff());

CREATE POLICY "Staff can view email deliveries" ON public.email_deliveries
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can view delivery attempts" ON public.email_delivery_attempts
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can view quota windows" ON public.email_quota_windows
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can view webhook events" ON public.email_webhook_events
    FOR SELECT USING (public.is_admin_or_staff());

CREATE POLICY "Staff can view email suppressions" ON public.email_suppressions
    FOR SELECT USING (public.is_admin_or_staff());
