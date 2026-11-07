-- ==============================================================================
-- Ruhvi AI Co-Founder — Production D1 Initial Schema
-- Version: 1.0.0
-- Database Engine: Cloudflare D1 (SQLite)
-- Target Databases: ruhvi-cofounder-prod, ruhvi-cofounder-staging, ruhvi-cofounder-dev
-- Architecture Reference: Blueprint Section 5 (Logical Data Model) & Section 10
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- 1. MEMORY SUBSYSTEM (Explicit User Instructions & Verified Lessons)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memory_items (
    id TEXT PRIMARY KEY,
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'user_instruction',
        'user_preference',
        'project_memory',
        'episodic_memory',
        'candidate_lesson',
        'verified_lesson',
        'research_memory'
    )),
    scope TEXT NOT NULL DEFAULT 'global',
    content TEXT NOT NULL,
    normalized_key TEXT,
    source TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deprecated', 'expired')),
    priority INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_accessed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memory_items_lookup 
    ON memory_items (memory_type, scope, status);

CREATE INDEX IF NOT EXISTS idx_memory_items_updated 
    ON memory_items (updated_at);

CREATE INDEX IF NOT EXISTS idx_memory_items_key 
    ON memory_items (normalized_key);


CREATE TABLE IF NOT EXISTS memory_versions (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    content TEXT NOT NULL,
    change_reason TEXT,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'agent')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_versions_memory_id 
    ON memory_versions (memory_id);


CREATE TABLE IF NOT EXISTS memory_relations (
    id TEXT PRIMARY KEY,
    source_memory_id TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    target_memory_id TEXT NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_relations_source 
    ON memory_relations (source_memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_relations_target 
    ON memory_relations (target_memory_id);


CREATE TABLE IF NOT EXISTS candidate_lessons (
    id TEXT PRIMARY KEY,
    lesson TEXT NOT NULL,
    observed_failure TEXT,
    evidence_refs TEXT, -- JSON array of source references/IDs
    confidence REAL NOT NULL DEFAULT 0.5,
    test_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_evaluation', 'promoted', 'rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_candidate_lessons_status 
    ON candidate_lessons (status);


CREATE TABLE IF NOT EXISTS verified_lessons (
    id TEXT PRIMARY KEY,
    candidate_id TEXT REFERENCES candidate_lessons(id) ON DELETE SET NULL,
    lesson TEXT NOT NULL,
    verification_summary TEXT NOT NULL,
    evidence_refs TEXT,
    verified_at TEXT NOT NULL DEFAULT (datetime('now')),
    review_after TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deprecated'))
);

CREATE INDEX IF NOT EXISTS idx_verified_lessons_status 
    ON verified_lessons (status);

-- ------------------------------------------------------------------------------
-- 2. AGENT RUNS, WORKER EXECUTION & TELEMETRY
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    model_route TEXT,
    correlation_id TEXT NOT NULL,
    outcome_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_correlation 
    ON agent_runs (correlation_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_status 
    ON agent_runs (status);


CREATE TABLE IF NOT EXISTS worker_runs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL,
    parent_worker_id TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
    attempt INTEGER NOT NULL DEFAULT 1,
    input_hash TEXT,
    output_summary TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_worker_runs_run_id 
    ON worker_runs (run_id);

CREATE INDEX IF NOT EXISTS idx_worker_runs_worker_id 
    ON worker_runs (worker_id);


CREATE TABLE IF NOT EXISTS run_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    worker_run_id TEXT REFERENCES worker_runs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_json TEXT NOT NULL, -- Redacted compact JSON payload (no secrets/PII)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_run_events_lookup 
    ON run_events (run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_run_events_worker 
    ON run_events (worker_run_id);


CREATE TABLE IF NOT EXISTS tool_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    scope TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 1 CHECK (success IN (0, 1)),
    latency_ms INTEGER,
    error_code TEXT,
    result_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tool_events_run_id 
    ON tool_events (run_id);

CREATE INDEX IF NOT EXISTS idx_tool_events_name 
    ON tool_events (tool_name);


CREATE TABLE IF NOT EXISTS worker_snapshots (
    worker_id TEXT NOT NULL,
    version TEXT NOT NULL,
    capabilities_json TEXT NOT NULL,
    allowed_tools_json TEXT NOT NULL,
    parent_id TEXT,
    source_commit TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (worker_id, version)
);


CREATE TABLE IF NOT EXISTS worker_proposals (
    id TEXT PRIMARY KEY,
    proposed_worker_id TEXT NOT NULL,
    parent_worker_id TEXT,
    purpose TEXT NOT NULL,
    capabilities TEXT NOT NULL,
    tool_needs TEXT NOT NULL,
    budget TEXT,
    risk TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'implemented')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------------------------
-- 3. RESEARCH & RSI (RECURSIVE SELF-IMPROVEMENT) GOVERNANCE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS research_projects (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    scope TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);


CREATE TABLE IF NOT EXISTS research_sources (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    url_hash TEXT NOT NULL,
    title TEXT,
    publisher TEXT,
    published_at TEXT,
    retrieved_at TEXT NOT NULL DEFAULT (datetime('now')),
    license TEXT,
    source_type TEXT,
    reliability_score REAL NOT NULL DEFAULT 1.0,
    artifact_key TEXT -- R2 object key
);

CREATE INDEX IF NOT EXISTS idx_research_sources_project_url 
    ON research_sources (project_id, url_hash);


CREATE TABLE IF NOT EXISTS research_findings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    finding TEXT NOT NULL,
    evidence_source_ids TEXT, -- JSON array of research_sources IDs
    confidence REAL NOT NULL DEFAULT 1.0,
    limitations TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS capability_gaps (
    id TEXT PRIMARY KEY,
    area TEXT NOT NULL,
    observed_gap TEXT NOT NULL,
    evidence TEXT,
    impact TEXT,
    risk TEXT,
    status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'under_research', 'proposal_ready', 'resolved', 'wont_fix')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS upgrade_proposals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    problem TEXT NOT NULL,
    design TEXT NOT NULL,
    benefit TEXT NOT NULL,
    risk TEXT NOT NULL,
    cost_estimate TEXT,
    sources TEXT,
    test_plan TEXT,
    rollback_plan TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'owner_approved', 'owner_rejected', 'deployed', 'verified')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS approval_events (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL REFERENCES upgrade_proposals(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'revision_requested')),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------------------------
-- 4. EVALUATION & BENCHMARKING
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eval_suites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    purpose TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS eval_cases (
    id TEXT PRIMARY KEY,
    suite_id TEXT NOT NULL REFERENCES eval_suites(id) ON DELETE CASCADE,
    input_ref TEXT NOT NULL,
    expected_behaviour TEXT NOT NULL,
    tags TEXT,
    synthetic_data TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS eval_runs (
    id TEXT PRIMARY KEY,
    suite_id TEXT NOT NULL REFERENCES eval_suites(id) ON DELETE CASCADE,
    candidate_version TEXT NOT NULL,
    baseline_version TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'passed', 'failed', 'error'))
);


CREATE TABLE IF NOT EXISTS eval_results (
    id TEXT PRIMARY KEY,
    eval_run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
    case_id TEXT NOT NULL REFERENCES eval_cases(id) ON DELETE CASCADE,
    score REAL NOT NULL,
    passed INTEGER NOT NULL DEFAULT 1 CHECK (passed IN (0, 1)),
    failure_class TEXT,
    result_summary TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------------------------
-- 5. AUDIT, IDEMPOTENCY & USAGE TELEMETRY
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    decision TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_events_correlation 
    ON audit_events (correlation_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_created 
    ON audit_events (created_at);


CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    result_ref TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires 
    ON idempotency_keys (expires_at);


CREATE TABLE IF NOT EXISTS daily_usage (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL, -- YYYY-MM-DD
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    requests INTEGER NOT NULL DEFAULT 0,
    tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost REAL NOT NULL DEFAULT 0.0,
    worker_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE (date, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_date 
    ON daily_usage (date);

