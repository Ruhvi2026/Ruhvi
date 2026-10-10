import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import { writeCoFounderMemory } from './memory';
import type { VerificationStatus, VerificationSource } from './outcomes';

/**
 * -----------------------------------------------------------------------------
 * CLOSED-LOOP OPERATIONAL TRACEABILITY & OUTCOME VERIFICATION ENGINE
 * -----------------------------------------------------------------------------
 * Core Principle: Execution Success != Business Success.
 *
 * An action execution returning 200 OK only proves mutation completed.
 * Closed-loop verification requires measured metric improvement in authoritative
 * store tables after an elapsed measurement window.
 */

export type ActionLifecycleState =
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'EXECUTION_SUCCEEDED'
  | 'EXECUTION_FAILED'
  | 'OUTCOME_EXPECTED'
  | 'OUTCOME_ACHIEVED'
  | 'OUTCOME_REGRESSED'
  | 'OUTCOME_CONFLICTED'
  | 'OUTCOME_VERIFIED';

export type MetricDirection = 'increase' | 'decrease' | 'maintain';

export interface MetricExpectation {
  metricKey: string; // e.g. 'order_revenue', 'order_count', 'inventory_stock', 'support_ticket_count'
  baselineValue: number;
  targetValue: number;
  unit?: string; // e.g. 'INR', 'orders', 'units', '%'
  direction: MetricDirection;
  measurementWindowDays: number; // e.g. 7 days
  toleranceThresholdPercent?: number; // e.g. 25% shortfall triggers conflict
}

export interface TrackedClosedLoopAction {
  id: string; // Outcome record primary key
  actionId?: string; // Business action execution ID (e.g. act_xxx)
  approvalId?: string; // Approval record ID
  actionType: string;
  lifecycleState: ActionLifecycleState;
  expectedOutcome?: string;
  actualOutcome?: string;
  metricExpectation?: MetricExpectation;
  verificationStatus: VerificationStatus;
  verificationSource?: VerificationSource;
  measuredMetricValue?: number;
  shortfallPercentage?: number;
  measurementWindowEnd?: string;
  evidence?: Record<string, any>;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterActionProposalInput {
  actionType: string;
  description?: string;
  expectedOutcome: string;
  metricExpectation?: MetricExpectation;
  approvalId?: string;
  actionId?: string;
  actionPayload?: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface RecordExecutionResultInput {
  actionId: string;
  approvalId?: string;
  actionType?: string;
  success: boolean;
  resultData?: any;
  error?: string;
  userId?: string;
}

export interface VerifyActionOutcomeOptions {
  forceImmediate?: boolean;
  overrideNow?: Date;
  actorId?: string;
}

export interface VerifyActionOutcomeResult {
  trackedAction: TrackedClosedLoopAction;
  verified: boolean;
  state: ActionLifecycleState;
  reason: string;
  shortfallPercentage?: number;
  currentValue?: number;
  delta?: number;
}

export interface MetricMeasurementResult {
  metricKey: string;
  currentValue: number;
  sourceTable: string;
  details: Record<string, any>;
  measuredAt: string;
}

export interface ClosedLoopAnalyticsSummary {
  totalTracked: number;
  byState: Record<ActionLifecycleState, number>;
  verifiedRate: number; // 0 to 100
  regressionCount: number;
  conflictedCount: number;
  pendingCount: number;
  executiveSummary: string;
}

// -----------------------------------------------------------------------------
// State Machine Transitions
// -----------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<
  ActionLifecycleState,
  readonly ActionLifecycleState[]
> = {
  PROPOSED: ['APPROVED', 'REJECTED', 'EXECUTING'],
  APPROVED: ['EXECUTING', 'REJECTED'],
  REJECTED: ['PROPOSED'], // Re-proposing allowed
  EXECUTING: ['EXECUTION_SUCCEEDED', 'EXECUTION_FAILED'],
  EXECUTION_SUCCEEDED: ['OUTCOME_EXPECTED', 'OUTCOME_VERIFIED'],
  EXECUTION_FAILED: ['PROPOSED'], // Retry proposal
  OUTCOME_EXPECTED: [
    'OUTCOME_ACHIEVED',
    'OUTCOME_REGRESSED',
    'OUTCOME_CONFLICTED',
    'OUTCOME_VERIFIED',
  ],
  OUTCOME_ACHIEVED: ['OUTCOME_VERIFIED', 'OUTCOME_REGRESSED'],
  OUTCOME_REGRESSED: ['OUTCOME_VERIFIED', 'OUTCOME_CONFLICTED'],
  OUTCOME_CONFLICTED: [
    'OUTCOME_VERIFIED',
    'OUTCOME_ACHIEVED',
    'OUTCOME_REGRESSED',
  ],
  OUTCOME_VERIFIED: [], // Terminal verified state
};

/**
 * Validates if a lifecycle transition is allowed by the formal state machine.
 */
export function isValidLifecycleTransition(
  current: ActionLifecycleState,
  next: ActionLifecycleState
): boolean {
  if (current === next) return true;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val
  );
}

function mapDatabaseRecordToTrackedAction(
  record: any
): TrackedClosedLoopAction {
  const evidence = record.evidence || {};
  return {
    id: record.id,
    actionId:
      evidence.actionId ||
      (isValidUuid(record.action_id) ? record.action_id : record.entity_id),
    approvalId: record.recommendation_id || evidence.approvalId,
    actionType: evidence.actionType || 'unknown_action',
    lifecycleState:
      (evidence.lifecycleState as ActionLifecycleState) || 'PROPOSED',
    expectedOutcome: record.expected_outcome || undefined,
    actualOutcome: record.actual_outcome || undefined,
    metricExpectation: evidence.metricExpectation,
    verificationStatus: record.verification_status || 'pending',
    verificationSource: record.verification_source || undefined,
    measuredMetricValue: evidence.measuredMetricValue,
    shortfallPercentage: evidence.shortfallPercentage,
    measurementWindowEnd: record.measurement_window_end || undefined,
    evidence,
    userId: record.user_id || undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Helper to locate an outcome record by any identifier (outcome ID, approval ID, action ID, or entity ID).
 */
async function findOutcomeRecord(identifier: string): Promise<any | null> {
  const supabase = getServiceClient();

  // 1. Direct query by ID
  try {
    const { data: byId } = await supabase
      .from('co_founder_outcomes')
      .select('*')
      .eq('id', identifier)
      .maybeSingle();

    if (byId) return byId;
  } catch {
    // Continue to next attempt
  }

  // 2. Query by recommendation_id (approval ID)
  if (isValidUuid(identifier)) {
    try {
      const { data: byRec } = await supabase
        .from('co_founder_outcomes')
        .select('*')
        .eq('recommendation_id', identifier)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byRec) return byRec;
    } catch {
      // Continue
    }

    try {
      const { data: byActionUuid } = await supabase
        .from('co_founder_outcomes')
        .select('*')
        .eq('action_id', identifier)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byActionUuid) return byActionUuid;
    } catch {
      // Continue
    }
  }

  // 3. Query by entity_id
  try {
    const { data: byEntity } = await supabase
      .from('co_founder_outcomes')
      .select('*')
      .eq('entity_id', identifier)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEntity) return byEntity;
  } catch {
    // Continue
  }

  return null;
}

// -----------------------------------------------------------------------------
// Core Closed-Loop Functions
// -----------------------------------------------------------------------------

/**
 * Stage 1: Register an Action Proposal with explicit Expected Metrics and Lifecycle Tracking.
 * Sets initial state to 'PROPOSED' and persists in `co_founder_outcomes`.
 */
export async function registerActionProposal(
  input: RegisterActionProposalInput
): Promise<TrackedClosedLoopAction> {
  const supabase = getServiceClient();
  const windowDays = input.metricExpectation?.measurementWindowDays ?? 7;
  const measurementWindowEnd = new Date(
    Date.now() + windowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const now = new Date().toISOString();

  const evidence: Record<string, any> = {
    lifecycleState: 'PROPOSED' as ActionLifecycleState,
    actionType: input.actionType,
    description: input.description,
    actionId: input.actionId,
    approvalId: input.approvalId,
    actionPayload: input.actionPayload,
    metricExpectation: input.metricExpectation,
    ...(input.metadata || {}),
  };

  const newRecord = {
    recommendation_id: isValidUuid(input.approvalId) ? input.approvalId : null,
    action_id: isValidUuid(input.actionId) ? input.actionId : null,
    entity_type: 'action',
    entity_id: input.actionId || input.approvalId || null,
    event_type: 'recommendation_created',
    expected_outcome: input.expectedOutcome,
    verification_status: 'pending' as VerificationStatus,
    verification_source: 'authoritative_db' as VerificationSource,
    evidence,
    measurement_window_end: measurementWindowEnd,
    user_id: input.userId || 'system',
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('co_founder_outcomes')
    .insert([newRecord])
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to register action proposal: ${error?.message || 'Database insert failed'}`
    );
  }

  await logAuditEvent({
    actorId: input.userId || 'system',
    portal: 'admin',
    action: 'co_founder_closed_loop:proposal_registered',
    entityType: 'action_proposal',
    entityId: data.id,
    changes: {
      actionType: input.actionType,
      expectedOutcome: input.expectedOutcome,
      metricExpectation: input.metricExpectation,
      windowDays,
    },
  }).catch(() => {});

  return mapDatabaseRecordToTrackedAction(data);
}

/**
 * Transitions tracked action lifecycle to 'APPROVED'.
 */
export async function recordActionApproval(
  actionIdOrApprovalId: string,
  userId?: string
): Promise<TrackedClosedLoopAction> {
  const supabase = getServiceClient();
  const record = await findOutcomeRecord(actionIdOrApprovalId);

  if (!record) {
    throw new Error(
      `Tracked action record not found for: ${actionIdOrApprovalId}`
    );
  }

  const currentEvidence = record.evidence || {};
  const currentLifecycle =
    (currentEvidence.lifecycleState as ActionLifecycleState) || 'PROPOSED';

  if (!isValidLifecycleTransition(currentLifecycle, 'APPROVED')) {
    throw new Error(
      `Invalid lifecycle transition from ${currentLifecycle} to APPROVED`
    );
  }

  const updatedEvidence = {
    ...currentEvidence,
    lifecycleState: 'APPROVED' as ActionLifecycleState,
    approvedBy: userId || 'system',
    approvedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('co_founder_outcomes')
    .update({
      event_type: 'action_approved',
      evidence: updatedEvidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', record.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to record approval: ${error?.message}`);
  }

  return mapDatabaseRecordToTrackedAction(data);
}

/**
 * Transitions tracked action lifecycle to 'REJECTED'.
 */
export async function recordActionRejection(
  actionIdOrApprovalId: string,
  reason?: string,
  userId?: string
): Promise<TrackedClosedLoopAction> {
  const supabase = getServiceClient();
  const record = await findOutcomeRecord(actionIdOrApprovalId);

  if (!record) {
    throw new Error(
      `Tracked action record not found for: ${actionIdOrApprovalId}`
    );
  }

  const currentEvidence = record.evidence || {};
  const currentLifecycle =
    (currentEvidence.lifecycleState as ActionLifecycleState) || 'PROPOSED';

  if (!isValidLifecycleTransition(currentLifecycle, 'REJECTED')) {
    throw new Error(
      `Invalid lifecycle transition from ${currentLifecycle} to REJECTED`
    );
  }

  const updatedEvidence = {
    ...currentEvidence,
    lifecycleState: 'REJECTED' as ActionLifecycleState,
    rejectionReason: reason,
    rejectedBy: userId || 'system',
    rejectedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('co_founder_outcomes')
    .update({
      event_type: 'recommendation_rejected',
      verification_status: 'unverified',
      actual_outcome: `Rejected by founder: ${reason || 'No reason provided'}`,
      evidence: updatedEvidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', record.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to record rejection: ${error?.message}`);
  }

  return mapDatabaseRecordToTrackedAction(data);
}

/**
 * Stage 2: Record Business Action Execution Result.
 *
 * CRITICAL RULE: "Execution Success != Business Success"
 * - If execution failed: state -> 'EXECUTION_FAILED'
 * - If execution succeeded WITH metric expectation: state -> 'OUTCOME_EXPECTED' (verification_status: 'pending')
 *   Outcome is NOT marked achieved yet! It must wait for the measurement window.
 * - If execution succeeded WITHOUT metric expectation: state -> 'OUTCOME_VERIFIED' (operational confirmation)
 */
export async function recordActionExecutionResult(
  input: RecordExecutionResultInput
): Promise<TrackedClosedLoopAction> {
  const supabase = getServiceClient();
  const identifier = input.actionId || input.approvalId || '';
  let record = await findOutcomeRecord(identifier);

  const now = new Date().toISOString();

  // If no tracked proposal was previously registered, create one just-in-time
  if (!record) {
    const defaultWindowDays = 7;
    const measurementWindowEnd = new Date(
      Date.now() + defaultWindowDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const fallbackEvidence: Record<string, any> = {
      lifecycleState: 'EXECUTING' as ActionLifecycleState,
      actionId: input.actionId,
      approvalId: input.approvalId,
      actionType: input.actionType || 'unknown_action',
    };

    const { data: created } = await supabase
      .from('co_founder_outcomes')
      .insert([
        {
          recommendation_id: isValidUuid(input.approvalId)
            ? input.approvalId
            : null,
          action_id: isValidUuid(input.actionId) ? input.actionId : null,
          entity_type: 'action',
          entity_id: input.actionId || input.approvalId || null,
          event_type: input.success ? 'action_executed' : 'action_failed',
          expected_outcome: `Execution of ${input.actionType || 'action'}`,
          verification_status: 'pending',
          evidence: fallbackEvidence,
          measurement_window_end: measurementWindowEnd,
          user_id: input.userId || 'system',
          created_at: now,
          updated_at: now,
        },
      ])
      .select()
      .single();

    record = created;
  }

  if (!record) {
    throw new Error(
      'Could not resolve or initialize tracked outcome record for execution result.'
    );
  }

  const currentEvidence = record.evidence || {};
  const hasMetricExpectation = Boolean(
    currentEvidence.metricExpectation?.metricKey
  );

  let nextLifecycleState: ActionLifecycleState;
  let nextVerificationStatus: VerificationStatus;
  let eventType = record.event_type;
  let actualOutcome = record.actual_outcome;

  if (!input.success) {
    nextLifecycleState = 'EXECUTION_FAILED';
    nextVerificationStatus = 'unverified';
    eventType = 'action_failed';
    actualOutcome = `Execution failed: ${input.error || 'Unknown runtime error'}`;
  } else {
    eventType = 'action_executed';
    if (hasMetricExpectation) {
      // Execution succeeded, but lagging business outcome is still unverified!
      nextLifecycleState = 'OUTCOME_EXPECTED';
      nextVerificationStatus = 'pending';
      actualOutcome = `Execution succeeded. Business metric progression pending measurement window (${currentEvidence.metricExpectation.measurementWindowDays}d).`;
    } else {
      // Purely operational action with no lagging business metric
      nextLifecycleState = 'OUTCOME_VERIFIED';
      nextVerificationStatus = 'verified';
      actualOutcome =
        'Execution completed successfully. Operational state verified.';
    }
  }

  const updatedEvidence = {
    ...currentEvidence,
    actionId: input.actionId,
    lifecycleState: nextLifecycleState,
    executionResultData: input.resultData,
    executionError: input.error,
    executedAt: now,
  };

  const { data: updated, error: updateError } = await supabase
    .from('co_founder_outcomes')
    .update({
      event_type: eventType,
      verification_status: nextVerificationStatus,
      verification_source: 'system_diagnostic',
      actual_outcome: actualOutcome,
      evidence: updatedEvidence,
      updated_at: now,
    })
    .eq('id', record.id)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(
      `Failed to update execution result: ${updateError?.message}`
    );
  }

  await logAuditEvent({
    actorId: input.userId || 'system',
    portal: 'admin',
    action: `co_founder_closed_loop:${eventType}`,
    entityType: 'action_execution',
    entityId: updated.id,
    changes: {
      actionId: input.actionId,
      lifecycleState: nextLifecycleState,
      success: input.success,
      verificationStatus: nextVerificationStatus,
    },
  }).catch(() => {});

  return mapDatabaseRecordToTrackedAction(updated);
}

/**
 * Stage 3: Authoritative Database Metric Measurement.
 * Queries live authoritative tables (`orders`, `products`, `support_tickets`) to obtain ground-truth metric values.
 */
export async function measureAuthoritativeMetric(
  metricKey: string,
  params?: { startDate?: string; endDate?: string; filterEntityId?: string }
): Promise<MetricMeasurementResult> {
  const supabase = getServiceClient();
  const measuredAt = new Date().toISOString();
  const normalizedKey = metricKey.toLowerCase().trim();

  // 1. Order Revenue / Total Sales
  if (
    normalizedKey.includes('revenue') ||
    normalizedKey.includes('sales') ||
    normalizedKey === 'gmv'
  ) {
    let query = supabase.from('orders').select('id, total, status, created_at');

    if (params?.startDate) {
      query = query.gte('created_at', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    const { data: orders, error } = await query;
    if (error) {
      return {
        metricKey,
        currentValue: 0,
        sourceTable: 'orders',
        details: { error: error.message },
        measuredAt,
      };
    }

    const validOrders = (orders || []).filter(
      (o: any) =>
        !['cancelled', 'failed', 'refunded'].includes(
          (o.status || '').toLowerCase()
        )
    );
    const totalRevenue = validOrders.reduce(
      (sum: number, o: any) => sum + Number(o.total || 0),
      0
    );

    return {
      metricKey,
      currentValue: Math.round(totalRevenue * 100) / 100,
      sourceTable: 'orders',
      details: {
        totalOrdersCount: orders?.length || 0,
        validOrdersCount: validOrders.length,
      },
      measuredAt,
    };
  }

  // 2. Order Count / Volume
  if (
    normalizedKey.includes('order_count') ||
    normalizedKey.includes('orders_placed') ||
    normalizedKey === 'orders'
  ) {
    let query = supabase.from('orders').select('id, status, created_at');

    if (params?.startDate) {
      query = query.gte('created_at', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    const { data: orders, error } = await query;
    if (error) {
      return {
        metricKey,
        currentValue: 0,
        sourceTable: 'orders',
        details: { error: error.message },
        measuredAt,
      };
    }

    const completed = (orders || []).filter(
      (o: any) =>
        !['cancelled', 'failed'].includes((o.status || '').toLowerCase())
    );

    return {
      metricKey,
      currentValue: completed.length,
      sourceTable: 'orders',
      details: { rawCount: orders?.length || 0, validCount: completed.length },
      measuredAt,
    };
  }

  // 3. Inventory Stock Level
  if (normalizedKey.includes('stock') || normalizedKey.includes('inventory')) {
    let query = supabase
      .from('products')
      .select('id, name, sku, stock_quantity, status');

    if (params?.filterEntityId) {
      query = query.eq('id', params.filterEntityId);
    }

    const { data: products, error } = await query;
    if (error) {
      return {
        metricKey,
        currentValue: 0,
        sourceTable: 'products',
        details: { error: error.message },
        measuredAt,
      };
    }

    const totalStock = (products || []).reduce(
      (sum: number, p: any) => sum + Number(p.stock_quantity || 0),
      0
    );

    return {
      metricKey,
      currentValue: totalStock,
      sourceTable: 'products',
      details: { matchedProductsCount: products?.length || 0 },
      measuredAt,
    };
  }

  // 4. Support Tickets / Customer Issues
  if (
    normalizedKey.includes('ticket') ||
    normalizedKey.includes('support') ||
    normalizedKey.includes('customer_issues')
  ) {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('id, status, created_at')
      .in('status', ['open', 'in_progress']);

    if (error) {
      return {
        metricKey,
        currentValue: 0,
        sourceTable: 'support_tickets',
        details: { error: error.message },
        measuredAt,
      };
    }

    return {
      metricKey,
      currentValue: tickets?.length || 0,
      sourceTable: 'support_tickets',
      details: { openTicketsCount: tickets?.length || 0 },
      measuredAt,
    };
  }

  // 5. Default Fallback
  return {
    metricKey,
    currentValue: 0,
    sourceTable: 'unknown',
    details: { notice: 'Custom metric key with no direct tabular binding' },
    measuredAt,
  };
}

/**
 * Stage 4: Truthful Outcome Verification Against Authoritative Ground Truth.
 *
 * Strict Rules:
 * 1. If measurement window has not yet expired and `!forceImmediate`:
 *    Refuses false success! Keeps state as OUTCOME_EXPECTED.
 * 2. If window has expired: queries authoritative database, compares against baseline & target,
 *    and detects OUTCOME_ACHIEVED, OUTCOME_REGRESSED, or OUTCOME_CONFLICTED (>25% shortfall).
 * 3. Commits learning signal to memory automatically.
 */
export async function verifyActionOutcome(
  actionIdOrApprovalId: string,
  options?: VerifyActionOutcomeOptions
): Promise<VerifyActionOutcomeResult> {
  const supabase = getServiceClient();
  const record = await findOutcomeRecord(actionIdOrApprovalId);

  if (!record) {
    throw new Error(
      `Tracked action record not found for verification: ${actionIdOrApprovalId}`
    );
  }

  const now = options?.overrideNow || new Date();
  const windowEnd = record.measurement_window_end
    ? new Date(record.measurement_window_end)
    : null;
  const isWindowActive = windowEnd
    ? now.getTime() < windowEnd.getTime()
    : false;

  const currentEvidence = record.evidence || {};
  const metricExpectation = currentEvidence.metricExpectation as
    MetricExpectation | undefined;

  // RULE 1: Refuse false success if window is still active!
  if (isWindowActive && !options?.forceImmediate) {
    const remainingHours = windowEnd
      ? Math.max(
          0,
          Math.round((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60))
        )
      : 0;
    const trackedAction = mapDatabaseRecordToTrackedAction(record);

    return {
      trackedAction,
      verified: false,
      state: 'OUTCOME_EXPECTED',
      reason: `Measurement window is active (${remainingHours}h remaining until ${windowEnd?.toISOString()}). Execution success does not equal business success.`,
    };
  }

  // If no metric expectation exists (e.g. operational mutation)
  if (!metricExpectation) {
    const updatedEvidence = {
      ...currentEvidence,
      lifecycleState: 'OUTCOME_VERIFIED' as ActionLifecycleState,
      verifiedAt: now.toISOString(),
    };

    const { data: updated } = await supabase
      .from('co_founder_outcomes')
      .update({
        verification_status: 'verified',
        verification_source: 'system_diagnostic',
        actual_outcome:
          record.actual_outcome || 'Operational outcome verified.',
        evidence: updatedEvidence,
        updated_at: now.toISOString(),
      })
      .eq('id', record.id)
      .select()
      .single();

    const tracked = mapDatabaseRecordToTrackedAction(updated || record);
    await commitOutcomeLearning(tracked);

    return {
      trackedAction: tracked,
      verified: true,
      state: 'OUTCOME_VERIFIED',
      reason: 'Operational action verified without lagging metric requirement.',
    };
  }

  // RULE 2: Measure Authoritative Metric
  const measurement = await measureAuthoritativeMetric(
    metricExpectation.metricKey,
    {
      startDate: record.created_at,
      endDate: windowEnd?.toISOString() || now.toISOString(),
    }
  );

  const currentVal = measurement.currentValue;
  const baseline = metricExpectation.baselineValue;
  const target = metricExpectation.targetValue;
  const direction = metricExpectation.direction;
  const tolerancePercent = metricExpectation.toleranceThresholdPercent ?? 25;

  let state: ActionLifecycleState;
  let verificationStatus: VerificationStatus;
  let shortfallPercentage = 0;
  let reason = '';

  const delta = Math.round((currentVal - baseline) * 100) / 100;

  if (direction === 'increase') {
    if (currentVal >= target) {
      state = 'OUTCOME_ACHIEVED';
      verificationStatus = 'verified';
      reason = `Target reached or exceeded. Current ${currentVal}${metricExpectation.unit || ''} >= Target ${target}${metricExpectation.unit || ''}.`;
    } else if (currentVal < baseline) {
      state = 'OUTCOME_REGRESSED';
      verificationStatus = 'unverified';
      shortfallPercentage = Math.round(
        ((target - currentVal) / Math.max(1, target - baseline)) * 100
      );
      reason = `Business regression detected! Current value (${currentVal}) declined below baseline (${baseline}).`;
    } else {
      // Between baseline and target
      const requiredGain = Math.max(0.001, target - baseline);
      const actualGain = Math.max(0, currentVal - baseline);
      shortfallPercentage = Math.round(
        ((requiredGain - actualGain) / requiredGain) * 100
      );

      if (shortfallPercentage > tolerancePercent) {
        state = 'OUTCOME_CONFLICTED';
        verificationStatus = 'conflicted';
        reason = `Shortfall exceeds ${tolerancePercent}% tolerance threshold (${shortfallPercentage}% shortfall). Current: ${currentVal}, Target: ${target}.`;
      } else {
        state = 'OUTCOME_ACHIEVED';
        verificationStatus = 'verified';
        reason = `Target reached within acceptable tolerance margin (${shortfallPercentage}% shortfall). Current: ${currentVal}.`;
      }
    }
  } else if (direction === 'decrease') {
    if (currentVal <= target) {
      state = 'OUTCOME_ACHIEVED';
      verificationStatus = 'verified';
      reason = `Target reduction achieved. Current ${currentVal}${metricExpectation.unit || ''} <= Target ${target}${metricExpectation.unit || ''}.`;
    } else if (currentVal > baseline) {
      state = 'OUTCOME_REGRESSED';
      verificationStatus = 'unverified';
      shortfallPercentage = Math.round(
        ((currentVal - target) / Math.max(1, baseline - target)) * 100
      );
      reason = `Business regression detected! Current value (${currentVal}) worsened above baseline (${baseline}).`;
    } else {
      const requiredReduction = Math.max(0.001, baseline - target);
      const actualReduction = Math.max(0, baseline - currentVal);
      shortfallPercentage = Math.round(
        ((requiredReduction - actualReduction) / requiredReduction) * 100
      );

      if (shortfallPercentage > tolerancePercent) {
        state = 'OUTCOME_CONFLICTED';
        verificationStatus = 'conflicted';
        reason = `Reduction shortfall exceeds ${tolerancePercent}% tolerance (${shortfallPercentage}% shortfall). Current: ${currentVal}, Target: ${target}.`;
      } else {
        state = 'OUTCOME_ACHIEVED';
        verificationStatus = 'verified';
        reason = `Target reduction reached within acceptable tolerance (${shortfallPercentage}% shortfall).`;
      }
    }
  } else {
    // Maintain
    const allowedDeviation = Math.max(1, baseline * 0.05); // 5% tolerance
    const deviation = Math.abs(currentVal - target);

    if (deviation <= allowedDeviation) {
      state = 'OUTCOME_ACHIEVED';
      verificationStatus = 'verified';
      reason = `Metric maintained within 5% tolerance. Current: ${currentVal}, Baseline: ${baseline}.`;
    } else {
      state = 'OUTCOME_REGRESSED';
      verificationStatus = 'unverified';
      reason = `Metric drifted outside allowable tolerance. Current: ${currentVal}, Baseline: ${baseline}.`;
    }
  }

  const updatedEvidence = {
    ...currentEvidence,
    lifecycleState: state,
    measuredMetricValue: currentVal,
    shortfallPercentage,
    delta,
    measurementDetails: measurement.details,
    verifiedAt: now.toISOString(),
  };

  const { data: updatedRecord, error: updateErr } = await supabase
    .from('co_founder_outcomes')
    .update({
      verification_status: verificationStatus,
      verification_source: 'authoritative_db',
      actual_outcome: reason,
      evidence: updatedEvidence,
      updated_at: now.toISOString(),
    })
    .eq('id', record.id)
    .select()
    .single();

  if (updateErr) {
    console.error(
      `Failed to update verified outcome in co_founder_outcomes: ${updateErr.message}`
    );
  }

  const trackedAction = mapDatabaseRecordToTrackedAction(
    updatedRecord || record
  );

  // RULE 3: Auto-commit learning into long-term organizational memory
  await commitOutcomeLearning(trackedAction);

  await logAuditEvent({
    actorId: options?.actorId || 'system',
    portal: 'admin',
    action: 'co_founder_closed_loop:outcome_verified',
    entityType: 'action_outcome',
    entityId: trackedAction.id,
    changes: {
      state,
      verificationStatus,
      currentVal,
      target,
      shortfallPercentage,
    },
  }).catch(() => {});

  return {
    trackedAction,
    verified: verificationStatus === 'verified',
    state,
    reason,
    shortfallPercentage,
    currentValue: currentVal,
    delta,
  };
}

/**
 * Stage 5: Continuous Organizational Learning Loop.
 * Writes high-signal outcomes, warnings, or adjustments into Co-Founder Memory.
 */
export async function commitOutcomeLearning(
  trackedAction: TrackedClosedLoopAction
): Promise<{ success: boolean; memoryKey?: string }> {
  try {
    const actionType = trackedAction.actionType || 'action';
    const shortId = trackedAction.id
      ? trackedAction.id.slice(0, 8)
      : `${Date.now()}`;
    const metric = trackedAction.metricExpectation;

    let memoryCategory: 'decision' | 'operational_rule' | 'correction' =
      'decision';
    let memoryKey = `learning_${actionType}_${shortId}`;
    let memoryValue = '';
    let confidence = 0.95;

    switch (trackedAction.lifecycleState) {
      case 'OUTCOME_ACHIEVED':
      case 'OUTCOME_VERIFIED':
        memoryCategory = 'decision';
        memoryKey = `outcome_success_${actionType}_${shortId}`;
        memoryValue = `Verified success for ${actionType}: ${trackedAction.actualOutcome || 'Objective achieved'}. Target was reached.`;
        confidence = 0.98;
        break;

      case 'OUTCOME_REGRESSED':
        memoryCategory = 'correction';
        memoryKey = `outcome_regression_${actionType}_${shortId}`;
        memoryValue = `Performance regression warning for ${actionType}: ${trackedAction.actualOutcome}. Strategy adjustments recommended.`;
        confidence = 0.92;
        break;

      case 'OUTCOME_CONFLICTED':
        memoryCategory = 'operational_rule';
        memoryKey = `outcome_conflict_${actionType}_${shortId}`;
        memoryValue = `Outcome conflicted for ${actionType}: ${trackedAction.actualOutcome}. Requires founder review.`;
        confidence = 0.75;
        break;

      case 'EXECUTION_FAILED':
        memoryCategory = 'correction';
        memoryKey = `execution_failure_${actionType}_${shortId}`;
        memoryValue = `Execution failure for ${actionType}: ${trackedAction.actualOutcome || 'Mutation failed'}.`;
        confidence = 0.9;
        break;

      default:
        return { success: true };
    }

    const res = await writeCoFounderMemory({
      userId: trackedAction.userId || 'system',
      category: memoryCategory,
      key: memoryKey,
      value: memoryValue,
      confidence,
      source: 'system',
      metadata: {
        actionId: trackedAction.actionId,
        approvalId: trackedAction.approvalId,
        lifecycleState: trackedAction.lifecycleState,
        metricKey: metric?.metricKey,
        measuredValue: trackedAction.measuredMetricValue,
      },
    });

    return { success: res.success, memoryKey };
  } catch (err) {
    console.error('commitOutcomeLearning failed non-blockingly:', err);
    return { success: false };
  }
}

/**
 * Stage 6: Batch Scanner for Due Actions.
 * Finds all pending outcomes whose measurement window has expired and executes authoritative verification.
 */
export async function scanAndVerifyDueActions(options?: {
  limit?: number;
  now?: Date;
}): Promise<{
  scannedCount: number;
  verifiedCount: number;
  regressedCount: number;
  conflictedCount: number;
  pendingCount: number;
}> {
  const supabase = getServiceClient();
  const limit = options?.limit ?? 25;
  const now = options?.now || new Date();
  const nowIso = now.toISOString();

  const { data: dueRecords, error } = await supabase
    .from('co_founder_outcomes')
    .select('*')
    .eq('verification_status', 'pending')
    .lte('measurement_window_end', nowIso)
    .limit(limit);

  if (error || !dueRecords || dueRecords.length === 0) {
    return {
      scannedCount: 0,
      verifiedCount: 0,
      regressedCount: 0,
      conflictedCount: 0,
      pendingCount: 0,
    };
  }

  let verifiedCount = 0;
  let regressedCount = 0;
  let conflictedCount = 0;
  let pendingCount = 0;

  for (const record of dueRecords) {
    try {
      const res = await verifyActionOutcome(record.id, {
        overrideNow: now,
      });

      if (
        res.state === 'OUTCOME_ACHIEVED' ||
        res.state === 'OUTCOME_VERIFIED'
      ) {
        verifiedCount++;
      } else if (res.state === 'OUTCOME_REGRESSED') {
        regressedCount++;
      } else if (res.state === 'OUTCOME_CONFLICTED') {
        conflictedCount++;
      } else {
        pendingCount++;
      }
    } catch (verErr) {
      console.error(`Error scanning outcome ${record.id}:`, verErr);
      pendingCount++;
    }
  }

  return {
    scannedCount: dueRecords.length,
    verifiedCount,
    regressedCount,
    conflictedCount,
    pendingCount,
  };
}

/**
 * Stage 7: Get Action Lifecycle Status.
 */
export async function getActionLifecycle(
  actionIdOrApprovalId: string
): Promise<TrackedClosedLoopAction | null> {
  const record = await findOutcomeRecord(actionIdOrApprovalId);
  if (!record) return null;
  return mapDatabaseRecordToTrackedAction(record);
}

/**
 * Stage 8: Operational Analytics & Executive Voice Summary.
 */
export async function getClosedLoopAnalytics(
  days = 30
): Promise<ClosedLoopAnalyticsSummary> {
  const supabase = getServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: records, error } = await supabase
    .from('co_founder_outcomes')
    .select('*')
    .gte('created_at', since);

  const initialStates: Record<ActionLifecycleState, number> = {
    PROPOSED: 0,
    APPROVED: 0,
    REJECTED: 0,
    EXECUTING: 0,
    EXECUTION_SUCCEEDED: 0,
    EXECUTION_FAILED: 0,
    OUTCOME_EXPECTED: 0,
    OUTCOME_ACHIEVED: 0,
    OUTCOME_REGRESSED: 0,
    OUTCOME_CONFLICTED: 0,
    OUTCOME_VERIFIED: 0,
  };

  if (error || !records || records.length === 0) {
    return {
      totalTracked: 0,
      byState: initialStates,
      verifiedRate: 100,
      regressionCount: 0,
      conflictedCount: 0,
      pendingCount: 0,
      executiveSummary: `No closed-loop strategic actions tracked in the past ${days} days.`,
    };
  }

  const byState = { ...initialStates };

  for (const r of records) {
    const s =
      (r.evidence?.lifecycleState as ActionLifecycleState) || 'PROPOSED';
    if (byState[s] !== undefined) {
      byState[s]++;
    }
  }

  const verified = byState.OUTCOME_ACHIEVED + byState.OUTCOME_VERIFIED;
  const verifiedRate =
    records.length > 0 ? Math.round((verified / records.length) * 100) : 100;
  const regressionCount = byState.OUTCOME_REGRESSED;
  const conflictedCount = byState.OUTCOME_CONFLICTED;
  const pendingCount =
    byState.OUTCOME_EXPECTED + byState.PROPOSED + byState.EXECUTING;

  const summary = `Over the past ${days} days, ${records.length} closed-loop actions were tracked. ${verified} verified successfully (${verifiedRate}% success rate), ${pendingCount} are actively awaiting measurement windows, and ${regressionCount} regressions were identified.`;

  return {
    totalTracked: records.length,
    byState,
    verifiedRate,
    regressionCount,
    conflictedCount,
    pendingCount,
    executiveSummary: summary,
  };
}
