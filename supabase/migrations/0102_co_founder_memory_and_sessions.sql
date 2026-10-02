-- Migration 0102: Co-Founder Memory, Sessions, and Strategic Context
-- Dedicated storage for AI Co-Founder long-term memory, session state, and decisions.

CREATE TABLE IF NOT EXISTS public.co_founder_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    summary TEXT,
    topics TEXT[] DEFAULT '{}',
    decisions TEXT[] DEFAULT '{}',
    pending_actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.co_founder_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('strategic_goal', 'business_preference', 'operational_rule', 'correction', 'decision', 'general')),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    source TEXT NOT NULL DEFAULT 'user_explicit' CHECK (source IN ('user_explicit', 'session_inference', 'system', 'correction')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    superseded_by UUID REFERENCES public.co_founder_memories(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for low-latency memory lookup during voice & chat sessions
CREATE INDEX IF NOT EXISTS idx_co_founder_sessions_user_status ON public.co_founder_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_co_founder_memories_lookup ON public.co_founder_memories(user_id, category, is_active);
CREATE INDEX IF NOT EXISTS idx_co_founder_memories_key ON public.co_founder_memories(key) WHERE is_active = true;

-- Enable Row Level Security (RLS)
ALTER TABLE public.co_founder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_founder_memories ENABLE ROW LEVEL SECURITY;

-- Staff and Admin access policies
CREATE POLICY "Admins and staff can view co_founder_sessions"
    ON public.co_founder_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can insert co_founder_sessions"
    ON public.co_founder_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update co_founder_sessions"
    ON public.co_founder_sessions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can view co_founder_memories"
    ON public.co_founder_memories FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can insert co_founder_memories"
    ON public.co_founder_memories FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins and staff can update co_founder_memories"
    ON public.co_founder_memories FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );
