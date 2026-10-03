-- Migration 0109: Co-Founder Business Advisor, Root-Cause Analysis & Action Planner
-- Additive tables and schema extensions to support structured strategic planning,
-- root-cause investigations, and automated Task Manager project decomposition.

-- 1. Create co_founder_action_plans table
CREATE TABLE IF NOT EXISTS public.co_founder_action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    goal TEXT NOT NULL,
    strategy TEXT NOT NULL,
    problem_statement TEXT,
    root_cause_summary TEXT,
    priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
    recommendation_id UUID REFERENCES public.co_founder_recommendations(id) ON DELETE SET NULL,
    signal_id UUID REFERENCES public.co_founder_signals(id) ON DELETE SET NULL,
    tasks_created JSONB DEFAULT '[]'::jsonb, -- Array of task IDs created in public.tasks
    success_metrics JSONB DEFAULT '[]'::jsonb, -- Target KPIs, baseline, target value, verification window
    expected_impact TEXT,
    effort_cost TEXT,
    trade_offs TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Extend co_founder_recommendations with root_cause_analysis and action_plan_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'co_founder_recommendations' AND column_name = 'root_cause_analysis'
    ) THEN
        ALTER TABLE public.co_founder_recommendations ADD COLUMN root_cause_analysis JSONB DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'co_founder_recommendations' AND column_name = 'action_plan_id'
    ) THEN
        ALTER TABLE public.co_founder_recommendations ADD COLUMN action_plan_id UUID REFERENCES public.co_founder_action_plans(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_co_founder_action_plans_status ON public.co_founder_action_plans(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_co_founder_action_plans_rec_id ON public.co_founder_action_plans(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_co_founder_action_plans_signal_id ON public.co_founder_action_plans(signal_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.co_founder_action_plans ENABLE ROW LEVEL SECURITY;

-- 5. Staff and Admin access policies (Idempotent with DROP POLICY IF EXISTS)
DROP POLICY IF EXISTS "Admins and staff can view action_plans" ON public.co_founder_action_plans;
CREATE POLICY "Admins and staff can view action_plans"
    ON public.co_founder_action_plans FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Admins and staff can insert action_plans" ON public.co_founder_action_plans;
CREATE POLICY "Admins and staff can insert action_plans"
    ON public.co_founder_action_plans FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Admins and staff can update action_plans" ON public.co_founder_action_plans;
CREATE POLICY "Admins and staff can update action_plans"
    ON public.co_founder_action_plans FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Service role full access on action_plans" ON public.co_founder_action_plans;
CREATE POLICY "Service role full access on action_plans"
    ON public.co_founder_action_plans FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

