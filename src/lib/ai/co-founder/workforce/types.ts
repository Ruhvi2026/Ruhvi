import 'server-only';

import { WorkerId } from '../workers/types';

/**
 * -----------------------------------------------------------------------------
 * RUHVI AI CO-FOUNDER — AUTONOMOUS WORKER WORKFORCE CONTRACTS
 * -----------------------------------------------------------------------------
 * Governed execution lifecycle for 14 specialist workers under Co-Founder supervision.
 */

export type { WorkerId };

export type AutonomyTier =
  | 'T0' // Manual: runs only on explicit owner request
  | 'T1' // Observe & Recommend: read scoped data, detect goals, zero business mutation
  | 'T2' // Internal Workflow: low-risk, reversible internal operations (drafts, tasks, research)
  | 'T3'; // Approval-Gated: business-side-effect action with mandatory exact owner approval

export type ActionRiskCategory =
  | 'read_only'
  | 'internal_write'
  | 'external_side_effect'
  | 'financial'
  | 'destructive';

export type TaskLifecycleState =
  | 'PROPOSED'
  | 'POLICY_CHECK'
  | 'QUEUED'
  | 'CLAIMED'
  | 'RUNNING'
  | 'WAITING_DEPENDENCY'
  | 'WAITING_APPROVAL'
  | 'RETRY_WAIT'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DEAD_LETTER'
  | 'TIMED_OUT';

export interface AutonomousWorkerManifest {
  workerId: WorkerId;
  displayName: string;
  domain: string;
  description: string;
  manifestVersion: string;
  supervisorId: string;
  objectives: string[];
  ownedKpis: Array<{
    metricId: string;
    sourceId: string;
    expectedRange?: string;
  }>;
  allowedDataSources: string[];
  triggers: Array<
    'manual' | 'schedule' | 'verified_event' | 'dependency' | 'health_signal'
  >;
  allowedTools: string[];
  readScopes: string[];
  internalWriteScopes: string[];
  approvalRequiredScopes: string[];
  autonomyTier: AutonomyTier;
  allowedDelegates: WorkerId[];
  limits: {
    maxSteps: number;
    maxToolCalls: number;
    maxModelCalls: number;
    maxChildren: number;
    maxDepth: number;
    timeoutSeconds: number;
    maxCostMinorUnits: number;
  };
  retryPolicy: {
    maxAttempts: number;
    backoff: 'fixed' | 'exponential_jitter';
  };
  successCriteria: string[];
  evaluationSuiteId: string;
  manifestHash: string;
}

export interface WorkforceSignal {
  signalId: string;
  schemaVersion: number;
  sourceType:
    'owner' | 'schedule' | 'webhook' | 'outbox' | 'dependency' | 'health';
  sourceId: string;
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  idempotencyKey: string;
  correlationId: string;
  workerCandidates: WorkerId[];
  resourceRefs: string[];
  payload?: Record<string, any>;
  verified: boolean;
}

export type GoalStatus =
  | 'OBSERVED'
  | 'CANDIDATE'
  | 'SCORED'
  | 'ACCEPTED_FOR_PLANNING'
  | 'DEFERRED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'TASK_CREATED';

export interface CandidateGoal {
  goalId: string;
  workerId: WorkerId;
  sourceSignalId: string;
  objective: string;
  rationale: string;
  targetKpi?: string;
  evidenceRefs: string[];
  confidence: number; // 0 to 1
  impact: number; // 1 to 5
  urgency: number; // 1 to 5
  effort: number; // 1 to 5
  strategicAlignment: number; // 1 to 5
  riskPenalty: number; // 0 to 2
  cooldownFingerprint: string;
  suggestedTier: AutonomyTier;
  priorityScore: number;
  status: GoalStatus;
  createdAt: string;
  expiresAt: string;
}

export interface PlanStep {
  stepId: string;
  workerId: WorkerId;
  action: string;
  allowedTools: string[];
  dependsOnStepIds: string[];
  riskCategory: ActionRiskCategory;
  autonomyTier: AutonomyTier;
  expectedOutputSchema: string;
  timeoutSeconds: number;
}

export interface WorkforcePlan {
  planId: string;
  goalId: string;
  steps: PlanStep[];
  totalEstimatedCost: number;
  riskClassification: 'low' | 'medium' | 'high';
  validationStatus: 'valid' | 'invalid';
  validationErrors?: string[];
  createdAt: string;
}

export interface ApprovalBinding {
  approvalId: string;
  actionType: string;
  targetResource: string;
  payloadHash: string;
  actor: string;
  userId?: string;
  workerId?: WorkerId;
  riskCategory: ActionRiskCategory;
  approvedAt: string;
  expiresAt: string;
  nonce?: string;
  consumedNonce?: string;
}

export interface PolicyDecision {
  decision: 'ALLOW' | 'REQUIRE_APPROVAL' | 'DENY';
  reason: string;
  riskCategory: ActionRiskCategory;
  approvalBinding?: ApprovalBinding;
}

export interface DelegationContract {
  parentTaskId: string;
  parentWorkerId: WorkerId;
  childWorkerId: WorkerId;
  depth: number;
  objective: string;
  allowedToolIds: string[];
  allowedScopes: string[];
  budget: {
    maxSteps: number;
    maxToolCalls: number;
    maxCostMinorUnits: number;
  };
  correlationId: string;
  traceId: string;
}

export interface TaskCheckpoint {
  stepIndex: number;
  state: Record<string, any>;
  timestamp: string;
}

export interface WorkforceTask {
  taskId: string;
  runId: string;
  correlationId: string;
  parentTaskId?: string;
  workerId: WorkerId;
  goalId: string;
  objective: string;
  acceptanceCriteria: string[];
  status: TaskLifecycleState;
  tier: AutonomyTier;
  currentStep: number;
  checkpoints: TaskCheckpoint[];
  outputSummary?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskVerificationResult {
  taskId: string;
  taskVerified: boolean;
  businessOutcomeStatus: 'verified' | 'unresolved' | 'conflicted' | 'pending';
  reason: string;
  measuredData?: Record<string, any>;
  evaluatedAt: string;
}
