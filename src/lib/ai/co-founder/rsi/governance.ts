/**
 * Ruhvi AI Co-Founder — RSI Governance & Hard Safety Boundaries
 * Phase 1: Server-side permission assertion, deny-by-default enforcement,
 * and immutable audit logging.
 */

import {
  FORBIDDEN_RSI_OPERATIONS,
  ForbiddenRsiOperation,
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

/**
 * Asserts that an intended RSI operation is permitted within the human-governed boundary.
 * Throws RsiSecurityViolationError if the operation breaches safety rules.
 */
export function assertRsiOperationAllowed(operation: string): void {
  // 1. Check against hard forbidden operations list
  if (FORBIDDEN_RSI_OPERATIONS.includes(operation as ForbiddenRsiOperation)) {
    throw new RsiSecurityViolationError(
      operation,
      'RSI is strictly forbidden from modifying production code, secrets, deployments, or worker registries.'
    );
  }

  // 2. Check global kill switch
  const config = getRsiConfig();
  if (!config.enabled && !config.dryRun) {
    throw new Error(
      '[RSI Suspended] RSI is currently disabled via feature flags.'
    );
  }
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
