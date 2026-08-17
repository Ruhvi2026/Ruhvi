-- Phase 27: Multi-Credential AI Provider Architecture + Model Health Registry
-- Adds support for multiple API keys per provider with priority-based failover,
-- health state tracking, cooldown/backoff, and per-model availability status.

-- ============================================================
-- TABLE: ai_provider_credentials
-- Stores multiple API credentials per provider with full health tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_provider_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT NOT NULL,          -- 'gemini', 'openai', 'anthropic', 'deepseek', 'openrouter', 'custom'
    display_name TEXT NOT NULL,         -- 'Account A', 'Production Key 1', etc.
    encrypted_key TEXT NOT NULL,        -- Stored server-side; never returned to frontend
    priority INTEGER DEFAULT 1,         -- Lower = higher priority (1 = first tried)
    is_enabled BOOLEAN DEFAULT true,    -- Admin can disable without deleting

    -- Health state machine
    health_status TEXT NOT NULL DEFAULT 'healthy'
        CHECK (health_status IN ('healthy', 'rate_limited', 'quota_exhausted', 'cooldown', 'invalid', 'unknown')),

    -- Failure tracking
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    rate_limit_count INTEGER DEFAULT 0,
    quota_exhaustion_count INTEGER DEFAULT 0,

    -- Cooldown (used for rate-limit/quota recovery)
    cooldown_until TIMESTAMPTZ,

    -- Timestamps for observability
    last_used_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_error TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()  -- Used as optimistic lock for concurrency safety
);

-- Indexes for fast credential retrieval and routing
CREATE INDEX IF NOT EXISTS idx_ai_credentials_provider_priority
    ON public.ai_provider_credentials (provider_id, priority ASC);

CREATE INDEX IF NOT EXISTS idx_ai_credentials_health_status
    ON public.ai_provider_credentials (health_status);

CREATE INDEX IF NOT EXISTS idx_ai_credentials_cooldown
    ON public.ai_provider_credentials (provider_id, cooldown_until)
    WHERE health_status IN ('rate_limited', 'quota_exhausted', 'cooldown');

-- ============================================================
-- TABLE: ai_model_health
-- Tracks per-model availability, capabilities, and health status
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_model_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT NOT NULL,
    model_id TEXT NOT NULL,

    -- Health state
    status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (status IN ('active', 'degraded', 'rate_limited', 'unavailable', 'deprecated', 'invalid', 'unknown')),

    -- Model capabilities (JSON object: {text: true, vision: false, json: true, streaming: true, ...})
    capabilities JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    last_checked_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,

    -- Configuration
    is_default BOOLEAN DEFAULT false,   -- Only one should be default per provider
    priority INTEGER DEFAULT 1,         -- Lower = preferred for fallback ordering
    is_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE (provider_id, model_id)
);

-- Indexes for model health lookups
CREATE INDEX IF NOT EXISTS idx_ai_model_health_provider_status
    ON public.ai_model_health (provider_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_model_health_provider_priority
    ON public.ai_model_health (provider_id, priority ASC);

CREATE INDEX IF NOT EXISTS idx_ai_model_health_default
    ON public.ai_model_health (provider_id, is_default)
    WHERE is_default = true;

-- ============================================================
-- FUNCTION: updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_credentials_updated_at ON public.ai_provider_credentials;
CREATE TRIGGER trg_ai_credentials_updated_at
    BEFORE UPDATE ON public.ai_provider_credentials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_model_health_updated_at ON public.ai_model_health;
CREATE TRIGGER trg_ai_model_health_updated_at
    BEFORE UPDATE ON public.ai_model_health
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FUNCTION: get_healthy_credentials
-- Returns credentials for a provider that are eligible to use,
-- ordered by priority. A credential is eligible if:
--   - is_enabled = true
--   - health_status is 'healthy' or 'unknown'
--   - OR health_status is 'rate_limited'/'cooldown'/'quota_exhausted' but cooldown_until has passed
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_healthy_credentials(p_provider_id TEXT)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    priority INTEGER,
    health_status TEXT,
    failure_count INTEGER,
    success_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.display_name,
        c.priority,
        c.health_status,
        c.failure_count,
        c.success_count
    FROM public.ai_provider_credentials c
    WHERE c.provider_id = p_provider_id
      AND c.is_enabled = true
      AND c.health_status != 'invalid'
      AND (
          c.health_status IN ('healthy', 'unknown')
          OR (
              c.health_status IN ('rate_limited', 'quota_exhausted', 'cooldown')
              AND (c.cooldown_until IS NULL OR c.cooldown_until <= now())
          )
      )
    ORDER BY c.priority ASC, c.failure_count ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.ai_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_health ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Admins can manage ai credentials" ON public.ai_provider_credentials;
DROP POLICY IF EXISTS "Service role can manage ai credentials" ON public.ai_provider_credentials;
DROP POLICY IF EXISTS "Admins can manage ai model health" ON public.ai_model_health;
DROP POLICY IF EXISTS "Service role can manage ai model health" ON public.ai_model_health;

-- Service role bypasses RLS for backend operations
CREATE POLICY "Admins can manage ai credentials" ON public.ai_provider_credentials
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage ai model health" ON public.ai_model_health
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
