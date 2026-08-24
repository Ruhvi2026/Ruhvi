-- =============================================================================
-- 0053_whatsapp_recipient_log.sql
-- Persists the last business-initiated WhatsApp message timestamp per phone so
-- the 24h per-recipient cooldown survives restarts and works across multiple
-- serverless instances (an in-memory Map resets on every deploy/instance).
-- Accessed only via the service-role admin client, so RLS is enabled with no
-- policies.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_recipient_log (
  phone TEXT PRIMARY KEY,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_recipient_log ENABLE ROW LEVEL SECURITY;
