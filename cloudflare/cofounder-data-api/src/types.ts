export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; meta: any; results?: T[] }>;
  all<T = unknown>(): Promise<{ success: boolean; meta: any; results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(
    statements: D1PreparedStatement[]
  ): Promise<{ success: boolean; meta: any; results?: T[] }[]>;
  exec<T = unknown>(
    query: string
  ): Promise<{ count: number; duration: number }>;
}

export interface R2Bucket {
  get(key: string): Promise<any>;
  put(key: string, value: any, options?: any): Promise<any>;
  delete(key: string): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface QueueMessage<T = any> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: T;
  ack(): void;
  retry(): void;
}

export interface MessageBatch<T = any> {
  readonly queue: string;
  readonly messages: readonly QueueMessage<T>[];
  ackAll(): void;
  retryAll(): void;
}

export interface Queue<T = any> {
  send(message: T): Promise<void>;
  sendBatch(messages: Iterable<{ body: T }>): Promise<void>;
}

export interface Env {
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  ENVIRONMENT: string;
  ACCESS_CLIENT_ID?: string;
  ACCESS_CLIENT_SECRET?: string;
  ACCESS_AUD?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  COFOUNDER_WORKFORCE_SECRET?: string;
  CF_SECURITY_INGEST_TOKEN?: string;
  SECURITY_QUEUE?: Queue<any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, any>;
}

export interface MemoryItem {
  id: string;
  memory_type:
    | 'user_instruction'
    | 'user_preference'
    | 'project_memory'
    | 'episodic_memory'
    | 'candidate_lesson'
    | 'verified_lesson'
    | 'research_memory';
  scope: string;
  content: string;
  normalized_key?: string;
  source: string;
  confidence: number;
  status: 'active' | 'archived' | 'deprecated' | 'expired';
  priority: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  task_type: string;
  started_at: string;
  ended_at?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  model_route?: string;
  correlation_id: string;
  outcome_summary?: string;
}

// ==============================================================================
// Security Intelligence Types (RUHVI_SECURITY_INTELLIGENCE_WORKER_SPEC)
// ==============================================================================

export type SecuritySeverity =
  'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type IncidentSeverity =
  'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';
export type IncidentState =
  | 'detected'
  | 'investigating'
  | 'containment_in_progress'
  | 'contained'
  | 'resolved'
  | 'closed'
  | 'dismissed';

export interface SecurityEventPayload {
  event_id: string;
  event_type: string;
  source:
    | 'cloudflare_waf'
    | 'nextjs_runtime'
    | 'webhook_guard'
    | 'clamav_scanner'
    | 'ci_sast'
    | 'ci_dast'
    | 'manual';
  environment: 'prod' | 'staging' | 'dev';
  occurred_at: string;
  correlation_id: string;
  idempotency_key?: string;
  payload: Record<string, any>;
}

export interface SecurityScanIngestPayload {
  provider:
    'trivy' | 'semgrep' | 'osv' | 'gitleaks' | 'zap' | 'clamav' | 'manual';
  workflow: string;
  run_id: string;
  commit_sha?: string;
  branch?: string;
  environment: 'prod' | 'staging' | 'dev';
  scanner_versions?: Record<string, string>;
  summary: Record<string, any>;
  findings?: Array<{
    fingerprint: string;
    category:
      | 'injection'
      | 'auth'
      | 'secret_leak'
      | 'xss'
      | 'misconfiguration'
      | 'vulnerable_dep'
      | 'malware'
      | 'access_control'
      | 'other';
    title: string;
    description: string;
    severity: SecuritySeverity;
    confidence?: number;
    evidence_refs?: string[];
    risk_factors?: Record<string, any>;
  }>;
  artifact_raw?: string;
  artifact_type?: 'sarif' | 'json' | 'log';
}

export interface SecurityActionProposalPayload {
  incident_id?: string;
  action_type:
    | 'quarantine_file'
    | 'reject_webhook'
    | 'rate_limit_ip'
    | 'temporary_ip_block'
    | 'revoke_session'
    | 'disable_account'
    | 'rotate_secret'
    | 'waf_rule_update';
  target_ref: string;
  scope?: Record<string, any>;
  risk_level:
    'T0_READ' | 'T1_REVERSIBLE_CONTAINMENT' | 'T2_DISRUPTIVE' | 'T3_CRITICAL';
  confidence?: number;
  policy_key: string;
  idempotency_key: string;
  rollback_data?: Record<string, any>;
  auto_execute_if_preapproved?: boolean;
}
