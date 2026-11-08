export type MemoryType =
  | 'user_instruction'
  | 'user_preference'
  | 'project_memory'
  | 'episodic_memory'
  | 'candidate_lesson'
  | 'verified_lesson'
  | 'research_memory';

export type MemoryStatus = 'active' | 'archived' | 'deprecated' | 'expired';

export interface ExplicitMemoryPayload {
  id?: string;
  content: string;
  memory_type?: MemoryType;
  scope?: string;
  normalized_key?: string;
  source?: string;
  priority?: number;
}

export interface MemorySearchParams {
  type?: MemoryType;
  scope?: string;
  limit?: number;
}

export interface CandidateLessonPayload {
  lesson: string;
  observed_failure?: string;
  evidence_refs?: string[];
  confidence?: number;
}

export interface VerifyLessonPayload {
  candidate_id: string;
  verification_summary: string;
  evidence_refs?: string[];
}

export interface AgentRunPayload {
  id?: string;
  task_type: string;
  model_route?: string;
  correlation_id?: string;
  outcome_summary?: string;
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface RunEventPayload {
  worker_run_id?: string;
  event_type: string;
  event_json: Record<string, any> | string;
}

export interface WorkerProposalPayload {
  proposed_worker_id: string;
  parent_worker_id?: string;
  purpose: string;
  capabilities: string;
  tool_needs: string;
  budget?: string;
  risk?: string;
}

export interface ResearchProjectPayload {
  question: string;
  scope?: string;
  findings?: Array<{
    finding: string;
    evidence_source_ids?: string[];
    confidence?: number;
  }>;
  sources?: any[];
}

export interface UpgradeProposalPayload {
  title: string;
  problem: string;
  design: string;
  benefit: string;
  risk: string;
  cost_estimate?: string;
  test_plan?: string;
  rollback_plan?: string;
}

export interface PresignArtifactPayload {
  artifact_type?: string;
  file_name?: string;
  content_type?: string;
}

export interface CapabilityGapPayload {
  title: string;
  description: string;
  category?: string;
  evidence_refs?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface EvaluationRunPayload {
  suite_id?: string;
  model_alias?: string;
  candidate_version?: string;
  baseline_version?: string;
  eval_type?: string;
  status?: 'running' | 'completed' | 'passed' | 'failed' | 'error';
  score?: number;
  metrics?: Record<string, any>;
}

export interface WorkerSnapshotPayload {
  worker_id: string;
  version?: string;
  capabilities: string[] | string;
  allowed_tools: string[] | string;
  parent_id?: string | null;
  source_commit?: string | null;
}

export interface WorkerRunPayload {
  id?: string;
  run_id: string;
  worker_id: string;
  parent_worker_id?: string | null;
  status?: 'running' | 'completed' | 'failed';
  attempt?: number;
  input_hash?: string;
  output_summary?: string;
}

export interface ToolEventPayload {
  id?: string;
  run_id: string;
  worker_id: string;
  tool_name: string;
  scope?: string;
  success?: boolean;
  latency_ms?: number;
  error_code?: string;
  result_ref?: string;
}

export interface EvaluationSuitePayload {
  id?: string;
  name: string;
  version?: string;
  purpose: string;
  approved_by?: string;
}

export interface EvaluationCasePayload {
  id?: string;
  input_ref: string;
  expected_behaviour: string;
  tags?: string[];
  synthetic_data?: any;
}

export interface EvaluationResultPayload {
  id?: string;
  case_id: string;
  score: number;
  passed?: boolean;
  failure_class?: string;
  result_summary?: string;
}

export interface ProposalDecisionPayload {
  decision:
    | 'approved'
    | 'rejected'
    | 'revision_requested'
    | 'accepted_for_manual_work'
    | 'deferred';
  reason?: string;
}

export interface SecurityEventPayload {
  event_id?: string;
  idempotency_key?: string;
  event_type: string;
  source: string;
  environment?: string;
  correlation_id?: string;
  occurred_at?: string;
  payload?: Record<string, any>;
}

export interface SecurityScanIngestPayload {
  provider: string;
  workflow: string;
  run_id: string;
  commit_sha?: string;
  branch?: string;
  environment?: string;
  scanner_versions?: Record<string, string>;
  summary?: Record<string, any>;
  artifact_raw?: string;
  artifact_type?: 'sarif' | 'json';
  findings?: Array<{
    rule_id: string;
    title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    file_path?: string;
    line_number?: number;
    description?: string;
    remediation?: string;
    cve_id?: string;
    fingerprint?: string;
  }>;
}

export interface SecurityActionProposalPayload {
  incident_id?: string;
  action_type:
    | 'quarantine_file'
    | 'quarantine_uploaded_file'
    | 'reject_webhook'
    | 'rate_limit_ip'
    | 'temporary_ip_block'
    | 'revoke_session'
    | 'permanent_ip_ban'
    | 'credential_rotation';
  target_ref: string;
  scope?: {
    ttl_minutes?: number;
    rate_limit_rpm?: number;
    file_key?: string;
    reason?: string;
  };
  risk_level?: 'T1_REVERSIBLE_CONTAINMENT' | 'T2_DISRUPTIVE_OR_DESTRUCTIVE';
  confidence?: number;
  policy_key: string;
  idempotency_key?: string;
  auto_execute_if_preapproved?: boolean;
  rollback_data?: Record<string, any>;
}
