-- 0105_co_founder_outcomes.sql
-- Stage 10: Outcome Tracking & Learning Loop for Ruhvi AI Co-Founder

CREATE TABLE IF NOT EXISTS public.co_founder_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES public.co_founder_approvals(id) ON DELETE SET NULL,
    action_id UUID,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('recommendation', 'action', 'proactive_signal', 'engineering_task', 'general_decision')),
    entity_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'recommendation_created',
        'recommendation_accepted',
        'recommendation_rejected',
        'recommendation_modified',
        'action_approved',
        'action_executed',
        'action_failed',
        'task_completed',
        'task_failed',
        'proactive_suggestion_accepted',
        'proactive_suggestion_rejected',
        'user_correction',
        'user_feedback',
        'measurable_business_result',
        'outcome_verified'
    )),
    expected_outcome TEXT,
    actual_outcome TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
        'pending',
        'verified',
        'unverified',
        'conflicted',
        'unresolved'
    )),
    verification_source TEXT CHECK (verification_source IN (
        'authoritative_db',
        'user_report',
        'analytics_engine',
        'inferred',
        'system_diagnostic'
    )),
    evidence JSONB DEFAULT '{}'::jsonb,
    feedback_text TEXT,
    feedback_sentiment TEXT CHECK (feedback_sentiment IN ('positive', 'negative', 'neutral', 'correction')),
    learning_signal JSONB DEFAULT '{}'::jsonb,
    measurement_window_end TIMESTAMPTZ,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying by entity, verification status, and recency
CREATE INDEX IF NOT EXISTS idx_co_founder_outcomes_rec_id ON public.co_founder_outcomes(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_co_founder_outcomes_entity ON public.co_founder_outcomes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_co_founder_outcomes_status ON public.co_founder_outcomes(verification_status);
CREATE INDEX IF NOT EXISTS idx_co_founder_outcomes_created_at ON public.co_founder_outcomes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.co_founder_outcomes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on co_founder_outcomes"
    ON public.co_founder_outcomes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view outcomes
CREATE POLICY "Authenticated users view outcomes"
    ON public.co_founder_outcomes
    FOR SELECT
    TO authenticated
    USING (true);
