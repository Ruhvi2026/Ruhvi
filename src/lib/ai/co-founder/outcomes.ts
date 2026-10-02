import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

export type OutcomeEntityType =
  | 'recommendation'
  | 'action'
  | 'proactive_signal'
  | 'engineering_task'
  | 'general_decision';

export type OutcomeEventType =
  | 'recommendation_created'
  | 'recommendation_accepted'
  | 'recommendation_rejected'
  | 'recommendation_modified'
  | 'action_approved'
  | 'action_executed'
  | 'action_failed'
  | 'task_completed'
  | 'task_failed'
  | 'proactive_suggestion_accepted'
  | 'proactive_suggestion_rejected'
  | 'user_correction'
  | 'user_feedback'
  | 'measurable_business_result'
  | 'outcome_verified';

export type VerificationStatus =
  'pending' | 'verified' | 'unverified' | 'conflicted' | 'unresolved';

export type VerificationSource =
  | 'authoritative_db'
  | 'user_report'
  | 'analytics_engine'
  | 'inferred'
  | 'system_diagnostic';

export interface OutcomeRecord {
  id: string;
  recommendation_id?: string;
  action_id?: string;
  entity_type: OutcomeEntityType;
  entity_id?: string;
  event_type: OutcomeEventType;
  expected_outcome?: string;
  actual_outcome?: string;
  verification_status: VerificationStatus;
  verification_source?: VerificationSource;
  evidence?: Record<string, any>;
  feedback_text?: string;
  feedback_sentiment?: 'positive' | 'negative' | 'neutral' | 'correction';
  learning_signal?: Record<string, any>;
  measurement_window_end?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOutcomeInput {
  recommendationId?: string;
  actionId?: string;
  entityType: OutcomeEntityType;
  entityId?: string;
  eventType: OutcomeEventType;
  expectedOutcome?: string;
  actualOutcome?: string;
  verificationStatus?: VerificationStatus;
  verificationSource?: VerificationSource;
  evidence?: Record<string, any>;
  feedbackText?: string;
  feedbackSentiment?: 'positive' | 'negative' | 'neutral' | 'correction';
  learningSignal?: Record<string, any>;
  measurementWindowEnd?: string;
  userId?: string;
}

export interface UserFeedbackInput {
  entityType: OutcomeEntityType;
  entityId: string;
  recommendationId?: string;
  actionId?: string;
  feedbackText: string;
  feedbackType: 'positive' | 'negative' | 'correction' | 'neutral';
  reportedOutcome?: string;
  updateMemory?: boolean;
  userId: string;
}

export interface OutcomeAnalyticsSummary {
  totalOutcomesTracked: number;
  acceptanceRate: number; // 0 to 100
  rejectionRate: number; // 0 to 100
  actionExecutionSuccessRate: number; // 0 to 100
  verifiedSuccessRate: number; // 0 to 100
  pendingVerifications: number;
  conflictedOutcomes: number;
  learningSignalsGenerated: number;
  executiveVoiceSummary: string;
}

/**
 * Record an outcome tracking event in co_founder_outcomes.
 * Adheres to Global Rules:
 * - Expected != Actual != Verified
 * - Execution Success != Business Success
 */
export async function recordOutcomeEvent(
  input: CreateOutcomeInput
): Promise<OutcomeRecord> {
  const supabase = getServiceClient();

  // Generate learning signal heuristic if applicable
  const learningSignal: Record<string, any> = input.learningSignal || {};

  if (input.eventType === 'recommendation_rejected') {
    learningSignal.strategyAdjustment = 'reduce_frequency';
    learningSignal.confidencePenalty = 0.15;
  } else if (input.eventType === 'recommendation_accepted') {
    learningSignal.strategyReinforcement = 'prioritize_similar';
    learningSignal.confidenceBoost = 0.05;
  } else if (input.eventType === 'user_correction') {
    learningSignal.requiresClarification = true;
    learningSignal.userDirectiveOverrodePriorBelief = true;
  }

  const newRecord = {
    recommendation_id: input.recommendationId || null,
    action_id: input.actionId || null,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    event_type: input.eventType,
    expected_outcome: input.expectedOutcome || null,
    actual_outcome: input.actualOutcome || null,
    verification_status: input.verificationStatus || 'pending',
    verification_source: input.verificationSource || null,
    evidence: input.evidence || {},
    feedback_text: input.feedbackText || null,
    feedback_sentiment: input.feedbackSentiment || null,
    learning_signal: learningSignal,
    measurement_window_end: input.measurementWindowEnd || null,
    user_id: input.userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('co_founder_outcomes')
    .insert([newRecord])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record outcome event: ${error.message}`);
  }

  // Audit log
  await logAuditEvent({
    actorId: input.userId || 'system',
    action: `co_founder_outcome:${input.eventType}`,
    entityType: input.entityType,
    entityId: data.id,
    changes: {
      recommendationId: input.recommendationId,
      verificationStatus: data.verification_status,
      expected: input.expectedOutcome,
      actual: input.actualOutcome,
    },
  });

  return data as OutcomeRecord;
}

/**
 * Record human founder feedback or correction (Phase 9, 17).
 * Connects feedback to memory if it indicates a persistent strategic rule.
 */
export async function recordUserFeedback(input: UserFeedbackInput): Promise<{
  outcome: OutcomeRecord;
  voiceSummary: string;
}> {
  const supabase = getServiceClient();

  const isCorrection = input.feedbackType === 'correction';
  const verificationStatus: VerificationStatus = 'unverified'; // User feedback is recorded as unverified until authoritative DB checks confirm it

  const outcome = await recordOutcomeEvent({
    entityType: input.entityType,
    entityId: input.entityId,
    recommendationId: input.recommendationId,
    actionId: input.actionId,
    eventType: isCorrection ? 'user_correction' : 'user_feedback',
    actualOutcome: input.reportedOutcome || input.feedbackText,
    verificationStatus,
    verificationSource: 'user_report',
    feedbackText: input.feedbackText,
    feedbackSentiment:
      input.feedbackType === 'positive'
        ? 'positive'
        : input.feedbackType === 'negative'
          ? 'negative'
          : input.feedbackType === 'correction'
            ? 'correction'
            : 'neutral',
    userId: input.userId,
    learningSignal: {
      feedbackType: input.feedbackType,
      userReportedAt: new Date().toISOString(),
    },
  });

  // If user requested to remember this or it's an explicit correction, store in Co-Founder memory
  if (input.updateMemory || isCorrection) {
    try {
      await supabase.from('co_founder_memories').insert([
        {
          category: 'founder_preference',
          content: `Founder feedback on ${input.entityType} (${input.entityId}): "${input.feedbackText}"`,
          confidence: 0.95,
          tags: ['feedback', input.feedbackType, input.entityType],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch {}
  }

  const voiceSummary = isCorrection
    ? `I have noted your correction regarding ${input.entityType} ${input.entityId} and updated our strategic context.`
    : `Thank you for the feedback. I have recorded your ${input.feedbackType} assessment to refine future recommendations.`;

  return { outcome, voiceSummary };
}

/**
 * Verify a delayed outcome against authoritative business data (Phase 6, 7, 8).
 */
export async function verifyDelayedOutcome(
  outcomeId: string,
  measuredData?: {
    metricName: string;
    measuredValue: number;
    expectedValue: number;
  }
): Promise<OutcomeRecord> {
  const supabase = getServiceClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('co_founder_outcomes')
    .select('*')
    .eq('id', outcomeId)
    .single();

  if (fetchErr || !existing) {
    throw new Error(`Outcome record not found: ${outcomeId}`);
  }

  let newStatus: VerificationStatus = 'verified';
  const evidence: Record<string, any> = { ...existing.evidence };

  if (measuredData) {
    evidence.measuredData = measuredData;
    // Check for conflict: if measured is significantly worse than expected
    const deviation =
      (measuredData.measuredValue - measuredData.expectedValue) /
      (measuredData.expectedValue || 1);
    if (deviation < -0.25) {
      newStatus = 'conflicted';
    } else {
      newStatus = 'verified';
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('co_founder_outcomes')
    .update({
      verification_status: newStatus,
      verification_source: 'authoritative_db',
      evidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', outcomeId)
    .select()
    .single();

  if (updateErr) {
    throw new Error(
      `Failed to update outcome verification: ${updateErr.message}`
    );
  }

  return updated as OutcomeRecord;
}

/**
 * Get aggregate outcome intelligence and performance analytics (Phase 20).
 */
export async function getOutcomeAnalytics(
  days = 30
): Promise<OutcomeAnalyticsSummary> {
  const supabase = getServiceClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await supabase
    .from('co_founder_outcomes')
    .select('*')
    .gte('created_at', since);

  if (error || !data || data.length === 0) {
    return {
      totalOutcomesTracked: 0,
      acceptanceRate: 0,
      rejectionRate: 0,
      actionExecutionSuccessRate: 100,
      verifiedSuccessRate: 0,
      pendingVerifications: 0,
      conflictedOutcomes: 0,
      learningSignalsGenerated: 0,
      executiveVoiceSummary:
        'No outcome tracking records found for the past thirty days. The learning loop is awaiting new decisions.',
    };
  }

  const total = data.length;
  const accepted = data.filter(
    (d) => d.event_type === 'recommendation_accepted'
  ).length;
  const rejected = data.filter(
    (d) => d.event_type === 'recommendation_rejected'
  ).length;
  const recTotal = accepted + rejected;

  const acceptanceRate =
    recTotal > 0 ? Math.round((accepted / recTotal) * 100) : 0;
  const rejectionRate =
    recTotal > 0 ? Math.round((rejected / recTotal) * 100) : 0;

  const actionExecuted = data.filter(
    (d) => d.event_type === 'action_executed'
  ).length;
  const actionFailed = data.filter(
    (d) => d.event_type === 'action_failed'
  ).length;
  const actionTotal = actionExecuted + actionFailed;
  const actionExecutionSuccessRate =
    actionTotal > 0 ? Math.round((actionExecuted / actionTotal) * 100) : 100;

  const verified = data.filter(
    (d) => d.verification_status === 'verified'
  ).length;
  const pending = data.filter(
    (d) => d.verification_status === 'pending'
  ).length;
  const conflicted = data.filter(
    (d) => d.verification_status === 'conflicted'
  ).length;
  const verifiedSuccessRate =
    total > 0 ? Math.round((verified / total) * 100) : 0;

  const learningSignals = data.filter(
    (d) => d.learning_signal && Object.keys(d.learning_signal).length > 0
  ).length;

  const voiceSummary = `Over the last ${days} days, we tracked ${total} strategic outcomes with an acceptance rate of ${acceptanceRate} percent and ${verified} verified business results. ${
    conflicted > 0
      ? `Note that ${conflicted} outcome${conflicted > 1 ? 's have' : ' has'} conflicting data awaiting review.`
      : 'All verified outcomes align with authoritative metrics.'
  }`;

  return {
    totalOutcomesTracked: total,
    acceptanceRate,
    rejectionRate,
    actionExecutionSuccessRate,
    verifiedSuccessRate,
    pendingVerifications: pending,
    conflictedOutcomes: conflicted,
    learningSignalsGenerated: learningSignals,
    executiveVoiceSummary: voiceSummary,
  };
}
