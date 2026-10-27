import 'server-only';

import {
  createActionProposal,
  type ProposedCoFounderAction,
  type ActionImpactTier,
} from '@/lib/intelligence/approval-policy';
import type { SelfAuditFinding } from './self-audit-store';
import type { AuditCheckCategory } from './self-audit-registry';

/**
 * ============================================================================
 * SELF-AUDIT REMEDIATION PROPOSALS (TRACK J - PHASE 51)
 * ============================================================================
 * Generates structured, approval-gated remediation proposals from self-audit
 * findings without executing any code edits, deployments, key rotations, or
 * production writes during generation.
 *
 * Immutable Safety Invariants:
 * 1. Zero Automatic Execution: Proposals are review-only advisories.
 *    `isExecutionBlocked === true` is strictly enforced.
 * 2. Full Evidence Citation: Every proposal explicitly cites the finding,
 *    observed timestamps, and evidence sources.
 * 3. Transparent Risk & Approver Scoping: Identifies affected files, risk level,
 *    test plan, rollback plan, and required approver role (super_admin/admin).
 * 4. Insufficient Evidence Detection: Concludes `insufficientEvidence: true`
 *    when findings lack detailed telemetry rather than guessing.
 */

export type RemediationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RequiredApproverRole = 'super_admin' | 'admin' | 'manager';

export interface RemediationStep {
  order: number;
  action: string;
  description: string;
  targetFileOrService: string;
  isAutomated: false; // Invariant: all steps are human-in-the-loop
}

export interface RemediationProposal {
  proposalId: string;
  findingId: string;
  fingerprint: string;
  checkId: string;
  category: AuditCheckCategory;
  title: string;
  summary: string;
  evidenceCitation: {
    source: string;
    observedAt: string;
    rawMessage: string;
    remediationHint?: string;
  };
  affectedModules: string[];
  impactAndRisk: {
    riskLevel: RemediationRiskLevel;
    businessImpact: string;
    downtimeExpected: boolean;
  };
  requiredApproverRole: RequiredApproverRole;
  testPlan: string[];
  rollbackPlan: string[];
  costImpact: {
    currency: 'INR';
    estimatedAmount: number;
    description: string;
  };
  insufficientEvidence: boolean;
  insufficientEvidenceReason?: string;
  remediationSteps: RemediationStep[];
  isExecutionBlocked: true;
  generatedAt: string;
}

/**
 * Evaluates a finding and generates a structured, approval-gated remediation proposal.
 */
export function generateRemediationProposal(
  finding: SelfAuditFinding
): RemediationProposal {
  const generatedAt = new Date().toISOString();
  const proposalId = `rem_prop_${finding.fingerprint}`;

  // 1. Check for insufficient evidence
  const isAmbiguousMessage =
    !finding.message ||
    finding.message.length < 10 ||
    finding.message.toLowerCase().includes('unknown') ||
    finding.message.toLowerCase().includes('timeout');

  if (isAmbiguousMessage && !finding.remediationHint) {
    return {
      proposalId,
      findingId: finding.id,
      fingerprint: finding.fingerprint,
      checkId: finding.checkId,
      category: finding.category,
      title: `Diagnostic Advisory for ${finding.checkId}: Insufficient Telemetry`,
      summary:
        'Audit check reported an issue but telemetry is insufficient to generate an automated remediation plan safely. Manual operator inspection of runtime logs is required.',
      evidenceCitation: {
        source: finding.evidenceSource,
        observedAt: finding.lastSeenAt,
        rawMessage: finding.message,
        remediationHint: finding.remediationHint,
      },
      affectedModules: ['System Telemetry', finding.checkId],
      impactAndRisk: {
        riskLevel: 'LOW',
        businessImpact: 'Indeterminate; requires manual diagnostic log review.',
        downtimeExpected: false,
      },
      requiredApproverRole: 'admin',
      testPlan: [
        'Inspect serverless execution logs in Vercel or Sentry for recent check timestamps.',
        'Re-run check manually via POST /api/admin/self-audit/run to capture updated diagnostics.',
      ],
      rollbackPlan: ['No changes applied; no rollback required.'],
      costImpact: {
        currency: 'INR',
        estimatedAmount: 0,
        description: 'No direct external cost.',
      },
      insufficientEvidence: true,
      insufficientEvidenceReason:
        'Finding payload lacks specific error codes or upstream HTTP response snippets.',
      remediationSteps: [
        {
          order: 1,
          action: 'Inspect Runtime Logs',
          description:
            'Access Vercel/Sentry console and locate error logs matching check timestamp.',
          targetFileOrService: 'Sentry / Runtime Logs',
          isAutomated: false,
        },
        {
          order: 2,
          action: 'Trigger Targeted Re-Evaluation',
          description:
            'Execute single check in admin console to verify if transient or persistent.',
          targetFileOrService: '/admin/self-audit',
          isAutomated: false,
        },
      ],
      isExecutionBlocked: true,
      generatedAt,
    };
  }

  // 2. Specialized remediation templates based on checkId and category
  let affectedModules: string[] = [];
  let riskLevel: RemediationRiskLevel = 'MEDIUM';
  let businessImpact = 'Potential service degradation if unresolved.';
  let requiredApproverRole: RequiredApproverRole = 'admin';
  let downtimeExpected = false;
  let testPlan: string[] = [];
  let rollbackPlan: string[] = [];
  const costImpactDescription = 'No external API costs incurred.';
  let remediationSteps: RemediationStep[] = [];

  switch (finding.checkId) {
    case 'chk_int_supabase_connection':
      affectedModules = [
        'src/lib/supabase/*',
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
      ];
      riskLevel = 'HIGH';
      businessImpact =
        'Customer orders, catalog queries, and customer authentication cannot proceed without database gateway connectivity.';
      requiredApproverRole = 'super_admin';
      downtimeExpected = false;
      testPlan = [
        'Test connection via executeCheck("chk_int_supabase_connection").',
        'Verify customer storefront catalog renders without database errors.',
      ];
      rollbackPlan = [
        'Revert SUPABASE_SERVICE_ROLE_KEY to previous secret version from password manager.',
        'Restart serverless deployment cache.',
      ];
      remediationSteps = [
        {
          order: 1,
          action: 'Verify Supabase Project Status',
          description:
            'Confirm Supabase PostgreSQL project is in ACTIVE state in Supabase dashboard.',
          targetFileOrService: 'Supabase Console (supabase.com)',
          isAutomated: false,
        },
        {
          order: 2,
          action: 'Audit Environment Credentials',
          description:
            'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correctly populated in production environment variables.',
          targetFileOrService: '.env.production / Vercel Environment',
          isAutomated: false,
        },
      ];
      break;

    case 'chk_cfg_public_secret_hygiene':
      affectedModules = [
        '.env.production',
        'src/lib/env.ts',
        'NEXT_PUBLIC_* Scope',
      ];
      riskLevel = 'HIGH';
      businessImpact =
        'Severe security risk: private service keys exposed in client browser bundles.';
      requiredApproverRole = 'super_admin';
      downtimeExpected = false;
      testPlan = [
        'Inspect built client JS assets to confirm no private tokens remain.',
        'Execute chk_cfg_public_secret_hygiene check.',
      ];
      rollbackPlan = [
        'Rotate exposed credentials immediately in vendor consoles.',
        'Redeploy without NEXT_PUBLIC_ prefix on sensitive keys.',
      ];
      remediationSteps = [
        {
          order: 1,
          action: 'Identify Leaked Variable Names',
          description:
            'Locate all variables with NEXT_PUBLIC_ prefix containing "secret", "private_key", or "service_role".',
          targetFileOrService: 'Vercel Environment Settings',
          isAutomated: false,
        },
        {
          order: 2,
          action: 'Remove Client Prefix & Rotate',
          description:
            'Rename variables to remove NEXT_PUBLIC_ prefix so they are accessible only in server-side nodejs runtime, then rotate key values.',
          targetFileOrService: 'Vendor Developer Portals',
          isAutomated: false,
        },
      ];
      break;

    case 'chk_int_payment_gateway_config':
      affectedModules = [
        'src/lib/payments/*',
        'PHONEPE_SALT_KEY',
        'PAYTM_MERCHANT_KEY',
      ];
      riskLevel = 'HIGH';
      businessImpact =
        'Customers unable to complete online checkout payments via PhonePe or Paytm.';
      requiredApproverRole = 'super_admin';
      testPlan = [
        'Submit a ₹1 test order in PhonePe sandbox mode.',
        'Verify payment status webhook HMAC signature validates successfully.',
      ];
      rollbackPlan = [
        'Revert payment gateway merchant keys to previous verified configuration.',
      ];
      remediationSteps = [
        {
          order: 1,
          action: 'Verify Merchant Credentials',
          description:
            'Cross-check PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, and SALT_INDEX with PhonePe PG dashboard.',
          targetFileOrService: 'PhonePe Merchant Portal',
          isAutomated: false,
        },
        {
          order: 2,
          action: 'Update Secure Environment',
          description:
            'Input verified production salt keys into encrypted production environment variables.',
          targetFileOrService: 'Vercel Environment Variables',
          isAutomated: false,
        },
      ];
      break;

    case 'chk_int_transactional_email_provider':
      affectedModules = [
        'src/lib/resend.ts',
        'src/lib/brevo.ts',
        'RESEND_API_KEY',
      ];
      riskLevel = 'MEDIUM';
      businessImpact =
        'Customer order receipts and password reset emails delayed or failing.';
      requiredApproverRole = 'admin';
      testPlan = [
        'Send test transactional receipt email via internal test route.',
        'Verify deliverability in Resend dashboard.',
      ];
      rollbackPlan = [
        'Switch primary email transport to fallback provider (Brevo).',
      ];
      remediationSteps = [
        {
          order: 1,
          action: 'Verify API Key & Domain Verification',
          description:
            'Confirm ruhvi.in domain DNS DKIM/SPF records are verified in Resend console.',
          targetFileOrService: 'Resend Console / Cloudflare DNS',
          isAutomated: false,
        },
      ];
      break;

    case 'chk_perf_api_latency_budget':
      affectedModules = [
        'Edge Cache',
        'Database Indexes',
        'Serverless Concurrency',
      ];
      riskLevel = 'LOW';
      businessImpact =
        'Sluggish administrative and operational dashboard response times.';
      requiredApproverRole = 'manager';
      testPlan = [
        'Re-evaluate latency with 10 synthetic requests to confirm median < 200ms.',
      ];
      rollbackPlan = ['Purge edge cache and restart serverless instance.'];
      remediationSteps = [
        {
          order: 1,
          action: 'Inspect Slow Query Logs',
          description:
            'Check Supabase PostgreSQL pg_stat_statements for unindexed table scans.',
          targetFileOrService: 'Supabase Database Reports',
          isAutomated: false,
        },
      ];
      break;

    default:
      affectedModules = [finding.evidenceSource, finding.checkId];
      riskLevel =
        finding.severity === 'CRITICAL'
          ? 'HIGH'
          : finding.severity === 'HIGH'
            ? 'MEDIUM'
            : 'LOW';
      businessImpact = `Operational diagnostic alert for ${finding.checkId}.`;
      requiredApproverRole =
        finding.severity === 'CRITICAL' ? 'super_admin' : 'admin';
      testPlan = [
        `Execute targeted re-check of ${finding.checkId} to confirm resolution.`,
      ];
      rollbackPlan = [
        'Revert any manual configuration updates applied during remediation.',
      ];
      remediationSteps = [
        {
          order: 1,
          action: 'Apply Remediation Guidance',
          description:
            finding.remediationHint ||
            'Review finding message and inspect configuration.',
          targetFileOrService: finding.evidenceSource,
          isAutomated: false,
        },
      ];
  }

  return {
    proposalId,
    findingId: finding.id,
    fingerprint: finding.fingerprint,
    checkId: finding.checkId,
    category: finding.category,
    title: `Remediation Plan: ${finding.title}`,
    summary: `Structured remediation procedure to resolve ${finding.severity.toLowerCase()} finding '${finding.checkId}' with zero downtime and rollback safety.`,
    evidenceCitation: {
      source: finding.evidenceSource,
      observedAt: finding.lastSeenAt,
      rawMessage: finding.message,
      remediationHint: finding.remediationHint,
    },
    affectedModules,
    impactAndRisk: {
      riskLevel,
      businessImpact,
      downtimeExpected,
    },
    requiredApproverRole,
    testPlan,
    rollbackPlan,
    costImpact: {
      currency: 'INR',
      estimatedAmount: 0,
      description: costImpactDescription,
    },
    insufficientEvidence: false,
    remediationSteps,
    isExecutionBlocked: true,
    generatedAt,
  };
}

/**
 * Bridges a self-audit remediation proposal into the Action Center as a
 * formal, human-in-the-loop ProposedCoFounderAction in 'proposed' state.
 */
export function bridgeRemediationToActionCenter(
  proposal: RemediationProposal
): ProposedCoFounderAction {
  const impactTier: ActionImpactTier =
    proposal.impactAndRisk.riskLevel === 'HIGH'
      ? 'security_configuration'
      : 'low_risk_triage';

  const categoryMapping: Record<AuditCheckCategory, any> = {
    architecture: 'infrastructure',
    integration: 'infrastructure',
    configuration: 'security',
    security: 'security',
    performance: 'quality',
    ai_health: 'operations',
  };

  return createActionProposal({
    recommendationId: `rec_${proposal.proposalId}`,
    title: proposal.title,
    category: categoryMapping[proposal.category] || 'security',
    impactTier,
    actionType: 'self_audit_remediation_signoff',
    targetEntity: {
      type: 'audit_finding',
      id: proposal.findingId,
    },
    parameters: {
      proposalId: proposal.proposalId,
      findingId: proposal.findingId,
      checkId: proposal.checkId,
      requiredApproverRole: proposal.requiredApproverRole,
      riskLevel: proposal.impactAndRisk.riskLevel,
      affectedModules: proposal.affectedModules,
      testPlan: proposal.testPlan,
      rollbackPlan: proposal.rollbackPlan,
      remediationStepsCount: proposal.remediationSteps.length,
      isExecutionBlocked: true,
    },
    expiresInHours: 72,
  });
}
