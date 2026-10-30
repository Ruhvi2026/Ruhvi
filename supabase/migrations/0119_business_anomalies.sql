-- ============================================================================
-- 0119_business_anomalies.sql (TRACK D - Business Radar & Anomaly Lifecycle)
-- ============================================================================
-- Durable PostgreSQL persistence for Business Radar anomalies.
--
-- Guarantees:
-- 1. Unique fingerprint ensures deterministic deduplication across serverless runs.
-- 2. Complete actor attribution for acknowledgements and resolutions.
-- 3. Row-Level Security (RLS) restricts access to internal staff and admin roles.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.business_anomalies (
    id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL UNIQUE,
    rule_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    dimension TEXT NOT NULL DEFAULT 'global',
    state TEXT NOT NULL CHECK (state IN ('open', 'acknowledged', 'resolved', 'expired')),
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
    title TEXT NOT NULL,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_reason TEXT,
    resolved_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    latest_value NUMERIC NOT NULL,
    threshold_value NUMERIC NOT NULL,
    cooldown_until TIMESTAMPTZ NOT NULL,
    should_notify BOOLEAN NOT NULL DEFAULT FALSE,
    history JSONB DEFAULT '[]'::jsonb,
    recommendation JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid querying by state, severity, metric, and fingerprint
CREATE INDEX IF NOT EXISTS idx_business_anomalies_state ON public.business_anomalies(state);
CREATE INDEX IF NOT EXISTS idx_business_anomalies_severity ON public.business_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_business_anomalies_metric ON public.business_anomalies(metric);
CREATE INDEX IF NOT EXISTS idx_business_anomalies_fingerprint ON public.business_anomalies(fingerprint);

-- Enable Row-Level Security
ALTER TABLE public.business_anomalies ENABLE ROW LEVEL SECURITY;

-- Allow internal service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_anomalies' 
        AND policyname = 'service_role_all_business_anomalies'
    ) THEN
        CREATE POLICY service_role_all_business_anomalies
            ON public.business_anomalies
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Allow authenticated staff read access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_anomalies' 
        AND policyname = 'staff_read_business_anomalies'
    ) THEN
        CREATE POLICY staff_read_business_anomalies
            ON public.business_anomalies
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid()
                    AND role IN ('admin', 'super_admin', 'manager', 'staff')
                )
            );
    END IF;
END $$;

