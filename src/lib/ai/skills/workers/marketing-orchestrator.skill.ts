// src/lib/ai/skills/workers/marketing-orchestrator.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const marketingOrchestratorSkill: RuntimeSkill = {
  id: 'worker_marketing',
  name: 'Brand Marketing & Campaign Strategy',
  version: '1.0.0',
  owner: 'marketing-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_marketing'],
  description:
    'Designs luxury jewelry campaigns, drafts promotional strategies, plans festive offers, and articulates high-converting brand copy.',
  explicitNonCapabilities: [
    'Cannot publish ad campaigns or spend live ad budget without founder approval.',
    'Cannot send mass marketing emails/push without prior approval and audience confirmation.',
    'Cannot report simulated marketing results as live confirmed conversions.',
  ],
  allowedTools: [
    'get_store_metrics',
    'get_coupons',
    'browse_website',
    'get_competitors',
    'get_ad_metrics',
    'draft_campaign_brief',
    'analyze_audience_segments',
    'create_task_draft',
  ],
  requiredDataSources: [
    'authoritative_db:coupons',
    'marketing_campaigns',
    'competitor_intel',
  ],
  requiredInputs: ['campaign_theme', 'target_audience', 'timeframe'],
  outputSchema: {
    campaignName: 'string',
    targetAudience: 'string',
    offers: 'string[]',
    creativeConcept: 'string',
    adSpendProposal: '{ budget: number; channels: string[] }',
  },
  evidenceRequirements: [
    'Proposed coupon discounts must specify margin impact before submission.',
  ],
  safetyRules: [
    'All external ad spend or live promotions require human founder sign-off.',
    'Never trigger live webhooks with default secrets.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'medium',
    riskCategory: 'external_side_effect',
    mutationVerbs: ['publish', 'launch', 'spend', 'trigger_campaign'],
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2500,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `MARKETING ORCHESTRATION INSTRUCTIONS:
1. Maintain Ruhvi’s luxury heritage voice (heritage Bengali craftsmanship meets contemporary demi-fine elegance).
2. Calculate gross margin implications for all proposed discounts.
3. Prepare complete drafts for founder approval before initiating any external campaign actions.`,
};
