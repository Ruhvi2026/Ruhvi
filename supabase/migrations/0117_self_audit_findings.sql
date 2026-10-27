-- ============================================================================
-- 0117_self_audit_findings.sql (TRACK J - PHASE 49)
-- ============================================================================
-- Persistent finding storage and deduplication schema for the Self-Auditing
-- Architecture.
--
-- Safety Guarantees:
-- 1. Strictly stores sanitized metadata; zero secrets or PII.
-- 2. Unique index on `fingerprint` enforces deterministic deduplication.
-- 3. Row-Level Security (RLS) restricts access to internal staff roles.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.self_audit_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT NOT NULL UNIQUE,
    check_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('architecture', 'integration', 'configuration', 'security', 'performance', 'ai_health')),
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    evidence_source TEXT NOT NULL,
    remediation_hint TEXT,
    sanitized_observed_value JSONB DEFAULT '{}'::jsonb,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_reason TEXT,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid administrative querying
CREATE INDEX IF NOT EXISTS idx_self_audit_findings_status ON public.self_audit_findings(status);
CREATE INDEX IF NOT EXISTS idx_self_audit_findings_category ON public.self_audit_findings(category);
CREATE INDEX IF NOT EXISTS idx_self_audit_findings_severity ON public.self_audit_findings(severity);
CREATE INDEX IF NOT EXISTS idx_self_audit_findings_last_seen ON public.self_audit_findings(last_seen_at DESC);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.self_audit_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Internal staff can view self-audit findings
CREATE POLICY "Staff can view self audit findings"
    ON public.self_audit_findings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'admin', 'manager', 'staff')
        )
    );

-- RLS Policy: Admins and super_admins can acknowledge or resolve findings
CREATE POLICY "Admins can update self audit findings"
    ON public.self_audit_findings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'admin', 'manager')
        )
    );
