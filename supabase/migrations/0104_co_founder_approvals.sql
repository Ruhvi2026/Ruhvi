-- Migration 0104: Co-Founder Recommendations & Formal Approval State Machine
-- Persistent state machine for executive recommendations, explicit founder consent, and action previews.

CREATE TABLE IF NOT EXISTS public.co_founder_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('BUSINESS', 'PRODUCT', 'CUSTOMER', 'SUPPORT', 'OPERATIONS')),
    fact TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'moderate', 'low', 'insufficient_evidence')),
    alternatives JSONB DEFAULT '[]'::jsonb,
    impact_analysis JSONB DEFAULT '{}'::jsonb,
    suggested_action JSONB,
    signal_id UUID REFERENCES public.co_founder_signals(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'dismissed', 'superseded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.co_founder_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES public.co_founder_recommendations(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    scope_description TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'revoked', 'executed', 'failed')),
    requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    execution_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_co_founder_approvals_status ON public.co_founder_approvals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_co_founder_approvals_idempotency ON public.co_founder_approvals(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_co_founder_recs_status ON public.co_founder_recommendations(status, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.co_founder_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_founder_approvals ENABLE ROW LEVEL SECURITY;

-- Staff and Admin access policies
CREATE POLICY "Admins and staff can view recommendations"
    ON public.co_founder_recommendations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can view approvals"
    ON public.co_founder_approvals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update approvals"
    ON public.co_founder_approvals FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Service role full access on recommendations"
    ON public.co_founder_recommendations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on approvals"
    ON public.co_founder_approvals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
