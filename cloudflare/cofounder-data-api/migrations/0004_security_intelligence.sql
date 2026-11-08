-- ==============================================================================
-- Ruhvi AI Co-Founder — Production D1 Security Intelligence Schema
-- Migration: 0004_security_intelligence.sql
-- Database Engine: Cloudflare D1 (SQLite)
-- Target Databases: ruhvi-cofounder-prod, ruhvi-cofounder-staging, ruhvi-cofounder-dev
-- Architecture Reference: RUHVI_SECURITY_INTELLIGENCE_WORKER_IMPLEMENTATION_SPEC.md (Section 13)
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. SECURITY ASSETS
CREATE TABLE IF NOT EXISTS security_assets (
    id TEXT PRIMARY KEY,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('repository', 'subdomain', 'api_route', 'r2_bucket', 'database', 'external_service', 'payment_gateway', 'webhook_endpoint')),
    environment TEXT NOT NULL CHECK (environment IN ('prod', 'staging', 'dev')),
    canonical_ref TEXT NOT NULL,
    criticality TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
    owner TEXT NOT NULL DEFAULT 'co-founder',
    exposure TEXT NOT NULL DEFAULT 'internal' CHECK (exposure IN ('public', 'internal', 'partner', 'restricted')),
    last_verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_assets_env_type ON security_assets(environment, asset_type);
CREATE INDEX IF NOT EXISTS idx_sec_assets_ref ON security_assets(canonical_ref);

-- 2. SECURITY EVENT RECEIPTS (Durable Event Intake & Idempotency)
CREATE TABLE IF NOT EXISTS security_event_receipts (
    id TEXT PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('cloudflare_waf', 'nextjs_runtime', 'webhook_guard', 'clamav_scanner', 'ci_sast', 'ci_dast', 'manual')),
    environment TEXT NOT NULL CHECK (environment IN ('prod', 'staging', 'dev')),
    occurred_at TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    correlation_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'correlated', 'suppressed', 'escalated', 'closed')),
    payload_redacted_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sec_events_type_status ON security_event_receipts(event_type, status);
CREATE INDEX IF NOT EXISTS idx_sec_events_corr ON security_event_receipts(correlation_id);
CREATE INDEX IF NOT EXISTS idx_sec_events_received ON security_event_receipts(received_at);

-- 3. SECURITY EVENT OUTBOX (Reliable Dispatch & Retry Bookkeeping)
CREATE TABLE IF NOT EXISTS security_event_outbox (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    last_error_code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_outbox_queue ON security_event_outbox(status, next_attempt_at);

-- 4. SECURITY SCAN RUNS (CI/CD Scanner Run Metadata)
CREATE TABLE IF NOT EXISTS security_scan_runs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('trivy', 'semgrep', 'osv', 'gitleaks', 'zap', 'clamav', 'manual')),
    workflow TEXT NOT NULL,
    run_id TEXT NOT NULL,
    commit_sha TEXT,
    branch TEXT,
    environment TEXT NOT NULL CHECK (environment IN ('prod', 'staging', 'dev')),
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    scanner_versions TEXT, -- JSON
    summary_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_scans_provider ON security_scan_runs(provider, status);
CREATE INDEX IF NOT EXISTS idx_sec_scans_commit ON security_scan_runs(commit_sha);
CREATE INDEX IF NOT EXISTS idx_sec_scans_created ON security_scan_runs(created_at);

-- 5. SECURITY SCAN ARTIFACTS (R2 Artifact Pointers and Hashes)
CREATE TABLE IF NOT EXISTS security_scan_artifacts (
    id TEXT PRIMARY KEY,
    scan_run_id TEXT NOT NULL REFERENCES security_scan_runs(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('sarif', 'json', 'log', 'quarantined_file', 'evidence')),
    r2_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    redaction_status TEXT NOT NULL DEFAULT 'clean' CHECK (redaction_status IN ('clean', 'redacted', 'contains_quarantine', 'pending')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_artifacts_scan ON security_scan_artifacts(scan_run_id);
CREATE INDEX IF NOT EXISTS idx_sec_artifacts_sha ON security_scan_artifacts(sha256);

-- 6. SECURITY FINDINGS (Normalized Security Findings)
CREATE TABLE IF NOT EXISTS security_findings (
    id TEXT PRIMARY KEY,
    fingerprint TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('injection', 'auth', 'secret_leak', 'xss', 'misconfiguration', 'vulnerable_dep', 'malware', 'access_control', 'other')),
    title TEXT NOT NULL,
    description_redacted TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
    confidence REAL NOT NULL DEFAULT 1.0,
    asset_id TEXT REFERENCES security_assets(id) ON DELETE SET NULL,
    environment TEXT NOT NULL CHECK (environment IN ('prod', 'staging', 'dev')),
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'contained', 'remediated', 'false_positive', 'accepted_risk')),
    evidence_refs_json TEXT NOT NULL DEFAULT '[]',
    risk_factors_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sec_findings_sev_status ON security_findings(severity, status);
CREATE INDEX IF NOT EXISTS idx_sec_findings_cat ON security_findings(category);
CREATE INDEX IF NOT EXISTS idx_sec_findings_fingerprint ON security_findings(fingerprint);
CREATE INDEX IF NOT EXISTS idx_sec_findings_last_seen ON security_findings(last_seen_at);

-- 7. SECURITY INCIDENTS (Investigation & Response Cases)
CREATE TABLE IF NOT EXISTS security_incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('active_attack', 'data_exposure', 'credential_leak', 'malware_detected', 'policy_violation', 'dependency_cve', 'anomaly')),
    severity TEXT NOT NULL CHECK (severity IN ('P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW')),
    confidence REAL NOT NULL DEFAULT 1.0,
    state TEXT NOT NULL DEFAULT 'investigating' CHECK (state IN ('detected', 'investigating', 'containment_in_progress', 'contained', 'resolved', 'closed', 'dismissed')),
    first_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
    impact_summary TEXT,
    root_cause TEXT,
    timeline_json TEXT NOT NULL DEFAULT '[]',
    report_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sec_incidents_sev_state ON security_incidents(severity, state);
CREATE INDEX IF NOT EXISTS idx_sec_incidents_last_act ON security_incidents(last_activity_at);

-- 8. SECURITY INCIDENT FINDINGS LINK
CREATE TABLE IF NOT EXISTS security_incident_findings (
    incident_id TEXT NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    finding_id TEXT NOT NULL REFERENCES security_findings(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (incident_id, finding_id)
);

-- 9. SECURITY EVIDENCE
CREATE TABLE IF NOT EXISTS security_evidence (
    id TEXT PRIMARY KEY,
    incident_id TEXT REFERENCES security_incidents(id) ON DELETE SET NULL,
    finding_id TEXT REFERENCES security_findings(id) ON DELETE SET NULL,
    evidence_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    r2_key TEXT,
    sha256 TEXT,
    redaction_status TEXT NOT NULL DEFAULT 'clean',
    retention_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_evidence_inc ON security_evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_sec_evidence_find ON security_evidence(finding_id);

-- 10. SECURITY ACTION PROPOSALS (Playbook & Action Proposals)
CREATE TABLE IF NOT EXISTS security_action_proposals (
    id TEXT PRIMARY KEY,
    incident_id TEXT REFERENCES security_incidents(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('quarantine_file', 'reject_webhook', 'rate_limit_ip', 'temporary_ip_block', 'revoke_session', 'disable_account', 'rotate_secret', 'waf_rule_update')),
    target_ref TEXT NOT NULL,
    scope_json TEXT NOT NULL DEFAULT '{}',
    risk_level TEXT NOT NULL CHECK (risk_level IN ('T0_READ', 'T1_REVERSIBLE_CONTAINMENT', 'T2_DISRUPTIVE', 'T3_CRITICAL')),
    confidence REAL NOT NULL DEFAULT 1.0,
    policy_key TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    approval_id TEXT,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'executed', 'failed', 'expired', 'rolled_back')),
    expires_at TEXT,
    rollback_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_proposals_status ON security_action_proposals(status, risk_level);
CREATE INDEX IF NOT EXISTS idx_sec_proposals_idem ON security_action_proposals(idempotency_key);

-- 11. SECURITY ACTION EXECUTIONS
CREATE TABLE IF NOT EXISTS security_action_executions (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL REFERENCES security_action_proposals(id) ON DELETE CASCADE,
    executor TEXT NOT NULL CHECK (executor IN ('worker_security_intelligence', 'co-founder', 'human_owner')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    provider_ref TEXT,
    result_redacted_json TEXT NOT NULL DEFAULT '{}',
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified_effective', 'ineffective', 'partially_effective')),
    rollback_status TEXT NOT NULL DEFAULT 'none' CHECK (rollback_status IN ('none', 'requested', 'in_progress', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_sec_exec_proposal ON security_action_executions(proposal_id);

-- 12. SECURITY APPROVAL EVENTS
CREATE TABLE IF NOT EXISTS security_approval_events (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL REFERENCES security_action_proposals(id) ON DELETE CASCADE,
    cofounder_approval_id TEXT,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'TIMEOUT', 'CANCELLED')),
    reviewed_by_ref TEXT NOT NULL,
    reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    reason_redacted TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_approval_prop ON security_approval_events(proposal_id);

-- 13. SECURITY AUDIT LOG (Append-only Security Ledger)
CREATE TABLE IF NOT EXISTS security_audit_log (
    id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'worker_security', 'co-founder', 'owner', 'ci_runner')),
    actor_ref TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    decision TEXT NOT NULL DEFAULT 'ALLOW',
    correlation_id TEXT,
    details_redacted_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_audit_actor ON security_audit_log(actor_type, action);
CREATE INDEX IF NOT EXISTS idx_sec_audit_resource ON security_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_sec_audit_created ON security_audit_log(created_at);

-- 14. SECURITY POLICY VERSIONS
CREATE TABLE IF NOT EXISTS security_policy_versions (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    policy_hash TEXT NOT NULL,
    policy_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    activated_at TEXT
);

-- 15. SECURITY BLOCKED ENTITIES (Temporary IP / Token / Entity Blocks)
CREATE TABLE IF NOT EXISTS security_blocked_entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('ip', 'asn', 'user_id', 'session_id', 'fingerprint')),
    entity_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    risk_level TEXT NOT NULL DEFAULT 'T1_REVERSIBLE_CONTAINMENT',
    blocked_by TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_blocked_lookup ON security_blocked_entities(entity_type, entity_value, status);
CREATE INDEX IF NOT EXISTS idx_sec_blocked_exp ON security_blocked_entities(expires_at);

-- 16. SECURITY QUARANTINE RECORDS (Uploaded / Suspicious File Quarantine Registry)
CREATE TABLE IF NOT EXISTS security_quarantine_records (
    id TEXT PRIMARY KEY,
    original_filename TEXT NOT NULL,
    original_mime TEXT NOT NULL,
    detected_mime TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    sha256 TEXT NOT NULL UNIQUE,
    quarantine_r2_key TEXT NOT NULL,
    threat_summary TEXT NOT NULL,
    detection_source TEXT NOT NULL CHECK (detection_source IN ('magic_byte_analyzer', 'clamav', 'svg_script_detector', 'metadata_exploit')),
    uploader_ref TEXT,
    status TEXT NOT NULL DEFAULT 'quarantined' CHECK (status IN ('quarantined', 'cleared', 'destroyed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_quarantine_sha ON security_quarantine_records(sha256);
CREATE INDEX IF NOT EXISTS idx_sec_quarantine_status ON security_quarantine_records(status);
