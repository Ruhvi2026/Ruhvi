-- Migration 0121: Cron Automation Run Ledger and Marketing Dispatch Idempotency
-- Enables durable tracking of daily cron executions and enforces zero duplicate email side-effects.

CREATE TABLE IF NOT EXISTS public.cron_automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT UNIQUE NOT NULL,
    job_name TEXT NOT NULL DEFAULT 'daily_automations',
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial_failure', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    step_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    campaign_type TEXT NOT NULL,
    campaign_period TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_user_campaign_period UNIQUE (user_id, campaign_type, campaign_period)
);

-- Indexes for lookup and performance
CREATE INDEX IF NOT EXISTS idx_cron_runs_started ON public.cron_automation_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_dispatches_lookup ON public.marketing_campaign_dispatches (user_id, campaign_type, campaign_period);

-- Row Level Security
ALTER TABLE public.cron_automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_dispatches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cron_automation_runs' AND policyname = 'Admins can view cron automation runs'
    ) THEN
        CREATE POLICY "Admins can view cron automation runs"
            ON public.cron_automation_runs
            FOR SELECT
            USING (public.is_admin_or_staff());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'marketing_campaign_dispatches' AND policyname = 'Admins can view marketing campaign dispatches'
    ) THEN
        CREATE POLICY "Admins can view marketing campaign dispatches"
            ON public.marketing_campaign_dispatches
            FOR SELECT
            USING (public.is_admin_or_staff());
    END IF;
END $$;

