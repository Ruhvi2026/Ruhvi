/**
 * Ruhvi AI Co-Founder — RSI Upgrade Proposal Engine
 * Phase 9: Generates structured, evidence-backed upgrade proposals
 * and manages owner decision lifecycles without ever touching production code.
 */

import { getCofounderDataClient } from '../data-client';
import { UpgradeProposal } from './types';
import { assertRsiOperationAllowed } from './governance';

export class RsiProposalEngine {
  private client = getCofounderDataClient();

  /**
   * 1. Creates a structured 18-point upgrade proposal
   */
  async createProposal(proposal: UpgradeProposal): Promise<{
    success: boolean;
    proposalId?: string;
    error?: string;
  }> {
    assertRsiOperationAllowed('proposal_write');

    // Validation: Ensure mandatory sections are not empty
    if (!proposal.title || !proposal.problem || !proposal.proposed_change) {
      return {
        success: false,
        error: 'Title, problem description, and proposed change are mandatory',
      };
    }
    if (!proposal.test_plan || !proposal.rollback_plan) {
      return {
        success: false,
        error:
          'Test plan and rollback plan are mandatory for any upgrade proposal',
      };
    }

    const res = await this.client.createUpgradeProposal({
      title: proposal.title,
      problem: proposal.problem,
      design: JSON.stringify({
        current_implementation: proposal.current_implementation,
        proposed_change: proposal.proposed_change,
        alternatives_considered: proposal.alternatives_considered,
        files_affected: proposal.files_affected,
      }),
      benefit: proposal.benefit,
      risk: JSON.stringify({
        risk: proposal.risk,
        regression_mitigations: proposal.regression_mitigations,
      }),
      cost_estimate: JSON.stringify(proposal.cost_estimate),
      test_plan: proposal.test_plan,
      rollback_plan: proposal.rollback_plan,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, proposalId: res.data?.id };
  }

  /**
   * 2. Records owner's explicit decision:
   * 'accepted_for_manual_work' | 'rejected' | 'deferred'
   * Note: 'accepted_for_manual_work' gives ZERO permission for the AI to alter code autonomously.
   */
  async recordDecision(
    proposalId: string,
    decision: 'accepted_for_manual_work' | 'rejected' | 'deferred',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.client.recordProposalDecision(proposalId, {
      decision,
      reason,
    });

    return { success: res.success, error: res.error };
  }

  /**
   * 3. Formats an upgrade proposal as a clean, human-readable Markdown artifact
   */
  renderProposalMarkdown(proposal: UpgradeProposal): string {
    return `# Upgrade Proposal: ${proposal.title}
**Status:** ${proposal.status} | **Date:** ${proposal.created_at || new Date().toISOString()}

## 1. Problem Statement & Capability Gap
${proposal.problem}

## 2. Current Implementation
${proposal.current_implementation}

## 3. Proposed Enhancement
${proposal.proposed_change}

## 4. Alternatives Considered
${proposal.alternatives_considered.map((a) => `- ${a}`).join('\n')}

## 5. Expected Benefit
${proposal.benefit}

## 6. Cost & Resource Estimate
- **Manual Implementation Effort:** ~${proposal.cost_estimate.implementation_effort_days} day(s)
- **Monthly Infrastructure:** \$${proposal.cost_estimate.ongoing_monthly_usd}
- **API & Model Costs:** ${proposal.cost_estimate.variable_api_costs}

## 7. Risks & Regression Safeguards
- **Risks:** ${proposal.risk}
- **Mitigation:** ${proposal.regression_mitigations}

## 8. Verification & Test Plan
${proposal.test_plan}

## 9. Rollback & Disable Plan
${proposal.rollback_plan}

## 10. Affected Files (Manual Change Map)
${proposal.files_affected.map((f) => `- \`${f}\``).join('\n')}
`;
  }
}
