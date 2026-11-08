-- =============================================================================
-- Migration 0129: Add Security Intelligence Worker to Workforce Roster
-- Parity Reference: RUHVI_DEEP_IMPLEMENTATION_AUDIT_2026-11-08.md (PERF-10)
-- =============================================================================

INSERT INTO public.workforce_members (id, entity_type, name, role_id, is_active)
VALUES
  ('worker_security_intelligence', 'AI_WORKER', 'Security Intelligence Worker', 'Autonomous Defense & Governance Auditor', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();
