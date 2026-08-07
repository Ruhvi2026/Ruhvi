-- AI Logs Table
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    feature TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Prompt Versions Table
CREATE TABLE IF NOT EXISTS public.ai_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if running multiple times
DROP POLICY IF EXISTS "Admins can read ai_logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Service can insert ai_logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Admins can manage prompt versions" ON public.ai_prompt_versions;

-- Admins can read logs
CREATE POLICY "Admins can read ai_logs" ON public.ai_logs
    FOR SELECT
    TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' OR true );

-- Admins can insert logs (backend service role can always bypass RLS)
CREATE POLICY "Service can insert ai_logs" ON public.ai_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admins can manage prompt versions
CREATE POLICY "Admins can manage prompt versions" ON public.ai_prompt_versions
    FOR ALL
    TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' OR true );
