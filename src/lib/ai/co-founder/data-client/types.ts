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
  eval_type?: string;
  status?: 'running' | 'completed' | 'failed';
  score?: number;
  metrics?: Record<string, any>;
}

export interface ProposalDecisionPayload {
  decision: 'accepted_for_manual_work' | 'rejected' | 'deferred';
  reason?: string;
}
