import 'server-only';

import { AutonomyTier, WorkerId } from './types';

export interface WorkforceConfig {
  enabled: boolean;
  dryRun: boolean;
  maxGlobalConcurrentRuns: number;
  maxDelegationDepth: number;
  maxChildrenPerParent: number;
  maxConcurrentChildren: number;
  defaultAutonomyTier: AutonomyTier;
  dailyTokenCeiling: number;
  dailyCostCeilingUsd: number;
}

// In-memory runtime state for instant emergency controls
let globalKillSwitchActive = false;
const workerMaintenanceSet = new Set<WorkerId>();

export function getWorkforceConfig(): WorkforceConfig {
  return {
    enabled: process.env.WORKFORCE_ENABLED === 'true',
    dryRun: process.env.WORKFORCE_DRY_RUN !== 'false', // Defaults to safe dry-run mode
    maxGlobalConcurrentRuns: parseInt(
      process.env.WORKFORCE_MAX_CONCURRENT || '2',
      10
    ),
    maxDelegationDepth: 2, // Hard ceiling: Parent -> Child only
    maxChildrenPerParent: 3, // Hard ceiling: Max 3 delegates per parent task
    maxConcurrentChildren: 3, // Alias for testing and ergonomics
    defaultAutonomyTier: 'T1',
    dailyTokenCeiling: parseInt(
      process.env.WORKFORCE_DAILY_TOKEN_LIMIT || '50000',
      10
    ),
    dailyCostCeilingUsd: parseFloat(
      process.env.WORKFORCE_DAILY_COST_LIMIT_USD || '10.00'
    ),
  };
}

export function isDryRunEnabled(): boolean {
  return getWorkforceConfig().dryRun;
}

export function setGlobalKillSwitch(active: boolean): void {
  globalKillSwitchActive = active;
}

export function isGlobalKillSwitchActive(): boolean {
  return globalKillSwitchActive;
}

export function setWorkerMaintenance(
  workerId: WorkerId,
  inMaintenance: boolean
): void {
  if (inMaintenance) {
    workerMaintenanceSet.add(workerId);
  } else {
    workerMaintenanceSet.delete(workerId);
  }
}

export function clearAllWorkerMaintenance(): void {
  workerMaintenanceSet.clear();
}

export function isWorkerActive(workerId: WorkerId): boolean {
  if (globalKillSwitchActive) return false;
  return !workerMaintenanceSet.has(workerId);
}

export class WorkforceSecurityViolationError extends Error {
  constructor(operation: string, reason: string) {
    super(
      `[Workforce Security Violation] Operation '${operation}' denied: ${reason}`
    );
    this.name = 'WorkforceSecurityViolationError';
  }
}

export const FORBIDDEN_WORKFORCE_OPERATIONS = [
  'repository_write',
  'git_commit',
  'git_push',
  'production_deploy',
  'production_rollback',
  'secret_modify',
  'permission_modify',
  'apply_migration',
  'direct_database_ddl',
  'commerce_write_without_approval',
] as const;

export type ForbiddenWorkforceOperation =
  (typeof FORBIDDEN_WORKFORCE_OPERATIONS)[number];

export function assertWorkforceOperationAllowed(operation: string): void {
  const op = operation.toLowerCase();
  if (
    FORBIDDEN_WORKFORCE_OPERATIONS.includes(
      operation as ForbiddenWorkforceOperation
    ) ||
    op.includes('git') ||
    op.includes('deploy') ||
    op.includes('rollback') ||
    op.includes('ddl') ||
    op.includes('alter') ||
    op.includes('migration') ||
    op.includes('write_source') ||
    op.includes('secret')
  ) {
    throw new WorkforceSecurityViolationError(
      operation,
      'Workforce safety violation: The Autonomous Worker Workforce is strictly forbidden from self-modifying code, altering database schemas, mutating git state, or modifying production credentials.'
    );
  }
}
