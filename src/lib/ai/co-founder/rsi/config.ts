/**
 * Ruhvi AI Co-Founder — RSI Configuration & Governance Rules
 * Phase 1: Feature flags, kill switch, execution budgets, and strict safety boundaries.
 */

export interface RsiConfig {
  enabled: boolean;
  dryRun: boolean;
  memoryEnabled: boolean;
  observerEnabled: boolean;
  reflectionEnabled: boolean;
  researchEnabled: boolean;
  gapDetectionEnabled: boolean;
  evalLabEnabled: boolean;
  proposalsEnabled: boolean;
  evolutionHistoryEnabled: boolean;

  // Execution & resource budgets
  maxTokensPerRun: number;
  maxExternalRequestsPerRun: number;
  maxWallClockTimeoutMs: number;
  dailyBudgetLimitUsd: number;
}

export function getRsiConfig(): RsiConfig {
  return {
    enabled: process.env.RSI_ENABLED === 'true',
    dryRun: process.env.RSI_DRY_RUN !== 'false', // Default to dry-run true for safe initial staging
    memoryEnabled: process.env.RSI_MEMORY_ENABLED !== 'false',
    observerEnabled: process.env.RSI_OBSERVER_ENABLED !== 'false',
    reflectionEnabled: process.env.RSI_REFLECTION_ENABLED !== 'false',
    researchEnabled: process.env.RSI_RESEARCH_ENABLED !== 'false',
    gapDetectionEnabled: process.env.RSI_GAP_DETECTION_ENABLED !== 'false',
    evalLabEnabled: process.env.RSI_EVAL_LAB_ENABLED !== 'false',
    proposalsEnabled: process.env.RSI_PROPOSALS_ENABLED !== 'false',
    evolutionHistoryEnabled:
      process.env.RSI_EVOLUTION_HISTORY_ENABLED !== 'false',

    maxTokensPerRun: parseInt(
      process.env.RSI_MAX_TOKENS_PER_RUN || '32000',
      10
    ),
    maxExternalRequestsPerRun: parseInt(
      process.env.RSI_MAX_EXTERNAL_REQUESTS || '10',
      10
    ),
    maxWallClockTimeoutMs: parseInt(process.env.RSI_TIMEOUT_MS || '60000', 10),
    dailyBudgetLimitUsd: parseFloat(
      process.env.RSI_DAILY_BUDGET_USD || '10.00'
    ),
  };
}

/**
 * List of strictly forbidden operations for the RSI subsystem.
 * Any attempt to trigger these will throw an explicit permission error.
 */
export const FORBIDDEN_RSI_OPERATIONS = [
  'repository_write',
  'git_commit',
  'git_push',
  'production_deploy',
  'production_rollback',
  'secret_modify',
  'permission_modify',
  'worker_activate',
  'worker_delete',
  'apply_migration',
  'direct_database_ddl',
  'commerce_write',
] as const;

export type ForbiddenRsiOperation = (typeof FORBIDDEN_RSI_OPERATIONS)[number];
