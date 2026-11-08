-- =============================================================================
-- Migration 0128: Ruhvi Workforce Performance Intelligence Engine
-- Purpose: Persistent event ledger, deterministic KPI records, quality evaluations,
--          achievement points ledger, alerts, and audit snapshots.
-- Blueprint Reference: Ruhvi Performance Intelligence Worker Blueprint
-- =============================================================================

-- 1. Workforce Members (AI Workers & Human Staff)
CREATE TABLE IF NOT EXISTS public.workforce_members (
  id text PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('AI_WORKER', 'HUMAN_STAFF')),
  name text NOT NULL,
  role_id text NOT NULL,
  department text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_members_entity ON public.workforce_members(entity_type);
CREATE INDEX IF NOT EXISTS idx_wf_members_active ON public.workforce_members(is_active);

-- Seed standard AI workers
INSERT INTO public.workforce_members (id, entity_type, name, role_id, is_active)
VALUES
  ('worker_analytics_performance', 'AI_WORKER', 'Analytics & Performance Worker', 'Analytics Specialist', true),
  ('worker_marketing', 'AI_WORKER', 'Marketing Worker', 'Growth & Campaigns', true),
  ('worker_seo', 'AI_WORKER', 'SEO Worker', 'Search Optimization', true),
  ('worker_product', 'AI_WORKER', 'Product Worker', 'Catalog & Pricing', true),
  ('worker_competitor_research', 'AI_WORKER', 'Competitor Research Worker', 'Market Intelligence', true),
  ('worker_sales_conversion', 'AI_WORKER', 'Sales & Conversion Worker', 'Funnel CRO', true),
  ('worker_customer_support', 'AI_WORKER', 'Customer Support Worker', 'Concierge & Support', true),
  ('worker_content_blog', 'AI_WORKER', 'Content & Blog Worker', 'Editorial & Content', true),
  ('worker_inventory', 'AI_WORKER', 'Inventory Worker', 'Warehouse & Stock', true),
  ('worker_review_feedback', 'AI_WORKER', 'Review & Feedback Worker', 'Sentiment & Quality', true),
  ('worker_execution', 'AI_WORKER', 'Execution Worker', 'Engineering & Workflow', true),
  ('worker_monitoring_verification', 'AI_WORKER', 'Monitoring Worker', 'Telemetry Verification', true),
  ('worker_orders_logistics', 'AI_WORKER', 'Orders & Logistics Worker', 'Shiprocket Fulfillment', true),
  ('worker_accounts_tax', 'AI_WORKER', 'Accounts & Tax Worker', 'GST & Financial Compliance', true),
  ('worker_performance_intelligence', 'AI_WORKER', 'Performance Intelligence Worker', 'Workforce Auditor', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 2. Performance Task Events (Append-Only Event Ledger)
CREATE TABLE IF NOT EXISTS public.workforce_task_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('AI_WORKER', 'HUMAN_STAFF')),
  member_id text NOT NULL,
  role_id text NOT NULL,
  task_id text NOT NULL,
  parent_task_id text,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source_system text NOT NULL,
  correlation_id text,
  priority text DEFAULT 'normal',
  complexity text DEFAULT 'normal',
  due_at timestamptz,
  duration_ms bigint,
  retry_count integer DEFAULT 0,
  tool_error_count integer DEFAULT 0,
  blocker_code text,
  verification_status text DEFAULT 'pending',
  evidence_refs text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  schema_version text NOT NULL DEFAULT '1.0.0'
);

CREATE INDEX IF NOT EXISTS idx_wf_task_events_member_time ON public.workforce_task_events(member_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_task_events_type_time ON public.workforce_task_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_task_events_task ON public.workforce_task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_wf_task_events_verification ON public.workforce_task_events(verification_status);

-- 3. Task Quality Evaluations
CREATE TABLE IF NOT EXISTS public.workforce_task_evaluations (
  evaluation_id text PRIMARY KEY,
  task_id text NOT NULL,
  member_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('AI_WORKER', 'HUMAN_STAFF')),
  status text NOT NULL DEFAULT 'VALID',
  overall_quality integer NOT NULL CHECK (overall_quality >= 0 AND overall_quality <= 100),
  dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  requirements_met text[] DEFAULT '{}',
  requirements_missed text[] DEFAULT '{}',
  possible_external_factors text[] DEFAULT '{}',
  review_required boolean NOT NULL DEFAULT false,
  rubric_version text NOT NULL DEFAULT '1.0.0',
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  evidence_refs text[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_wf_eval_task ON public.workforce_task_evaluations(task_id);
CREATE INDEX IF NOT EXISTS idx_wf_eval_member ON public.workforce_task_evaluations(member_id);

-- 4. Achievement Score Ledger (Append-Only Points Ledger)
CREATE TABLE IF NOT EXISTS public.workforce_score_ledger (
  id text PRIMARY KEY,
  member_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('AI_WORKER', 'HUMAN_STAFF')),
  task_id text NOT NULL,
  difficulty text NOT NULL,
  base_points integer NOT NULL,
  quality_multiplier numeric(4, 2) NOT NULL DEFAULT 1.0,
  final_points integer NOT NULL,
  is_reversal boolean NOT NULL DEFAULT false,
  reversal_reason text,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wf_points_member ON public.workforce_score_ledger(member_id);
CREATE INDEX IF NOT EXISTS idx_wf_points_task ON public.workforce_score_ledger(task_id);
CREATE INDEX IF NOT EXISTS idx_wf_points_idempotency ON public.workforce_score_ledger(idempotency_key);

-- 5. Performance Snapshots (Daily / Weekly / Monthly Scorecards)
CREATE TABLE IF NOT EXISTS public.workforce_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('AI_WORKER', 'HUMAN_STAFF')),
  role_id text NOT NULL,
  period_from timestamptz NOT NULL,
  period_to timestamptz NOT NULL,
  overall_score integer CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
  grade text NOT NULL,
  coverage_state text NOT NULL,
  confidence text NOT NULL,
  confidence_score numeric(4, 2) NOT NULL,
  weighted_coverage numeric(4, 2) NOT NULL,
  kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  task_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths text[] DEFAULT '{}',
  weaknesses text[] DEFAULT '{}',
  achievement_points integer NOT NULL DEFAULT 0,
  score_version text NOT NULL DEFAULT '1.0.0',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, period_from, period_to)
);

CREATE INDEX IF NOT EXISTS idx_wf_snapshots_member_period ON public.workforce_performance_snapshots(member_id, period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_wf_snapshots_calc_at ON public.workforce_performance_snapshots(calculated_at DESC);

-- 6. Workforce Operational Alerts
CREATE TABLE IF NOT EXISTS public.workforce_alerts (
  id text PRIMARY KEY,
  severity text NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'POSITIVE')),
  member_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('AI_WORKER', 'HUMAN_STAFF')),
  role_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  root_cause text NOT NULL,
  evidence_refs text[] DEFAULT '{}',
  recommended_action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wf_alerts_member ON public.workforce_alerts(member_id);
CREATE INDEX IF NOT EXISTS idx_wf_alerts_severity ON public.workforce_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_wf_alerts_resolved ON public.workforce_alerts(resolved_at);

-- 7. Audit Runs Log
CREATE TABLE IF NOT EXISTS public.workforce_audit_runs (
  id text PRIMARY KEY,
  report_type text NOT NULL,
  period_from timestamptz NOT NULL,
  period_to timestamptz NOT NULL,
  data_health_status text NOT NULL,
  population_summary jsonb NOT NULL,
  recommendations text[] DEFAULT '{}',
  audit_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_audit_runs_created ON public.workforce_audit_runs(created_at DESC);

-- 8. Enable Row Level Security (RLS) on all workforce tables
ALTER TABLE public.workforce_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_task_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_score_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_audit_runs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DO $$
BEGIN
  -- workforce_members policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_workforce_members') THEN
    CREATE POLICY service_role_all_workforce_members ON public.workforce_members FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- workforce_task_events policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_workforce_task_events') THEN
    CREATE POLICY service_role_all_workforce_task_events ON public.workforce_task_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- workforce_task_evaluations policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_workforce_task_evaluations') THEN
    CREATE POLICY service_role_all_workforce_task_evaluations ON public.workforce_task_evaluations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- workforce_score_ledger policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_workforce_score_ledger') THEN
    CREATE POLICY service_role_all_workforce_score_ledger ON public.workforce_score_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- workforce_performance_snapshots policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_workforce_performance_snapshots') THEN
    CREATE POLICY service_role_all_workforce_performance_snapshots ON public.workforce_performance_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- workforce_alerts policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_workforce_alerts') THEN
    CREATE POLICY service_role_all_workforce_alerts ON public.workforce_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- workforce_audit_runs policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_workforce_audit_runs') THEN
    CREATE POLICY service_role_all_workforce_audit_runs ON public.workforce_audit_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
