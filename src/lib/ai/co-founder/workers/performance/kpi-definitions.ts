import 'server-only';
import { KPIDefinition } from './types';

export const PERFORMANCE_SCORE_VERSION = '1.0.0';

/**
 * Standard KPI Definitions for AI Workers
 * Weights calibrated according to blueprint Section 7.1:
 * - Verified Outcomes: 30%
 * - Output Quality: 25%
 * - Tool/Process Correctness: 15%
 * - Reliability: 10%
 * - Timeliness: 10%
 * - Efficiency: 5%
 * - Safety/Compliance: 5%
 */
export const AI_WORKER_KPIS: Record<string, KPIDefinition> = {
  kpi_ai_verified_success_rate: {
    id: 'kpi_ai_verified_success_rate',
    name: 'Verified Task Success Rate',
    description:
      'Percentage of eligible attempted tasks with independently verified successful outcomes.',
    group: 'Verified Outcomes',
    applicableTo: ['AI_WORKER'],
    targetValue: 95,
    floorValue: 70,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.3,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_ai_output_quality_score: {
    id: 'kpi_ai_output_quality_score',
    name: 'Output Quality Score',
    description:
      'Average rubric evaluation score based on accuracy, completeness, and adherence to requirements.',
    group: 'Output Quality',
    applicableTo: ['AI_WORKER'],
    targetValue: 90,
    floorValue: 60,
    ceilingValue: 100,
    unit: 'score',
    isHigherBetter: true,
    defaultWeight: 0.25,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_ai_tool_correctness_rate: {
    id: 'kpi_ai_tool_correctness_rate',
    name: 'Tool & Process Correctness',
    description:
      'Percentage of executed tool calls that succeeded with valid arguments and schema conformance.',
    group: 'Tool Correctness',
    applicableTo: ['AI_WORKER'],
    targetValue: 95,
    floorValue: 75,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.15,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_ai_reliability_rate: {
    id: 'kpi_ai_reliability_rate',
    name: 'Execution Reliability',
    description:
      'Inverse of execution failure and timeout rate (100% minus failure/timeout rate).',
    group: 'Reliability',
    applicableTo: ['AI_WORKER'],
    targetValue: 98,
    floorValue: 80,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.1,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_ai_timeliness_rate: {
    id: 'kpi_ai_timeliness_rate',
    name: 'On-Time SLA Completion',
    description:
      'Percentage of tasks completed within allocated timeout / SLA deadline.',
    group: 'Timeliness',
    applicableTo: ['AI_WORKER'],
    targetValue: 95,
    floorValue: 70,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.1,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_ai_efficiency_score: {
    id: 'kpi_ai_efficiency_score',
    name: 'Resource Efficiency',
    description:
      'Metric evaluating minimal redundant retries and optimal tool invocation count per outcome.',
    group: 'Efficiency',
    applicableTo: ['AI_WORKER'],
    targetValue: 90,
    floorValue: 50,
    ceilingValue: 100,
    unit: 'score',
    isHigherBetter: true,
    defaultWeight: 0.05,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_ai_safety_compliance_rate: {
    id: 'kpi_ai_safety_compliance_rate',
    name: 'Safety & Guardrail Compliance',
    description:
      'Compliance with authorization boundaries, schema validation, and read-only policies.',
    group: 'Safety/Compliance',
    applicableTo: ['AI_WORKER'],
    targetValue: 100,
    floorValue: 90,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.05,
    version: PERFORMANCE_SCORE_VERSION,
  },
};

/**
 * Standard KPI Definitions for Human Staff
 * Calibrated according to blueprint Section 7.2:
 * - Work Quality: 30%
 * - Role Outcomes: 25%
 * - Reliability/Deadlines: 15%
 * - Customer/Team Contribution: 15%
 * - Ownership/Improvement: 10%
 * - Responsible Practices: 5%
 */
export const HUMAN_STAFF_KPIS: Record<string, KPIDefinition> = {
  kpi_human_work_quality_score: {
    id: 'kpi_human_work_quality_score',
    name: 'Task Quality & Accuracy',
    description:
      'Deliverable accuracy, low rework rate, and QA acceptance for completed tasks.',
    group: 'Work Quality',
    applicableTo: ['HUMAN_STAFF'],
    targetValue: 90,
    floorValue: 60,
    ceilingValue: 100,
    unit: 'score',
    isHigherBetter: true,
    defaultWeight: 0.3,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_human_role_outcome_rate: {
    id: 'kpi_human_role_outcome_rate',
    name: 'Role Target Attainment',
    description:
      'Completion rate of assigned business tasks (e.g. order dispatch, inventory sync, ticket resolution).',
    group: 'Role Outcomes',
    applicableTo: ['HUMAN_STAFF'],
    targetValue: 90,
    floorValue: 65,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.25,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_human_on_time_completion_rate: {
    id: 'kpi_human_on_time_completion_rate',
    name: 'On-Time Task Delivery',
    description:
      'Percentage of assigned tasks completed by the designated SLA / due date.',
    group: 'Reliability',
    applicableTo: ['HUMAN_STAFF'],
    targetValue: 90,
    floorValue: 70,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.15,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_human_collaboration_contribution: {
    id: 'kpi_human_collaboration_contribution',
    name: 'Service & Team Handover',
    description:
      'Resolution handover cleanliness and team issue resolution contribution.',
    group: 'Customer/Team',
    applicableTo: ['HUMAN_STAFF'],
    targetValue: 85,
    floorValue: 60,
    ceilingValue: 100,
    unit: 'score',
    isHigherBetter: true,
    defaultWeight: 0.15,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_human_ownership_improvement: {
    id: 'kpi_human_ownership_improvement',
    name: 'Ownership & Problem Resolution',
    description:
      'Proactive handling of blocked or complex issues and zero avoidable reworks.',
    group: 'Ownership',
    applicableTo: ['HUMAN_STAFF'],
    targetValue: 85,
    floorValue: 50,
    ceilingValue: 100,
    unit: 'score',
    isHigherBetter: true,
    defaultWeight: 0.1,
    version: PERFORMANCE_SCORE_VERSION,
  },
  kpi_human_compliance_practice: {
    id: 'kpi_human_compliance_practice',
    name: 'Responsible Compliance',
    description:
      'Accurate record-keeping and procedural policy adherence (SOP compliance).',
    group: 'Responsible Practices',
    applicableTo: ['HUMAN_STAFF'],
    targetValue: 95,
    floorValue: 80,
    ceilingValue: 100,
    unit: 'percentage',
    isHigherBetter: true,
    defaultWeight: 0.05,
    version: PERFORMANCE_SCORE_VERSION,
  },
};

export const MINIMUM_SAMPLE_SIZE = 5;
export const MINIMUM_WEIGHTED_COVERAGE = 0.7;
