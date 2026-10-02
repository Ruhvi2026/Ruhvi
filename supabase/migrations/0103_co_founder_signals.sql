-- Migration 0103: Co-Founder Proactive Signals and Business Alerts
-- Persistent signal engine registry for deduplication, priority management, and executive notifications.

CREATE TABLE IF NOT EXISTS public.co_founder_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT UNIQUE NOT NULL,
    signal_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('BUSINESS', 'RISK', 'OPPORTUNITY', 'FOLLOW_UP', 'SYSTEM')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence TEXT NOT NULL CHECK (confidence IN ('confirmed', 'strong', 'possible', 'insufficient_evidence')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detail TEXT NOT NULL,
    metrics JSONB DEFAULT '{}'::jsonb,
    recommended_action TEXT,
    requires_approval BOOLEAN DEFAULT true,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_co_founder_signals_fingerprint ON public.co_founder_signals(fingerprint);
CREATE INDEX IF NOT EXISTS idx_co_founder_signals_active ON public.co_founder_signals(is_acknowledged, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_co_founder_signals_category ON public.co_founder_signals(category, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.co_founder_signals ENABLE ROW LEVEL SECURITY;

-- Staff and Admin access policies
CREATE POLICY "Admins and staff can view co_founder_signals"
    ON public.co_founder_signals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update co_founder_signals"
    ON public.co_founder_signals FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Service role full access on co_founder_signals"
    ON public.co_founder_signals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
