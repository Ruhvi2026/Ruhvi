import 'server-only';

import { createHash, randomUUID } from 'crypto';
import { CandidateGoal, GoalStatus, WorkerId, WorkforceSignal } from './types';

export class GoalDiscoveryEngine {
  private activeFingerprints = new Map<
    string,
    { createdAt: number; status: GoalStatus }
  >();

  /**
   * Generates a stable duplicate-prevention fingerprint.
   */
  computeGoalFingerprint(
    workerId: WorkerId,
    objective: string,
    targetKpi?: string
  ): string {
    const raw = `${workerId}:${objective.toLowerCase().trim()}:${(targetKpi || '').toLowerCase().trim()}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  /**
   * Transparent Priority Scoring Formula:
   * base_priority = (impact * confidence * urgency * strategic_alignment) / max(effort, 1.0)
   * final_priority = base_priority - risk_penalty - duplicate_penalty
   */
  calculatePriorityScore(params: {
    impact: number; // 1 to 5
    confidence: number; // 0 to 1
    urgency: number; // 1 to 5
    strategicAlignment?: number; // 1 to 5, default 3
    effort: number; // 1 to 5
    riskPenalty?: number; // 0 to 2
    isDuplicate?: boolean;
  }): number {
    const {
      impact,
      confidence,
      urgency,
      strategicAlignment = 3,
      effort,
      riskPenalty = 0,
      isDuplicate = false,
    } = params;

    const safeEffort = Math.max(effort, 1.0);
    const basePriority =
      (impact * confidence * urgency * strategicAlignment) / safeEffort;
    const duplicatePenalty = isDuplicate ? 5.0 : 0.0;
    const finalScore = basePriority - riskPenalty - duplicatePenalty;

    return Number(Math.max(0, finalScore).toFixed(2));
  }

  /**
   * Evaluates and creates an evidence-backed candidate goal.
   */
  discoverGoal(params: {
    workerId: WorkerId;
    sourceSignalId: string;
    objective: string;
    rationale: string;
    targetKpi?: string;
    evidenceRefs: string[];
    confidence: number;
    impact: number;
    urgency: number;
    effort: number;
    strategicAlignment?: number;
    riskPenalty?: number;
    suggestedTier?: CandidateGoal['suggestedTier'];
  }): { success: boolean; goal?: CandidateGoal; error?: string } {
    const {
      workerId,
      sourceSignalId,
      objective,
      rationale,
      targetKpi,
      evidenceRefs,
      confidence,
      impact,
      urgency,
      effort,
      strategicAlignment = 3,
      riskPenalty = 0,
      suggestedTier = 'T1',
    } = params;

    if (!objective || !rationale) {
      return {
        success: false,
        error: 'Goal objective and rationale are required.',
      };
    }

    if (!evidenceRefs || evidenceRefs.length === 0) {
      return {
        success: false,
        error:
          'Every autonomous goal must be backed by at least one evidence reference.',
      };
    }

    // Cooldown & duplicate fingerprint check (48-hour cooldown window)
    const fingerprint = this.computeGoalFingerprint(
      workerId,
      objective,
      targetKpi
    );
    const existing = this.activeFingerprints.get(fingerprint);
    const nowMs = Date.now();
    const cooldownMs = 48 * 60 * 60 * 1000;
    const isDuplicate = Boolean(
      existing && nowMs - existing.createdAt < cooldownMs
    );

    const priorityScore = this.calculatePriorityScore({
      impact,
      confidence,
      urgency,
      strategicAlignment,
      effort,
      riskPenalty,
      isDuplicate,
    });

    const nowIso = new Date().toISOString();
    const expiryIso = new Date(Date.now() + 7 * 86400000).toISOString(); // 7-day expiry

    let status: GoalStatus = 'SCORED';
    if (confidence >= 0.6 && priorityScore >= 3.0 && !isDuplicate) {
      status = 'ACCEPTED_FOR_PLANNING';
    } else if (isDuplicate) {
      status = 'DEFERRED';
    }

    const goal: CandidateGoal = {
      goalId: randomUUID(),
      workerId,
      sourceSignalId,
      objective,
      rationale,
      targetKpi,
      evidenceRefs,
      confidence,
      impact,
      urgency,
      effort,
      strategicAlignment,
      riskPenalty,
      cooldownFingerprint: fingerprint,
      suggestedTier,
      priorityScore,
      status,
      createdAt: nowIso,
      expiresAt: expiryIso,
    };

    // Track fingerprint
    this.activeFingerprints.set(fingerprint, { createdAt: nowMs, status });

    return { success: true, goal };
  }

  /**
   * Discovers candidate goals from an incoming normalized signal.
   */
  discoverGoalsFromSignal(signal: WorkforceSignal): CandidateGoal[] {
    const goals: CandidateGoal[] = [];

    for (const workerId of signal.workerCandidates) {
      const objective = `Analyze and respond to ${signal.eventType.replace(/_/g, ' ')}`;
      const rationale = `Triggered by ${signal.sourceType} signal '${signal.sourceId}' (${signal.eventType}).`;
      const evidenceRefs =
        signal.resourceRefs.length > 0
          ? signal.resourceRefs
          : [`signal:${signal.signalId}`];

      const res = this.discoverGoal({
        workerId,
        sourceSignalId: signal.signalId,
        objective,
        rationale,
        evidenceRefs,
        confidence: 0.85,
        impact: 4,
        urgency:
          signal.eventType.includes('spike') ||
          signal.eventType.includes('surge')
            ? 5
            : 3,
        effort: 2,
        strategicAlignment: 4,
        suggestedTier: 'T1',
      });

      if (res.success && res.goal && res.goal.status !== 'DEFERRED') {
        goals.push(res.goal);
      }
    }

    return goals.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Resets fingerprint tracking (used in testing).
   */
  reset(): void {
    this.activeFingerprints.clear();
  }
}

export const goalDiscoveryEngine = new GoalDiscoveryEngine();
export const workforceGoalDiscovery = goalDiscoveryEngine;
