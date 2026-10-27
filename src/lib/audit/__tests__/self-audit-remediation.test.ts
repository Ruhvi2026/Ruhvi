jest.mock('server-only', () => ({}));

import {
  generateRemediationProposal,
  bridgeRemediationToActionCenter,
  type RemediationProposal,
} from '../self-audit-remediation';
import type { SelfAuditFinding } from '../self-audit-store';

describe('Self-Audit Remediation Proposals (Track J - Phase 51)', () => {
  const mockSupabaseFinding: SelfAuditFinding = {
    id: 'saf_mock_supabase_001',
    fingerprint: 'fp_supabase_conn_001',
    checkId: 'chk_int_supabase_connection',
    category: 'integration',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    title: 'Audit Diagnostic: chk_int_supabase_connection',
    message:
      'Supabase environment credentials missing (URL or Service Key missing).',
    evidenceSource: 'Self-Audit Runner (scheduled_cron)',
    remediationHint:
      'Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    sanitizedObservedValue: { hasUrl: false, hasKey: false },
    occurrenceCount: 2,
    reopenCount: 0,
    firstSeenAt: '2026-10-27T03:00:00.000Z',
    lastSeenAt: '2026-10-27T03:30:00.000Z',
    history: [],
  };

  const mockSecretLeakFinding: SelfAuditFinding = {
    id: 'saf_mock_secret_002',
    fingerprint: 'fp_secret_leak_002',
    checkId: 'chk_cfg_public_secret_hygiene',
    category: 'configuration',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    title: 'Audit Diagnostic: chk_cfg_public_secret_hygiene',
    message:
      'Sensitive secret keys improperly exposed with NEXT_PUBLIC_ prefix: NEXT_PUBLIC_SERVICE_ROLE_KEY',
    evidenceSource: 'Self-Audit Runner (manual_admin)',
    remediationHint:
      'Immediately rotate leaked keys and remove NEXT_PUBLIC_ prefix.',
    sanitizedObservedValue: { leakedKeys: ['NEXT_PUBLIC_SERVICE_ROLE_KEY'] },
    occurrenceCount: 1,
    reopenCount: 0,
    firstSeenAt: '2026-10-27T03:00:00.000Z',
    lastSeenAt: '2026-10-27T03:00:00.000Z',
    history: [],
  };

  const mockVagueFinding: SelfAuditFinding = {
    id: 'saf_mock_vague_003',
    fingerprint: 'fp_vague_003',
    checkId: 'chk_custom_unsupported',
    category: 'architecture',
    severity: 'MEDIUM',
    status: 'ACTIVE',
    title: 'Audit Diagnostic: chk_custom_unsupported',
    message: 'Timeout',
    evidenceSource: 'Self-Audit Runner (scheduled_cron)',
    occurrenceCount: 1,
    reopenCount: 0,
    firstSeenAt: '2026-10-27T03:00:00.000Z',
    lastSeenAt: '2026-10-27T03:00:00.000Z',
    history: [],
  };

  describe('Remediation Proposal Generation & Safety Guarantees', () => {
    it('generates a structured, approval-gated remediation proposal for critical database issues', () => {
      const proposal: RemediationProposal =
        generateRemediationProposal(mockSupabaseFinding);

      expect(proposal.proposalId).toBe('rem_prop_fp_supabase_conn_001');
      expect(proposal.findingId).toBe('saf_mock_supabase_001');
      expect(proposal.checkId).toBe('chk_int_supabase_connection');

      // Review-only invariant: execution strictly blocked during generation
      expect(proposal.isExecutionBlocked).toBe(true);
      expect(proposal.insufficientEvidence).toBe(false);

      // Scoping & Governance
      expect(proposal.impactAndRisk.riskLevel).toBe('HIGH');
      expect(proposal.requiredApproverRole).toBe('super_admin');
      expect(proposal.affectedModules.some((m) => m.includes('supabase'))).toBe(
        true
      );

      // Verification & Rollback
      expect(proposal.testPlan.length).toBeGreaterThan(0);
      expect(proposal.rollbackPlan.length).toBeGreaterThan(0);
      expect(proposal.remediationSteps.length).toBeGreaterThan(0);
      expect(
        proposal.remediationSteps.every((s) => s.isAutomated === false)
      ).toBe(true);
      expect(proposal.costImpact.estimatedAmount).toBe(0);
    });

    it('generates security remediation plan for client-side secret exposure', () => {
      const proposal = generateRemediationProposal(mockSecretLeakFinding);

      expect(proposal.checkId).toBe('chk_cfg_public_secret_hygiene');
      expect(proposal.impactAndRisk.riskLevel).toBe('HIGH');
      expect(proposal.requiredApproverRole).toBe('super_admin');
      expect(
        proposal.remediationSteps.some((s) => s.action.includes('Rotate'))
      ).toBe(true);
      expect(proposal.isExecutionBlocked).toBe(true);
    });

    it('concludes insufficient evidence when finding telemetry is vague or missing', () => {
      const proposal = generateRemediationProposal(mockVagueFinding);

      expect(proposal.insufficientEvidence).toBe(true);
      expect(proposal.insufficientEvidenceReason).toBeDefined();
      expect(proposal.insufficientEvidenceReason).toContain(
        'lacks specific error codes'
      );
      expect(
        proposal.remediationSteps.some((s) =>
          s.action.includes('Inspect Runtime Logs')
        )
      ).toBe(true);
      expect(proposal.isExecutionBlocked).toBe(true);
    });
  });

  describe('Action Center Bridge Integration', () => {
    it('bridges a remediation proposal into the Action Center as a formal ProposedCoFounderAction', () => {
      const proposal = generateRemediationProposal(mockSupabaseFinding);
      const actionCenterAction = bridgeRemediationToActionCenter(proposal);

      expect(actionCenterAction.id).toBeDefined();
      expect(actionCenterAction.title).toBe(proposal.title);
      expect(actionCenterAction.state).toBe('proposed');
      expect(actionCenterAction.payload.actionType).toBe(
        'self_audit_remediation_signoff'
      );
      expect(actionCenterAction.payload.targetEntity).toEqual({
        type: 'audit_finding',
        id: mockSupabaseFinding.id,
      });

      // Verification that no automatic execution occurred
      expect(actionCenterAction.payload.parameters.isExecutionBlocked).toBe(
        true
      );
      expect(actionCenterAction.approvals).toEqual([]);
    });
  });
});
