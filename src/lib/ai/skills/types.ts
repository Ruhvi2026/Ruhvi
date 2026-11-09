// src/lib/ai/skills/types.ts
//
// Runtime Skills & Worker Capability Contracts for Ruhvi AI Workforce.
// Section 6 & Phase 7 of the Ruhvi AI Co-Founder & Worker Upgrade Guide.

import 'server-only';
import { WorkerId } from '../co-founder/workers/types';

export type { WorkerId };

export type SkillRiskClass =
  'read_only' | 'low' | 'medium' | 'high' | 'critical';

export type ActionRiskCategory =
  | 'read_only'
  | 'internal_write'
  | 'external_side_effect'
  | 'financial'
  | 'destructive';

export type SkillFailureState =
  'unavailable' | 'stale' | 'insufficient_data' | 'partial' | 'verified';

export type AutonomyTier =
  | 'T0' // Manual only on explicit founder invocation
  | 'T1' // Observe & Recommend (read scoped data, zero side effects)
  | 'T2' // Internal Workflow (low-risk, reversible drafts/plans)
  | 'T3'; // Approval-Gated (external mutation requiring exact founder approval)

/**
 * Versioned runtime skill contract loaded into specialist workers.
 */
export interface RuntimeSkill {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly owner: string;
  readonly lastReviewedAt: string;
  readonly supportedWorkerIds: readonly (WorkerId | '*')[];
  readonly description: string;
  readonly explicitNonCapabilities: readonly string[];
  readonly allowedTools: readonly string[];
  readonly requiredDataSources: readonly string[];
  readonly requiredInputs: readonly string[];
  readonly outputSchema: Record<string, any> | string;
  readonly evidenceRequirements: readonly string[];
  readonly safetyRules: readonly string[];
  readonly approvalBoundary: {
    readonly requiresHumanApproval: boolean;
    readonly riskClass: SkillRiskClass;
    readonly riskCategory: ActionRiskCategory;
    readonly mutationVerbs?: readonly string[];
  };
  readonly budget: {
    readonly timeoutSeconds: number;
    readonly maxTokens: number;
    readonly maxPages?: number;
    readonly maxSpendUsd?: number;
  };
  readonly failureStates: readonly SkillFailureState[];
  readonly instructions: string;
}

/**
 * Worker Capability Manifest defining the governance, autonomy, and tool contracts.
 */
export interface WorkerCapabilityManifest {
  readonly workerId: WorkerId;
  readonly displayName: string;
  readonly domain: string;
  readonly description: string;
  readonly version: string;
  readonly supervisorId: string;
  readonly autonomyTier: AutonomyTier;
  readonly riskCategory: ActionRiskCategory;
  readonly requiresHumanApproval: boolean;
  readonly skillIds: readonly string[];
  readonly allowedTools: readonly string[];
  readonly requiredDataSources: readonly string[];
  readonly permissionScope: readonly string[];
  readonly failureStates: readonly SkillFailureState[];
  readonly explicitNonCapabilities: readonly string[];
  readonly budget: {
    readonly timeoutSeconds: number;
    readonly maxTokens: number;
    readonly maxToolCalls: number;
    readonly maxCostMinorUnits?: number;
  };
  readonly successCriteria: readonly string[];
  readonly manifestHash: string;
}

/**
 * Immutable audit trace recorded on each worker run.
 */
export interface SkillRunTrace {
  readonly workerId: WorkerId;
  readonly manifestVersion: string;
  readonly manifestHash: string;
  readonly appliedSkills: Array<{
    readonly skillId: string;
    readonly version: string;
    readonly hash: string;
  }>;
  readonly timestamp: string;
  readonly executionStatus: SkillFailureState | 'live' | 'cached' | 'simulated';
}
