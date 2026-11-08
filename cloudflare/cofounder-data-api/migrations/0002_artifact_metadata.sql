-- Migration: 0002_artifact_metadata.sql
-- Dedicated metadata table for R2 stored artifacts

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    r2_key TEXT UNIQUE NOT NULL,
    environment TEXT NOT NULL DEFAULT 'production',
    artifact_type TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    owner_id TEXT,
    file_name TEXT,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    checksum_sha256 TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    retention_until TEXT,
    correlation_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_scope ON artifacts(scope);
CREATE INDEX IF NOT EXISTS idx_artifacts_environment ON artifacts(environment);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at);
