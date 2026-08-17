-- Migration 0031: Add latency_ms column to ai_logs for real P95 latency analytics
-- This is a non-breaking additive change with a default of NULL.

ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT NULL;

-- Index to support percentile queries per provider
CREATE INDEX IF NOT EXISTS idx_ai_logs_latency_provider
  ON ai_logs (provider, latency_ms)
  WHERE latency_ms IS NOT NULL;

COMMENT ON COLUMN ai_logs.latency_ms IS
  'End-to-end request latency in milliseconds, written by the routing engine on every attempt.';
