-- Migration 0120_order_events_idempotency.sql
-- Enforces database-level idempotency on order_events to eliminate check-then-insert races.

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_events_idempotency_key
ON public.order_events ((metadata->>'idempotency_key'))
WHERE (metadata->>'idempotency_key') IS NOT NULL;

