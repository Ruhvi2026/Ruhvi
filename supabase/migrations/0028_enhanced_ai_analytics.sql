-- Phase 28: Enhanced AI Analytics Columns
-- Adds credential_id tracking to ai_logs and extended observability
-- fields to ai_failure_diagnostics for per-credential analytics.

-- ============================================================
-- Enhance ai_logs with credential-level tracking
-- ============================================================
ALTER TABLE public.ai_logs
    ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES public.ai_provider_credentials(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS correlation_id TEXT,
    ADD COLUMN IF NOT EXISTS http_status_code INTEGER,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS user_identifier TEXT DEFAULT 'anonymous';

-- Indexes for per-credential analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_credential_id
    ON public.ai_logs (credential_id)
    WHERE credential_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at_desc
    ON public.ai_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_provider_created
    ON public.ai_logs (provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_status_created
    ON public.ai_logs (status, created_at DESC);

-- ============================================================
-- Enhance ai_failure_diagnostics with extended observability fields
-- ============================================================
ALTER TABLE public.ai_failure_diagnostics
    ADD COLUMN IF NOT EXISTS credential_id UUID,
    ADD COLUMN IF NOT EXISTS credential_name TEXT,
    ADD COLUMN IF NOT EXISTS correlation_id TEXT,
    ADD COLUMN IF NOT EXISTS http_status_code INTEGER,
    ADD COLUMN IF NOT EXISTS provider_error_code TEXT,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fallback_action TEXT,
    ADD COLUMN IF NOT EXISTS error_category TEXT;

-- Index for correlation ID lookups (tracing a request across fallback attempts)
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_correlation_id
    ON public.ai_failure_diagnostics (correlation_id)
    WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_credential_id
    ON public.ai_failure_diagnostics (credential_id)
    WHERE credential_id IS NOT NULL;

-- ============================================================
-- VIEW: per_credential_analytics
-- Aggregates request counts, success/failure rates per credential
-- ============================================================
CREATE OR REPLACE VIEW public.ai_credential_analytics AS
SELECT
    l.credential_id,
    c.display_name AS credential_name,
    c.provider_id,
    c.priority,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE l.status = 'success') AS successful_requests,
    COUNT(*) FILTER (WHERE l.status = 'failed') AS failed_requests,
    ROUND(
        (COUNT(*) FILTER (WHERE l.status = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100,
        2
    ) AS success_rate_percent,
    SUM(l.tokens_used) AS total_tokens,
    SUM(l.estimated_cost) AS total_cost,
    MAX(l.created_at) AS last_request_at
FROM public.ai_logs l
LEFT JOIN public.ai_provider_credentials c ON c.id = l.credential_id
WHERE l.credential_id IS NOT NULL
GROUP BY l.credential_id, c.display_name, c.provider_id, c.priority
ORDER BY c.provider_id, c.priority;

-- ============================================================
-- FUNCTION: get_analytics_summary
-- Returns aggregated analytics for a time window
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ai_analytics_summary(
    p_from TIMESTAMPTZ DEFAULT now() - interval '24 hours',
    p_to TIMESTAMPTZ DEFAULT now()
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_requests', COUNT(*),
        'successful_requests', COUNT(*) FILTER (WHERE status = 'success'),
        'failed_requests', COUNT(*) FILTER (WHERE status = 'failed'),
        'total_tokens', COALESCE(SUM(tokens_used), 0),
        'total_cost', COALESCE(SUM(estimated_cost), 0),
        'by_provider', (
            SELECT json_agg(row_to_json(p))
            FROM (
                SELECT provider, COUNT(*) as requests,
                       SUM(tokens_used) as tokens,
                       COUNT(*) FILTER (WHERE status = 'success') as successes
                FROM public.ai_logs
                WHERE created_at BETWEEN p_from AND p_to
                GROUP BY provider
            ) p
        ),
        'by_model', (
            SELECT json_agg(row_to_json(m))
            FROM (
                SELECT model, COUNT(*) as requests
                FROM public.ai_logs
                WHERE created_at BETWEEN p_from AND p_to
                GROUP BY model
                ORDER BY requests DESC
                LIMIT 10
            ) m
        )
    ) INTO result
    FROM public.ai_logs
    WHERE created_at BETWEEN p_from AND p_to;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
