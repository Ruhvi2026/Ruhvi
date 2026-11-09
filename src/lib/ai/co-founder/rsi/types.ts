/**
 * Ruhvi AI Co-Founder — RSI Type Contracts
 */

export type MemoryTrustLevel =
  | 'authoritative_user'
  | 'verified_system'
  | 'unverified_candidate'
  | 'untrusted_external';

export interface RsiMemoryItem {
  id: string;
  memory_type:
    | 'user_instruction'
    | 'user_preference'
    | 'project_memory'
    | 'episodic_memory'
    | 'candidate_lesson'
    | 'verified_lesson'
    | 'research_memory';
  scope: string; // 'global' | userId | domain
  content: string;
  normalized_key?: string;
  source: string;
  confidence: number;
  status: 'active' | 'archived' | 'deprecated' | 'expired';
  priority: number;
  version?: number;
  created_at: string;
  updated_at: string;
}

export type FailureClass =
  | 'routing'
  | 'missing_context'
  | 'memory_recall'
  | 'research_quality'
  | 'tool_schema'
  | 'model_quality'
  | 'cost'
  | 'latency'
  | 'policy'
  | 'stale_data'
  | 'ambiguous_request'
  | 'external_dependency';

export interface CandidateLesson {
  id: string;
  failure_class: FailureClass;
  lesson: string;
  observed_failure: string;
  evidence_refs: string[];
  hypothesis: string;
  test_count: number;
  confidence: number;
  status: 'pending' | 'under_evaluation' | 'promoted' | 'rejected';
  created_at: string;
}

export interface CapabilitySnapshot {
  worker_id: string;
  name: string;
  version: string;
  mission: string;
  tools: string[];
  status: 'deployed' | 'partial' | 'experimental' | 'deprecated';
  test_coverage_status: string;
  last_verified_at: string;
}

export interface ResearchSource {
  url: string;
  canonical_url: string;
  title: string;
  publisher?: string;
  source_type: 'docs' | 'github' | 'paper' | 'security_advisory' | 'registry';
  license?: string;
  retrieved_at: string;
  is_verified: boolean;
  reliability_score: number;
}

export interface ResearchFinding {
  finding: string;
  evidence_source_urls: string[];
  confidence: number;
  limitations?: string;
}

export interface ResearchReport {
  project_id: string;
  question: string;
  scope: string;
  sources: ResearchSource[];
  findings: ResearchFinding[];
  free_first_comparison: {
    free_or_oss_option: string;
    paid_alternative?: string;
    tradeoffs: string;
  };
  compatibility_verdict: 'compatible' | 'partially_compatible' | 'incompatible';
  created_at: string;
}

export interface CapabilityGap {
  id: string;
  title: string;
  description: string;
  category: FailureClass | 'missing_capability' | 'governance_gap';
  evidence_refs: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recurrence_count: number;
  priority_score: number;
  recommended_action_type:
    | 'reuse_existing'
    | 'improve_prompt_skill'
    | 'small_tool'
    | 'subtask_pattern'
    | 'worker_proposal';
  status: 'open' | 'researching' | 'proposed' | 'resolved';
  created_at: string;
}

export interface UpgradeProposal {
  id: string;
  title: string;
  gap_id?: string;
  problem: string;
  current_implementation: string;
  proposed_change: string;
  alternatives_considered: string[];
  benefit: string;
  cost_estimate: {
    implementation_effort_days: number;
    ongoing_monthly_usd: number;
    variable_api_costs: string;
  };
  risk: string;
  regression_mitigations: string;
  test_plan: string;
  rollback_plan: string;
  files_affected: string[];
  status:
    | 'draft'
    | 'proposed'
    | 'owner_accepted_for_manual_work'
    | 'owner_rejected'
    | 'owner_deferred'
    | 'verified';
  owner_decision?: 'accepted_for_manual_work' | 'rejected' | 'deferred';
  decision_reason?: string;
  created_at: string;
}

export interface GoldenTestCase {
  case_id: string;
  language: 'en' | 'bn' | 'banglish';
  category: string;
  input: string;
  context?: Record<string, any>;
  expected_outcome: string;
  forbidden_outcome: string;
  deterministic_validator?: (output: any) => boolean;
}

export interface EvalRunReport {
  suite_id: string;
  eval_type: 'offline_replay' | 'candidate_comparison';
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  accuracy: number;
  regressions_detected: string[];
  metrics: Record<string, any>;
}

// ==========================================
// Phase 3: Research Gateway Types & Contracts
// ==========================================

export type ResearchProvider =
  'crawl4ai' | 'tavily' | 'exa' | 'github' | 'rss' | 'direct_fetch' | 'jina';

export type ProviderStatus =
  | 'not_configured'
  | 'healthy'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'auth_error'
  | 'degraded'
  | 'unavailable';

export interface NormalizedSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
  retrievedAt: string;
  provider: ResearchProvider;
  score?: number;
  raw?: unknown;
}

export interface ResearchSearchOptions {
  query: string;
  domains?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'any';
  language?: string;
  maxResults?: number;
  allowPaid?: boolean; // defaults to false; strictly enforces free-tier only
}

export interface ResearchSearchResponse {
  success: boolean;
  query: string;
  providerUsed?: ResearchProvider;
  attemptedProviders: ResearchProvider[];
  results: NormalizedSearchResult[];
  sourceMode:
    | 'live'
    | 'cached'
    | 'simulated'
    | 'unavailable'
    | 'partial'
    | 'insufficient_data';
  providerStatuses: Partial<Record<ResearchProvider, ProviderStatus>>;
  error?: string;
  totalResults: number;
  cached?: boolean;
  retrievedAt: string;
}

export interface ResearchPageReadOptions {
  url: string;
  extractMode?: 'markdown' | 'text' | 'extract';
  maxCharacters?: number;
  allowPaid?: boolean;
}

export interface ResearchPageReadResponse {
  success: boolean;
  url: string;
  finalUrl: string;
  title: string;
  markdown: string;
  textContent?: string;
  contentHash: string;
  status: number;
  providerUsed: 'crawl4ai' | 'jina' | 'direct_fetch' | 'playwright';
  retrievedAt: string;
  sourceMode:
    | 'live'
    | 'cached'
    | 'simulated'
    | 'unavailable'
    | 'partial'
    | 'insufficient_data';
  error?: string;
}

export interface ProviderHealthState {
  provider: ResearchProvider;
  status: ProviderStatus;
  lastCheckedAt: string;
  creditsRemaining?: number | string;
  creditsCost?: number;
  rateLimitResetSeconds?: number;
  error?: string;
}
