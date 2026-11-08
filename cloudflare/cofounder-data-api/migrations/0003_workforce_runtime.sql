-- ==============================================================================
-- Ruhvi AI Co-Founder — Production D1 Workforce Runtime Schema (WF-GAP-003)
-- Version: 1.0.0
-- Database Engine: Cloudflare D1 (SQLite)
-- Architecture Reference: Workforce Runbook Section 6 (WF-GAP-003, WF-GAP-004, WF-GAP-005)
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. WORKFORCE SIGNALS (Normalized Event Ingestion)
CREATE TABLE IF NOT EXISTS workforce_signals (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('proactive_scan', 'business_event', 'cron', 'owner_directive', 'webhook')),
    source_ref TEXT,
    fingerprint TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    trust_label TEXT NOT NULL DEFAULT 'UNTRUSTED_EXTERNAL' CHECK (trust_label IN ('OWNER', 'VERIFIED_SYSTEM', 'UNTRUSTED_EXTERNAL', 'WORKER_DRAFT', 'EVALUATED')),
    domain TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'expired')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_signals_fingerprint ON workforce_signals(fingerprint);
CREATE INDEX IF NOT EXISTS idx_wf_signals_status ON workforce_signals(status);
CREATE INDEX IF NOT EXISTS idx_wf_signals_created_at ON workforce_signals(created_at);

-- 2. WORKFORCE GOALS (Candidate, Accepted, Planned, Completed)
CREATE TABLE IF NOT EXISTS workforce_goals (
    id TEXT PRIMARY KEY,
    signal_id TEXT REFERENCES workforce_signals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    score REAL NOT NULL DEFAULT 0.0,
    confidence REAL NOT NULL DEFAULT 1.0,
    effort REAL NOT NULL DEFAULT 1.0,
    risk REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'CANDIDATE' CHECK (status IN (
        'CANDIDATE', 'ACCEPTED', 'PLANNED', 'QUEUED', 'ACTIVE', 'COMPLETED',
        'REJECTED', 'DEFERRED', 'EXPIRED', 'CANCELLED', 'FAILED', 'SUPERSEDED'
    )),
    evidence_refs TEXT, -- JSON Array
    cooldown_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_goals_status ON workforce_goals(status);
CREATE INDEX IF NOT EXISTS idx_wf_goals_worker ON workforce_goals(worker_id);
CREATE INDEX IF NOT EXISTS idx_wf_goals_created_at ON workforce_goals(created_at);

-- 3. WORKFORCE PLANS (Validated Execution DAGs)
CREATE TABLE IF NOT EXISTS workforce_plans (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES workforce_goals(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL DEFAULT '1.0.0',
    user_goal TEXT NOT NULL,
    intent TEXT NOT NULL,
    stages_json TEXT NOT NULL,
    all_steps_json TEXT NOT NULL,
    conflicts_json TEXT NOT NULL DEFAULT '[]',
    risk_tier TEXT NOT NULL DEFAULT 'T1' CHECK (risk_tier IN ('T0', 'T1', 'T2', 'T3')),
    status TEXT NOT NULL DEFAULT 'VALIDATED' CHECK (status IN ('VALIDATED', 'ACTIVE', 'PAUSED_FOR_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_plans_goal ON workforce_plans(goal_id);
CREATE INDEX IF NOT EXISTS idx_wf_plans_status ON workforce_plans(status);

-- 4. WORKFORCE TASKS (Durable Execution Units with Atomic Lease/Claims)
CREATE TABLE IF NOT EXISTS workforce_tasks (
    id TEXT PRIMARY KEY,
    plan_id TEXT REFERENCES workforce_plans(id) ON DELETE SET NULL,
    goal_id TEXT REFERENCES workforce_goals(id) ON DELETE SET NULL,
    worker_id TEXT NOT NULL,
    title TEXT NOT NULL,
    task_input TEXT NOT NULL, -- JSON
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
        'QUEUED', 'LEASED', 'RUNNING', 'AWAITING_APPROVAL', 'RETRY_WAIT',
        'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER'
    )),
    priority INTEGER NOT NULL DEFAULT 5, -- 1 (highest) to 10 (lowest)
    lease_owner TEXT,
    lease_expires_at TEXT,
    heartbeat_at TEXT,
    attempt INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    approval_id TEXT,
    effective_scope TEXT NOT NULL DEFAULT '["read_only"]', -- JSON Array
    trust_label TEXT NOT NULL DEFAULT 'VERIFIED_SYSTEM' CHECK (trust_label IN ('OWNER', 'VERIFIED_SYSTEM', 'UNTRUSTED_EXTERNAL', 'WORKER_DRAFT', 'EVALUATED')),
    deadline_at TEXT,
    output_ref TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_tasks_queue ON workforce_tasks(status, priority, lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_worker ON workforce_tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_plan ON workforce_tasks(plan_id);

-- 5. WORKFORCE TASK STEPS
CREATE TABLE IF NOT EXISTS workforce_task_steps (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES workforce_tasks(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    stage_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'READY', 'RUNNING', 'AWAITING_APPROVAL', 'RETRY_WAIT',
        'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED', 'INCONCLUSIVE'
    )),
    depends_on TEXT NOT NULL DEFAULT '[]', -- JSON Array
    output_json TEXT,
    error TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_task_steps_task ON workforce_task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_wf_task_steps_status ON workforce_task_steps(status);

-- 6. WORKFORCE CHECKPOINTS (Resumable Execution State)
CREATE TABLE IF NOT EXISTS workforce_checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES workforce_tasks(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    attempt INTEGER NOT NULL DEFAULT 1,
    checkpoint_data TEXT NOT NULL, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_checkpoints_task ON workforce_checkpoints(task_id);

-- 7. WORKFORCE DELEGATIONS (Durable Parent/Child Hierarchy with Max Depth 2)
CREATE TABLE IF NOT EXISTS workforce_delegations (
    id TEXT PRIMARY KEY,
    parent_task_id TEXT NOT NULL REFERENCES workforce_tasks(id) ON DELETE CASCADE,
    child_task_id TEXT NOT NULL REFERENCES workforce_tasks(id) ON DELETE CASCADE,
    parent_worker_id TEXT NOT NULL,
    child_worker_id TEXT NOT NULL,
    depth INTEGER NOT NULL DEFAULT 1 CHECK (depth <= 2),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
    effective_scope TEXT NOT NULL, -- JSON Array (intersected)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_delegations_parent ON workforce_delegations(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_wf_delegations_child ON workforce_delegations(child_task_id);

-- 8. WORKFORCE AGENT MESSAGES
CREATE TABLE IF NOT EXISTS workforce_agent_messages (
    id TEXT PRIMARY KEY,
    correlation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    task_id TEXT REFERENCES workforce_tasks(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('request', 'response', 'notification', 'heartbeat', 'cancellation')),
    payload TEXT NOT NULL, -- JSON
    trust_label TEXT NOT NULL DEFAULT 'VERIFIED_SYSTEM',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_messages_corr ON workforce_agent_messages(correlation_id);
CREATE INDEX IF NOT EXISTS idx_wf_messages_recipient ON workforce_agent_messages(recipient_id);

-- 9. WORKFORCE OUTBOX (Reliable Cross-boundary Event Publication)
CREATE TABLE IF NOT EXISTS workforce_outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_outbox_queue ON workforce_outbox(status, next_retry_at);

-- 10. WORKFORCE DEAD LETTERS (Poison Task Vault with Replay Controls)
CREATE TABLE IF NOT EXISTS workforce_dead_letters (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    failure_class TEXT NOT NULL,
    error_message TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 3,
    payload TEXT NOT NULL, -- JSON
    replay_status TEXT NOT NULL DEFAULT 'unplayed' CHECK (replay_status IN ('unplayed', 'replaying', 'replayed', 'discarded')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_dead_letters_task ON workforce_dead_letters(task_id);
CREATE INDEX IF NOT EXISTS idx_wf_dead_letters_replay ON workforce_dead_letters(replay_status);

-- 11. WORKFORCE CONTROLS (Server-side Kill Switches & Pause Flags)
CREATE TABLE IF NOT EXISTS workforce_controls (
    id TEXT PRIMARY KEY,
    control_key TEXT UNIQUE NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1, -- 1: active/enabled, 0: paused/disabled
    reason TEXT,
    updated_by TEXT NOT NULL DEFAULT 'system',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wf_controls_key ON workforce_controls(control_key);
