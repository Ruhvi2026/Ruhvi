import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { getStoreAnalytics } from './analytics';
import { getRelevantMemories } from './memory';

export type SignalCategory =
  'BUSINESS' | 'RISK' | 'OPPORTUNITY' | 'FOLLOW_UP' | 'SYSTEM';
export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SignalConfidence =
  'confirmed' | 'strong' | 'possible' | 'insufficient_evidence';

export interface ProactiveSignal {
  id?: string;
  fingerprint: string;
  signalType: string;
  category: SignalCategory;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  title: string;
  summary: string; // Voice brevity: 1-2 spoken sentences
  detail: string; // Structured text breakdown
  metrics?: Record<string, any>;
  recommendedAction?: string;
  requiresApproval: boolean;
  isAcknowledged?: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  createdAt?: string;
}

export interface ProactiveScanResult {
  generatedCount: number;
  suppressedCount: number;
  activeSignals: ProactiveSignal[];
  voiceGreeting?: string;
}

/**
 * Generate a deterministic fingerprint to enforce deduplication and idempotency.
 */
export function createSignalFingerprint(
  signalType: string,
  entityId: string,
  dateBucket: string
): string {
  return `${signalType}:${entityId}:${dateBucket}`;
}

/**
 * Scan real Ruhvi data, evaluate baselines, and detect high-conviction proactive signals.
 */
export async function scanProactiveSignals(
  options: {
    userId?: string;
    adminName?: string;
    cooldownHours?: number;
  } = {}
): Promise<ProactiveScanResult> {
  const supabase = getServiceClient();
  const cooldownHours = options.cooldownHours ?? 12;
  const now = new Date();
  const dateBucket = now.toISOString().split('T')[0]; // Daily bucket

  const candidateSignals: ProactiveSignal[] = [];

  try {
    // 1. Fetch 7d analytics to evaluate business anomalies and trends
    const analytics7d = await getStoreAnalytics({ timeframe: '7d' });
    const kpis7d = analytics7d.kpis;
    const comparisons7d = analytics7d.comparisons;

    // A. Revenue Anomaly Detection (Drop or Spike)
    if (comparisons7d?.revenue) {
      const revComp = comparisons7d.revenue;
      if (
        revComp.isAnomaly &&
        revComp.percentageChange !== null &&
        revComp.percentageChange <= -25
      ) {
        candidateSignals.push({
          fingerprint: createSignalFingerprint(
            'revenue_drop',
            'store_7d',
            dateBucket
          ),
          signalType: 'revenue_drop',
          category: 'RISK',
          severity: 'critical',
          confidence:
            revComp.anomalyConfidence === 'confirmed' ? 'confirmed' : 'strong',
          title: 'Significant Revenue Decline Detected',
          summary: `Net revenue decreased ${Math.abs(revComp.percentageChange)}% over the last 7 days compared to the prior period, landing at ₹${kpis7d.netRevenue.toLocaleString('en-IN')}.`,
          detail: `Revenue dropped from ₹${revComp.baseline.toLocaleString('en-IN')} to ₹${revComp.current.toLocaleString('en-IN')} (${revComp.percentageChange}% change). Sample size: ${analytics7d.evidence.sampleSizeOrders} orders.`,
          metrics: {
            currentRevenue: revComp.current,
            baselineRevenue: revComp.baseline,
            percentageChange: revComp.percentageChange,
          },
          recommendedAction:
            'Inspect checkout conversion rates and review recent traffic acquisition channels.',
          requiresApproval: true,
        });
      }
    }

    // B. High Cancellation Rate Spike
    if (kpis7d.totalOrders >= 5 && kpis7d.cancellationRate >= 20) {
      candidateSignals.push({
        fingerprint: createSignalFingerprint(
          'high_cancellations',
          'orders_7d',
          dateBucket
        ),
        signalType: 'high_cancellations',
        category: 'RISK',
        severity: 'high',
        confidence: 'confirmed',
        title: 'Elevated Order Cancellation Rate',
        summary: `We have experienced a ${kpis7d.cancellationRate}% order cancellation rate across ${kpis7d.totalOrders} orders recently.`,
        detail: `${kpis7d.cancelledOrders} out of ${kpis7d.totalOrders} orders were cancelled in the last 7 days.`,
        metrics: {
          totalOrders: kpis7d.totalOrders,
          cancelledOrders: kpis7d.cancelledOrders,
          cancellationRate: kpis7d.cancellationRate,
        },
        recommendedAction:
          'Review customer cancellation reasons and check payment gateway webhook health.',
        requiresApproval: true,
      });
    }

    // C. Critical Inventory Stock Warning
    if (kpis7d.lowStockItemsCount > 0) {
      candidateSignals.push({
        fingerprint: createSignalFingerprint(
          'low_inventory',
          'catalog',
          dateBucket
        ),
        signalType: 'low_inventory',
        category: 'OPPORTUNITY',
        severity: kpis7d.lowStockItemsCount >= 5 ? 'high' : 'medium',
        confidence: 'confirmed',
        title: 'Low Inventory Alert for Active Catalog Items',
        summary: `There are ${kpis7d.lowStockItemsCount} active products with 5 or fewer units remaining in stock.`,
        detail: `Safety stock thresholds triggered for ${kpis7d.lowStockItemsCount} items. Top seller demand may be constrained if not restocked promptly.`,
        metrics: { lowStockCount: kpis7d.lowStockItemsCount },
        recommendedAction:
          'Issue restock request or adjust safety buffers with artisan suppliers.',
        requiresApproval: true,
      });
    }

    // D. Urgent Customer Support Tickets
    if (kpis7d.urgentTicketsCount > 0) {
      candidateSignals.push({
        fingerprint: createSignalFingerprint(
          'urgent_tickets',
          'support_queue',
          dateBucket
        ),
        signalType: 'urgent_tickets',
        category: 'RISK',
        severity: 'high',
        confidence: 'confirmed',
        title: 'Urgent Customer Support Requests Pending',
        summary: `There are ${kpis7d.urgentTicketsCount} urgent or high-priority support tickets awaiting resolution.`,
        detail: `Support escalation queue requires operational review. Open tickets: ${kpis7d.openSupportTicketsCount}, Urgent: ${kpis7d.urgentTicketsCount}.`,
        metrics: {
          urgentTickets: kpis7d.urgentTicketsCount,
          openTickets: kpis7d.openSupportTicketsCount,
        },
        recommendedAction:
          'Assign available support staff to expedite ticket resolution.',
        requiresApproval: true,
      });
    }

    // E. Strategic Directives & Memory Follow-ups (Stage 3 Integration)
    if (options.userId) {
      const strategicMemories = await getRelevantMemories(
        options.userId,
        'strategic_goal',
        3
      );
      if (strategicMemories.length > 0) {
        const topGoal = strategicMemories[0];
        candidateSignals.push({
          fingerprint: createSignalFingerprint(
            'strategic_followup',
            topGoal.key,
            dateBucket
          ),
          signalType: 'strategic_followup',
          category: 'FOLLOW_UP',
          severity: 'medium',
          confidence: 'strong',
          title: `Strategic Goal Follow-up: ${topGoal.key.replace(/_/g, ' ')}`,
          summary: `Following up on strategic directive: "${topGoal.value.slice(0, 80)}...". Current 7-day revenue is ₹${kpis7d.netRevenue.toLocaleString('en-IN')}.`,
          detail: `Active founder directive recorded: ${topGoal.value}.`,
          recommendedAction:
            'Review campaign progress against targets in next executive check-in.',
          requiresApproval: false,
        });
      }
    }
  } catch (err: any) {
    console.error(
      'Error calculating candidate signals in scanProactiveSignals:',
      err
    );
  }

  // 2. Deduplication & Cooldown Filtering against Supabase
  let generatedCount = 0;
  let suppressedCount = 0;
  const activeSignals: ProactiveSignal[] = [];

  const cooldownCutoff = new Date(
    now.getTime() - cooldownHours * 60 * 60 * 1000
  ).toISOString();

  for (const signal of candidateSignals) {
    try {
      // Check existing signal in co_founder_signals
      const { data: existing } = await supabase
        .from('co_founder_signals')
        .select('id, is_acknowledged, created_at')
        .eq('fingerprint', signal.fingerprint)
        .gte('created_at', cooldownCutoff)
        .maybeSingle();

      if (existing) {
        suppressedCount++;
        continue; // Suppress duplicate notification within cooldown window
      }

      // Persist newly detected proactive signal
      const { data: inserted, error: insertError } = await supabase
        .from('co_founder_signals')
        .insert({
          fingerprint: signal.fingerprint,
          signal_type: signal.signalType,
          category: signal.category,
          severity: signal.severity,
          confidence: signal.confidence,
          title: signal.title,
          summary: signal.summary,
          detail: signal.detail,
          metrics: signal.metrics || {},
          recommended_action: signal.recommendedAction,
          requires_approval: signal.requiresApproval,
          is_acknowledged: false,
        })
        .select('id, created_at')
        .single();

      if (!insertError && inserted) {
        signal.id = inserted.id;
        signal.createdAt = inserted.created_at;
      }

      activeSignals.push(signal);
      generatedCount++;
    } catch {
      // Fallback: If DB insertion fails, keep signal in memory for this session
      activeSignals.push(signal);
      generatedCount++;
    }
  }

  // 3. Priority Sorting (Critical > High > Medium > Low)
  const severityRank: Record<SignalSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  activeSignals.sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );

  // 4. Voice Greeting Builder (For Stage 2 Realtime Audio Session)
  let voiceGreeting: string | undefined;
  if (activeSignals.length > 0) {
    const topSignal = activeSignals[0];
    const founder = options.adminName || 'there';
    voiceGreeting = `Good to speak with you, ${founder}. A quick update: ${topSignal.summary}`;
  }

  return {
    generatedCount,
    suppressedCount,
    activeSignals,
    voiceGreeting,
  };
}

/**
 * Acknowledge a proactive signal so it will not be surfaced repeatedly.
 */
export async function acknowledgeSignal(
  signalId: string,
  userId?: string
): Promise<{ success: boolean }> {
  const supabase = getServiceClient();

  try {
    const { error } = await supabase
      .from('co_founder_signals')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId || null,
      })
      .eq('id', signalId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error acknowledging proactive signal:', err);
    return { success: false };
  }
}

/**
 * Fetch unacknowledged active signals for dashboard display or chat context.
 */
export async function getActiveProactiveSignals(
  limit = 5
): Promise<ProactiveSignal[]> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('co_founder_signals')
      .select('*')
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      fingerprint: d.fingerprint,
      signalType: d.signal_type,
      category: d.category,
      severity: d.severity,
      confidence: d.confidence,
      title: d.title,
      summary: d.summary,
      detail: d.detail,
      metrics: d.metrics,
      recommendedAction: d.recommended_action,
      requiresApproval: d.requires_approval,
      isAcknowledged: d.is_acknowledged,
      createdAt: d.created_at,
    }));
  } catch (err: any) {
    console.error('Error fetching active signals:', err);
    return [];
  }
}

export interface ExecutiveAdvisorReport {
  problemOrOpportunity: string;
  evidence: string;
  recommendedSolution: string;
  actionPlan: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  executiveVoiceSummary: string;
}

/**
 * Standardized Proactive Advisor Mode:
 * Proactively generates executive briefings in the strict format:
 * Problem/Opportunity → Evidence → Recommended Solution → Action Plan → Priority
 */
export async function generateExecutiveAdvisorBriefing(): Promise<
  ExecutiveAdvisorReport[]
> {
  const { runBusinessIntelligenceScan } =
    await import('./business-intelligence');
  const { formulateStrategicSolution } = await import('./strategy-engine');
  const { generateActionPlanFromStrategy } = await import('./action-planner');

  const digest = await runBusinessIntelligenceScan('7d');
  const reports: ExecutiveAdvisorReport[] = [];

  // 1. Process Problems with sufficient evidence
  for (const prob of digest.problems) {
    const strategy = formulateStrategicSolution({
      title: prob.title,
      issueType: prob.title,
      additionalContext: prob.detail,
    });
    const plan = generateActionPlanFromStrategy(strategy, {
      problemStatement: prob.summary,
    });

    reports.push({
      problemOrOpportunity: `[PROBLEM] ${prob.title}: ${prob.summary}`,
      evidence: `${prob.detail} Potential Impact: ${prob.potentialImpact}`,
      recommendedSolution: strategy.recommendedSolution,
      actionPlan: `Tasks to create: ${plan.tasks.map((t) => t.title).join('; ')}`,
      priority: prob.severity,
      executiveVoiceSummary: `${prob.summary} I recommend ${strategy.recommendedSolution.slice(0, 120)}...`,
    });
  }

  // 2. Process Operational Risks
  for (const risk of digest.risks) {
    const strategy = formulateStrategicSolution({
      title: risk.title,
      issueType: risk.title,
      additionalContext: risk.detail,
    });
    const plan = generateActionPlanFromStrategy(strategy, {
      problemStatement: risk.summary,
    });

    reports.push({
      problemOrOpportunity: `[RISK] ${risk.title}: ${risk.summary}`,
      evidence: `${risk.detail} Potential Impact: ${risk.potentialImpact}`,
      recommendedSolution: strategy.recommendedSolution,
      actionPlan: `Tasks to create: ${plan.tasks.map((t) => t.title).join('; ')}`,
      priority: risk.severity,
      executiveVoiceSummary: `${risk.summary} Recommended move: ${strategy.recommendedSolution.slice(0, 120)}...`,
    });
  }

  // 3. Process Growth Opportunities
  for (const opp of digest.growthOpportunities) {
    const strategy = formulateStrategicSolution({
      title: opp.title,
      issueType: opp.title,
      additionalContext: opp.detail,
    });
    const plan = generateActionPlanFromStrategy(strategy, {
      problemStatement: opp.summary,
    });

    reports.push({
      problemOrOpportunity: `[OPPORTUNITY] ${opp.title}: ${opp.summary}`,
      evidence: `${opp.detail} Potential Impact: ${opp.potentialImpact}`,
      recommendedSolution: strategy.recommendedSolution,
      actionPlan: `Tasks to create: ${plan.tasks.map((t) => t.title).join('; ')}`,
      priority: opp.severity,
      executiveVoiceSummary: `${opp.summary} We can capture ${strategy.expectedImpact.quantitativeProjection}.`,
    });
  }

  return reports;
}
