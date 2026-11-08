/**
 * Ruhvi AI Co-Founder — RSI Governance & Hard Safety Boundaries
 * Phase 1: Server-side permission assertion, deny-by-default enforcement,
 * and immutable audit logging.
 */

import {
  FORBIDDEN_RSI_OPERATIONS,
  ForbiddenRsiOperation,
  RsiConfig,
  getRsiConfig,
} from './config';

export class RsiSecurityViolationError extends Error {
  constructor(
    public operation: string,
    public reason: string
  ) {
    super(
      `[RSI Security Violation] Operation "${operation}" is strictly forbidden. Reason: ${reason}`
    );
    this.name = 'RsiSecurityViolationError';
  }
}

const OPERATION_FLAG_MAP: Record<string, keyof RsiConfig> = {
  // Memory
  memory_read: 'memoryEnabled',
  memory_write: 'memoryEnabled',
  memory_forget: 'memoryEnabled',
  save_explicit_memory: 'memoryEnabled',
  search_memories: 'memoryEnabled',
  memory: 'memoryEnabled',

  // Observer
  telemetry_write: 'observerEnabled',
  observe_execution: 'observerEnabled',
  record_observation: 'observerEnabled',
  aggregate_metrics: 'observerEnabled',
  observe: 'observerEnabled',

  // Reflection
  reflection_write: 'reflectionEnabled',
  reflection_promote: 'reflectionEnabled',
  reflect_on_failures: 'reflectionEnabled',
  generate_candidate_lesson: 'reflectionEnabled',
  promote_candidate_lesson: 'reflectionEnabled',
  reflect: 'reflectionEnabled',

  // Research
  research_read: 'researchEnabled',
  research_write: 'researchEnabled',
  research_public_sources: 'researchEnabled',
  search_research: 'researchEnabled',
  research: 'researchEnabled',

  // Gap Detection
  gap_read: 'gapDetectionEnabled',
  gap_write: 'gapDetectionEnabled',
  detect_capability_gaps: 'gapDetectionEnabled',
  score_gap: 'gapDetectionEnabled',
  gap_detection: 'gapDetectionEnabled',

  // Eval Lab
  eval_run: 'evalLabEnabled',
  eval_suite_write: 'evalLabEnabled',
  run_golden_evals: 'evalLabEnabled',
  eval_lab: 'evalLabEnabled',
  run_eval_case: 'evalLabEnabled',

  // Proposals
  proposal_write: 'proposalsEnabled',
  proposal_decision: 'proposalsEnabled',
  create_upgrade_proposal: 'proposalsEnabled',
  decide_upgrade_proposal: 'proposalsEnabled',
  propose_upgrade: 'proposalsEnabled',
  proposals: 'proposalsEnabled',

  // Evolution History
  evolution_read: 'evolutionHistoryEnabled',
  compare_evolution_epochs: 'evolutionHistoryEnabled',
  evolution_history: 'evolutionHistoryEnabled',
};

/**
 * Asserts that an intended RSI operation is permitted within the human-governed boundary.
 * Throws RsiSecurityViolationError if the operation breaches safety rules.
 * Enforces global kill-switch as well as granular feature flags (RSI-02).
 */
export function assertRsiOperationAllowed(operation: string): void {
  // 1. Check against hard forbidden operations list
  if (FORBIDDEN_RSI_OPERATIONS.includes(operation as ForbiddenRsiOperation)) {
    throw new RsiSecurityViolationError(
      operation,
      'RSI is strictly forbidden from modifying production code, secrets, deployments, or worker registries.'
    );
  }

  // 2. Check global kill switch / feature flag (ARCH-06: fail closed when disabled, regardless of dryRun)
  const config = getRsiConfig();
  if (!config.enabled) {
    throw new Error(
      '[RSI Suspended] RSI is currently disabled via feature flags.'
    );
  }

  // 3. Check granular module feature flag (RSI-02)
  const flagKey = OPERATION_FLAG_MAP[operation.toLowerCase()];
  if (flagKey && !config[flagKey]) {
    throw new Error(
      `[RSI Suspended] RSI feature "${flagKey}" is disabled via configuration for operation "${operation}".`
    );
  }
}

/**
 * Execution budget and context tracking (RSI-03)
 */
export interface RsiRunContext {
  tokensUsed: number;
  externalRequests: number;
  startedAtMs: number;
}

export function checkRsiBudgets(context: RsiRunContext): {
  allowed: boolean;
  reason?: string;
} {
  const config = getRsiConfig();
  if (context.tokensUsed > config.maxTokensPerRun) {
    return {
      allowed: false,
      reason: `Token limit exceeded: ${context.tokensUsed} > ${config.maxTokensPerRun}`,
    };
  }
  if (context.externalRequests > config.maxExternalRequestsPerRun) {
    return {
      allowed: false,
      reason: `External request limit exceeded: ${context.externalRequests} > ${config.maxExternalRequestsPerRun}`,
    };
  }
  const elapsed = Date.now() - context.startedAtMs;
  if (elapsed > config.maxWallClockTimeoutMs) {
    return {
      allowed: false,
      reason: `Timeout exceeded: ${elapsed}ms > ${config.maxWallClockTimeoutMs}ms`,
    };
  }
  return { allowed: true };
}

/**
 * Audit log event helper for RSI actions
 */
export interface RsiAuditRecord {
  operation: string;
  actor: 'owner' | 'rsi_engine' | 'system';
  target_resource: string;
  decision: 'allowed' | 'denied';
  metadata?: Record<string, any>;
  timestamp: string;
}

export function createRsiAuditRecord(
  operation: string,
  actor: 'owner' | 'rsi_engine' | 'system',
  target_resource: string,
  decision: 'allowed' | 'denied',
  metadata: Record<string, any> = {}
): RsiAuditRecord {
  return {
    operation,
    actor,
    target_resource,
    decision,
    metadata,
    timestamp: new Date().toISOString(),
  };
}
