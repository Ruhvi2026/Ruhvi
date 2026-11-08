/**
 * Ruhvi AI Co-Founder — Capability Gap Detector & Prioritization
 * Phase 7: Analyzes operational weaknesses, applies multi-factor ranking,
 * and enforces the recommendation hierarchy.
 */

import { getCofounderDataClient } from '../data-client';
import { CapabilityGap, FailureClass } from './types';
import { RsiCapabilityRegistry } from './capability-registry';
import { assertRsiOperationAllowed } from './governance';

export interface GapScoringFactors {
  impact: number; // 1 to 5
  confidence: number; // 0.1 to 1.0
  urgency: number; // 1 to 5
  recurrence: number; // e.g. count of occurrences
  effort: number; // 1 (easy) to 5 (hard)
  riskPenalty: number; // 0 (safe) to 2 (high risk)
}

export class RsiGapDetector {
  private client = getCofounderDataClient();
  private registry = new RsiCapabilityRegistry();

  /**
   * Calculates transparent priority score using the blueprint formula:
   * priority_score = (impact * confidence * urgency * recurrence) / (effort * (1 + riskPenalty))
   */
  calculatePriorityScore(factors: GapScoringFactors): number {
    const numerator =
      factors.impact *
      factors.confidence *
      factors.urgency *
      Math.max(1, factors.recurrence);
    const denominator =
      Math.max(1, factors.effort) * (1 + Math.max(0, factors.riskPenalty));
    return Math.round((numerator / denominator) * 100) / 100;
  }

  /**
   * Enforces the 5-tier recommendation hierarchy:
   * 1. Reuse/fix existing capability
   * 2. Improve prompt/skill
   * 3. Add small tool
   * 4. Temporary bounded subtask pattern
   * 5. Propose new permanent worker
   */
  determineRecommendedAction(
    gapTitle: string,
    category: FailureClass | 'missing_capability'
  ): CapabilityGap['recommended_action_type'] {
    // 1. Check if an existing worker already handles this
    const check = this.registry.isCapabilityCovered(gapTitle);
    if (check.covered) {
      return 'reuse_existing';
    }

    // 2. If it's a prompt or routing quality issue, improve prompt/skill
    if (
      category === 'routing' ||
      category === 'missing_context' ||
      category === 'model_quality'
    ) {
      return 'improve_prompt_skill';
    }

    // 3. If it's a tool/API limitation, recommend adding a typed tool
    if (category === 'tool_schema' || category === 'external_dependency') {
      return 'small_tool';
    }

    // 4. If it's an isolated separable calculation, recommend subtask
    if (category === 'cost' || category === 'latency') {
      return 'subtask_pattern';
    }

    // 5. Default to proposing a dedicated worker only when all simpler options are exhausted
    return 'worker_proposal';
  }

  /**
   * Records a detected gap to Cloudflare D1
   */
  async recordGap(params: {
    title: string;
    description: string;
    category: FailureClass | 'missing_capability';
    evidenceRefs: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    factors: GapScoringFactors;
  }): Promise<{ success: boolean; gapId?: string; error?: string }> {
    assertRsiOperationAllowed('gap_detection_write');

    const score = this.calculatePriorityScore(params.factors);
    const recommendedAction = this.determineRecommendedAction(
      params.title,
      params.category
    );

    const res = await this.client.recordCapabilityGap({
      title: params.title,
      description: `${params.description} | Action: ${recommendedAction} | Score: ${score}`,
      category: params.category,
      evidence_refs: params.evidenceRefs,
      severity: params.severity || 'medium',
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, gapId: res.data?.id };
  }
}
