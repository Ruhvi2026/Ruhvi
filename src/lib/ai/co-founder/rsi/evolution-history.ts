/**
 * Ruhvi AI Co-Founder — Evolution History & Post-Upgrade Verification
 * Phase 10: Maintains an immutable audit history of upgrades and verifies
 * manually deployed improvements against stored baselines.
 */

import { getCofounderDataClient } from '../data-client';
import { assertRsiOperationAllowed } from './governance';

export interface EvolutionEvent {
  proposalId: string;
  baselineCommit: string;
  implementedCommit: string;
  ownerDecision: string;
  preUpgradeScore: number;
  postUpgradeScore: number;
  verificationVerdict: 'verified' | 'regression_detected' | 'inconclusive';
  summary: string;
}

export class RsiEvolutionHistory {
  private client = getCofounderDataClient();

  /**
   * Compares post-deployment test scores against baseline
   */
  evaluateUpgradeOutcome(
    preScore: number,
    postScore: number
  ): {
    verdict: 'verified' | 'regression_detected' | 'inconclusive';
    delta: number;
    notes: string;
  } {
    const delta = Math.round((postScore - preScore) * 100) / 100;

    if (delta > 0.05 && postScore >= 0.9) {
      return {
        verdict: 'verified',
        delta,
        notes: `Improvement verified: score increased by ${Math.round(delta * 100)}% to ${Math.round(postScore * 100)}%`,
      };
    }

    if (delta < -0.02) {
      return {
        verdict: 'regression_detected',
        delta,
        notes: `Regression detected: score dropped by ${Math.round(Math.abs(delta) * 100)}%. Manual rollback or fix advised.`,
      };
    }

    return {
      verdict: 'inconclusive',
      delta,
      notes:
        'No significant performance delta observed between baseline and candidate version.',
    };
  }

  /**
   * Retrieves evolution history timeline from Cloudflare D1
   */
  async getHistoryTimeline() {
    assertRsiOperationAllowed('history_read');
    const res = await this.client.getEvolutionHistory();
    return res.success ? res.data : [];
  }
}
