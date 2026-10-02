import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

export type RecommendationCategory =
  'BUSINESS' | 'PRODUCT' | 'CUSTOMER' | 'SUPPORT' | 'OPERATIONS';
export type RecommendationConfidence =
  'high' | 'moderate' | 'low' | 'insufficient_evidence';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked'
  | 'executed'
  | 'failed';

export interface RecommendationAlternative {
  title: string;
  description: string;
  tradeoff: string;
}

export interface ImpactAnalysis {
  expectedBenefit: string;
  potentialDownside: string;
  financialImpact?: string;
  customerImpact?: string;
  operationalRisk: 'low' | 'medium' | 'high';
  isReversible: boolean;
}

export interface ProposedAction {
  actionType: string;
  targetEntity: string;
  payload: Record<string, any>;
  requiredScope: string;
  scopeDescription: string;
}

export interface CoFounderRecommendation {
  id?: string;
  title: string;
  category: RecommendationCategory;
  fact: string; // Grounded observation
  interpretation: string; // Business implication
  recommendation: string; // AI proposal
  confidence: RecommendationConfidence;
  alternatives: RecommendationAlternative[];
  impactAnalysis: ImpactAnalysis;
  suggestedAction?: ProposedAction;
  signalId?: string;
  status: 'active' | 'accepted' | 'dismissed' | 'superseded';
  createdAt?: string;
}

export interface ApprovalRequest {
  id?: string;
  recommendationId?: string;
  actionType: string;
  actionPayload: Record<string, any>;
  scopeDescription: string;
  riskLevel: RiskLevel;
  status: ApprovalStatus;
  requestedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  expiresAt: string; // ISO string
  idempotencyKey: string;
  executionResult?: any;
  createdAt?: string;
}

/**
 * Creates a formal recommendation separating Fact, Interpretation, Recommendation, and Action.
 */
export async function createRecommendation(
  rec: Omit<CoFounderRecommendation, 'id' | 'createdAt' | 'status'>
): Promise<{ success: boolean; recommendationId?: string }> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('co_founder_recommendations')
      .insert({
        title: rec.title,
        category: rec.category,
        fact: rec.fact,
        interpretation: rec.interpretation,
        recommendation: rec.recommendation,
        confidence: rec.confidence,
        alternatives: rec.alternatives || [],
        impact_analysis: rec.impactAnalysis || {},
        suggested_action: rec.suggestedAction || null,
        signal_id: rec.signalId || null,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, recommendationId: data?.id };
  } catch (err: any) {
    console.error('Error creating recommendation:', err);
    return { success: false };
  }
}

/**
 * Create a formal Approval Request for high-impact actions.
 */
export async function createApprovalRequest(params: {
  recommendationId?: string;
  actionType: string;
  actionPayload: Record<string, any>;
  scopeDescription: string;
  riskLevel?: RiskLevel;
  requestedBy?: string;
  expirationHours?: number;
}): Promise<{ success: boolean; approvalId?: string; error?: string }> {
  const supabase = getServiceClient();

  const riskLevel = params.riskLevel || 'high';
  const expirationHours = params.expirationHours || 24;
  const expiresAt = new Date(
    Date.now() + expirationHours * 60 * 60 * 1000
  ).toISOString();

  // Deterministic idempotency key: actionType + JSON payload hash/string
  const payloadHash = JSON.stringify(params.actionPayload);
  const idempotencyKey = `${params.actionType}:${payloadHash}`;

  try {
    // Check if an identical active pending approval already exists
    const { data: existing } = await supabase
      .from('co_founder_approvals')
      .select('id, status, expires_at')
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      if (new Date(existing.expires_at) > new Date()) {
        return { success: true, approvalId: existing.id };
      }
    }

    const { data, error } = await supabase
      .from('co_founder_approvals')
      .insert({
        recommendation_id: params.recommendationId || null,
        action_type: params.actionType,
        action_payload: params.actionPayload,
        scope_description: params.scopeDescription,
        risk_level: riskLevel,
        status: 'pending',
        requested_by: params.requestedBy || null,
        expires_at: expiresAt,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, approvalId: data?.id };
  } catch (err: any) {
    console.error('Error creating approval request:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Transition Approval state with explicit user consent and audit logging.
 */
export async function reviewApproval(params: {
  approvalId: string;
  decision: 'approved' | 'rejected' | 'revoked';
  reviewedBy: string;
  reviewerRole?: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; status?: ApprovalStatus; error?: string }> {
  const supabase = getServiceClient();

  try {
    // 1. Fetch current approval record
    const { data: approval, error: fetchErr } = await supabase
      .from('co_founder_approvals')
      .select('*')
      .eq('id', params.approvalId)
      .single();

    if (fetchErr || !approval) {
      return { success: false, error: 'Approval record not found' };
    }

    // 2. Validate current state: only pending can be transitioned
    if (approval.status !== 'pending') {
      return {
        success: false,
        error: `Cannot ${params.decision} approval with status '${approval.status}'.`,
      };
    }

    // 3. Expiration Check (Phase 13)
    if (new Date(approval.expires_at) <= new Date()) {
      await supabase
        .from('co_founder_approvals')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', params.approvalId);

      return {
        success: false,
        status: 'expired',
        error: 'This approval request has expired and cannot be processed.',
      };
    }

    // 4. Update status
    const newStatus: ApprovalStatus =
      params.decision === 'approved'
        ? 'approved'
        : params.decision === 'rejected'
          ? 'rejected'
          : 'revoked';

    const { error: updateErr } = await supabase
      .from('co_founder_approvals')
      .update({
        status: newStatus,
        reviewed_by: params.reviewedBy,
        reviewed_at: new Date().toISOString(),
        rejection_reason: params.rejectionReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.approvalId);

    if (updateErr) throw updateErr;

    // 5. Audit Logging (Phase 20)
    await logAuditEvent({
      portal: 'admin',
      action: `co_founder_approval_${newStatus}`,
      entityType: 'co_founder_approval',
      entityId: params.approvalId,
      changes: {
        actionType: approval.action_type,
        decision: newStatus,
        reviewedBy: params.reviewedBy,
        rejectionReason: params.rejectionReason,
      },
    }).catch(() => {});

    return { success: true, status: newStatus };
  } catch (err: any) {
    console.error('Error reviewing approval:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Format an Approval for LiveKit Spoken Voice (Phase 17).
 */
export function formatApprovalForVoice(approval: ApprovalRequest): string {
  return `Approval requested for ${approval.actionType.replace(/_/g, ' ')}. ${
    approval.scopeDescription
  }. This is classified as a ${approval.riskLevel} risk action. Would you like me to proceed with execution?`;
}

/**
 * Format an Approval for Chat Interface (Phase 18).
 */
export function formatApprovalForChat(approval: ApprovalRequest): string {
  return (
    `### Action Approval Required\n` +
    `**Action:** \`${approval.actionType}\`\n` +
    `**Scope:** ${approval.scopeDescription}\n` +
    `**Risk Level:** \`${approval.riskLevel.toUpperCase()}\`\n` +
    `**Status:** \`${approval.status}\`\n` +
    `**Expires:** ${new Date(approval.expiresAt).toLocaleString('en-IN')}\n\n` +
    `\`\`\`json\n${JSON.stringify(approval.actionPayload, null, 2)}\n\`\`\``
  );
}

/**
 * Fetch all pending approvals awaiting founder review.
 */
export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('co_founder_approvals')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      recommendationId: d.recommendation_id,
      actionType: d.action_type,
      actionPayload: d.action_payload,
      scopeDescription: d.scope_description,
      riskLevel: d.risk_level,
      status: d.status,
      requestedBy: d.requested_by,
      reviewedBy: d.reviewed_by,
      reviewedAt: d.reviewed_at,
      rejectionReason: d.rejection_reason,
      expiresAt: d.expires_at,
      idempotencyKey: d.idempotency_key,
      executionResult: d.execution_result,
      createdAt: d.created_at,
    }));
  } catch (err: any) {
    console.error('Error fetching pending approvals:', err);
    return [];
  }
}
