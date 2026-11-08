import 'server-only';

export type EntityType = 'AI_WORKER' | 'HUMAN_STAFF';

export type EventStatus =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_PROGRESS'
  | 'TOOL_CALL_STARTED'
  | 'TOOL_CALL_SUCCEEDED'
  | 'TOOL_CALL_FAILED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'TASK_BLOCKED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_TIMED_OUT'
  | 'TASK_CANCELLED'
  | 'TASK_VERIFICATION_PASSED'
  | 'TASK_VERIFICATION_FAILED'
  | 'TASK_REOPENED'
  | 'REWORK_REQUESTED';

export type DataCoverageState =
  | 'VALID'
  | 'INSUFFICIENT_DATA'
  | 'DATA_UNAVAILABLE'
  | 'STALE_DATA'
  | 'NOT_APPLICABLE'
  | 'PENDING_VERIFICATION';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export type PerformanceGrade =
  | 'Outstanding'
  | 'Excellent'
  | 'Good'
  | 'Needs Improvement'
  | 'Critical Attention'
  | 'Insufficient Data';

export type TaskDifficulty = 'easy' | 'normal' | 'complex' | 'critical';

export type RootCauseCategory =
  | 'MEMBER_EXECUTION'
  | 'UNCLEAR_REQUIREMENT'
  | 'MISSING_INPUT'
  | 'TOOL_OR_PROVIDER_FAILURE'
  | 'SYSTEM_OR_BUG'
  | 'EXTERNAL_PARTY_DELAY'
  | 'WORKLOAD_OR_CAPACITY'
  | 'DEADLINE_OR_TARGET_ISSUE'
  | 'NEEDS_MORE_EVIDENCE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'POSITIVE';

export interface PerformanceEvent {
  eventId: string;
  eventType: EventStatus;
  entityType: EntityType;
  memberId: string;
  roleId: string;
  taskId: string;
  parentTaskId?: string | null;
  occurredAt: string; // ISO 8601
  recordedAt: string; // ISO 8601
  sourceSystem: string;
  correlationId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  complexity?: TaskDifficulty;
  dueAt?: string | null;
  durationMs?: number | null;
  retryCount?: number;
  toolErrorCount?: number;
  blockerCode?: string | null;
  verificationStatus?: 'verified' | 'failed' | 'pending' | 'not_applicable';
  evidenceRefs: string[];
  metadata?: Record<string, any>;
  schemaVersion: string;
}

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  group: string;
  applicableTo: EntityType[];
  targetValue: number;
  floorValue: number;
  ceilingValue: number;
  unit: 'percentage' | 'count' | 'milliseconds' | 'score';
  isHigherBetter: boolean;
  defaultWeight: number;
  version: string;
}

export interface KPIResult {
  kpiId: string;
  name: string;
  value: number | null;
  state: DataCoverageState;
  score: number | null; // 0-100 normalized
  weight: number;
  target: number;
  unit: string;
  sampleSize: number;
  denominator: number;
  evidenceRefs: string[];
  reason?: string;
}

export interface MemberScorecard {
  memberId: string;
  entityType: EntityType;
  roleId: string;
  period: { from: string; to: string };
  overallScore: number | null; // 0-100 or null if insufficient
  grade: PerformanceGrade;
  state: DataCoverageState;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0.0 - 1.0
  weightedCoverage: number; // 0.0 - 1.0
  kpis: KPIResult[];
  taskCounts: {
    total: number;
    completed: number;
    verified: number;
    failed: number;
    reworked: number;
    excluded: number;
  };
  strengths: string[];
  weaknesses: string[];
  achievementPoints: number;
  calculatedAt: string;
  scoreVersion: string;
}

export interface QualityEvaluationDimension {
  name: string;
  score: number; // 0-100
  weight: number;
  evidenceRefs: string[];
  reason: string;
}

export interface QualityEvaluation {
  evaluationId: string;
  taskId: string;
  memberId: string;
  entityType: EntityType;
  status:
    'VALID' | 'LOW_CONFIDENCE' | 'NEEDS_HUMAN_REVIEW' | 'PENDING_VERIFICATION';
  overallQuality: number; // 0-100
  dimensions: QualityEvaluationDimension[];
  requirementsMet: string[];
  requirementsMissed: string[];
  possibleExternalFactors: string[];
  reviewRequired: boolean;
  rubricVersion: string;
  evaluatedAt: string;
  evidenceRefs: string[];
}

export interface AchievementPointTransaction {
  id: string;
  memberId: string;
  entityType: EntityType;
  taskId: string;
  difficulty: TaskDifficulty;
  basePoints: number;
  qualityMultiplier: number;
  finalPoints: number;
  isReversal: boolean;
  reversalReason?: string;
  awardedAt: string;
  idempotencyKey: string;
}

export interface WorkforceAlert {
  id: string;
  severity: AlertSeverity;
  memberId: string;
  entityType: EntityType;
  roleId: string;
  title: string;
  message: string;
  rootCause: RootCauseCategory;
  evidenceRefs: string[];
  recommendedAction: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
}

export interface WorkforceAuditReport {
  reportId: string;
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
  period: { from: string; to: string };
  generatedAt: string;
  dataHealth: {
    status: 'HEALTHY' | 'PARTIAL' | 'UNAVAILABLE';
    sourcesChecked: string[];
    missingSources: string[];
    lastSuccessfulAuditAt: string;
  };
  populationSummary: {
    aiWorkersTotal: number;
    aiWorkersWithValidScores: number;
    humanStaffTotal: number;
    humanStaffWithValidScores: number;
  };
  topStrengths: string[];
  attentionRequired: string[];
  trendChanges: string[];
  rootCauseFindings: {
    category: RootCauseCategory;
    count: number;
    membersAffected: string[];
  }[];
  recognitionCandidates: {
    memberId: string;
    entityType: EntityType;
    reason: string;
    points: number;
  }[];
  recommendations: string[];
  scorecards: MemberScorecard[];
  alerts: WorkforceAlert[];
  scoreVersion: string;
}
