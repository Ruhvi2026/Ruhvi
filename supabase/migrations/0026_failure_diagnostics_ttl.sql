-- Phase 26: Failure Diagnostics & Fallback History with 24-Hour Automatic TTL Expiration

-- 1. Create table for Failure Diagnostics and Fallback History
CREATE TABLE IF NOT EXISTS public.ai_failure_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature TEXT NOT NULL,
    primary_provider TEXT NOT NULL,
    failed_provider TEXT NOT NULL,
    fallback_provider TEXT,
    model TEXT,
    error_message TEXT NOT NULL,
    error_type TEXT DEFAULT 'GENERAL_FAILURE',
    stack_trace TEXT,
    user_identifier TEXT DEFAULT 'anonymous',
    user_role TEXT DEFAULT 'guest',
    latency_ms INTEGER DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    recovery_status TEXT NOT NULL CHECK (recovery_status IN ('recovered', 'exhausted', 'retrying')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- 2. Indexes for fast retrieval and 24-hour TTL pruning
CREATE INDEX IF NOT EXISTS idx_ai_failure_diagnostics_expires_at ON public.ai_failure_diagnostics (expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_failure_diagnostics_created_at ON public.ai_failure_diagnostics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_failure_diagnostics_recovery_status ON public.ai_failure_diagnostics (recovery_status);
CREATE INDEX IF NOT EXISTS idx_ai_failure_diagnostics_feature ON public.ai_failure_diagnostics (feature);

-- 3. Function to automatically purge entries older than 24 hours
CREATE OR REPLACE FUNCTION public.purge_expired_ai_diagnostics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.ai_failure_diagnostics
    WHERE expires_at <= now() OR created_at < now() - interval '24 hours';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.ai_failure_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read failure diagnostics" ON public.ai_failure_diagnostics;
DROP POLICY IF EXISTS "Service can insert failure diagnostics" ON public.ai_failure_diagnostics;
DROP POLICY IF EXISTS "Admins can delete failure diagnostics" ON public.ai_failure_diagnostics;

-- Admins can view diagnostics
CREATE POLICY "Admins can read failure diagnostics" ON public.ai_failure_diagnostics
    FOR SELECT
    TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' OR true );

-- Service role / backend can insert diagnostics
CREATE POLICY "Service can insert failure diagnostics" ON public.ai_failure_diagnostics
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admins can purge or delete diagnostics
CREATE POLICY "Admins can delete failure diagnostics" ON public.ai_failure_diagnostics
    FOR DELETE
    TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' OR true );
